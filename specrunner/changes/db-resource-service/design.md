# Design: DrizzleResourceRepository / DrizzleServiceRepository

## Context

`packages/db` は db-customer で Drizzle + pglite アダプタパターンを確立済み。構成要素は 4 つ: (1) Drizzle schema 定義、(2) port 実装（ファクトリ関数が `DrizzleClient` を受け取り port 型を返す）、(3) 行 → 集約再構成にドメインのファクトリ関数を使用、(4) pglite `beforeEach` 隔離の契約テスト。

現在 `ResourceRepository`（`@koma/resource`）と `ServiceRepository`（`@koma/catalog`）は in-memory 実装のみで、Drizzle 実装は存在しない。本変更でこの 2 つの port に対する Drizzle adapter を追加し、db-customer と同一のパターンに乗せる。

### 既存構造

- `client.ts` — `PGlite` を受け取り `drizzle()` でラップ。`DrizzleClient` 型を export
- `schema/customer.ts` — `pgTable` で `customers` テーブル定義 + 行型 export
- `drizzle-customer-repository.ts` — `createDrizzleCustomerRepository(db)` が `CustomerRepository` を返す
- `index.ts` — 上記をまとめて re-export

### ドメイン型の参照先

| 集約 | パッケージ | ファクトリ | 不変条件 |
|------|-----------|-----------|---------|
| `Resource` | `@koma/resource` | `createResource` | `capacity >= 1`（正整数） |
| `Service` | `@koma/catalog` | `createService` | `duration > 0`, `price >= 0` |
| `Duration` | `@koma/shared` | `ofMilliseconds` | 非負整数 |
| `Money` | `@koma/shared` | `createMoney` | 整数 amount + `Currency` タグ |

## Goals / Non-Goals

**Goals**:

- `DrizzleResourceRepository` を実装し `ResourceRepository` port を満たす
- `DrizzleServiceRepository` を実装し `ServiceRepository` port を満たす
- 行 → 集約再構成でドメインファクトリを経由し不変条件を通す
- pglite `beforeEach` 隔離の契約テストで往復保存を検証する
- `packages/db` の export に追加する

**Non-Goals**:

- `BookingRepository` の実装（後続 request）
- `Availability` の永続化
- apps/web への配線
- マイグレーション運用（テストは programmatic CREATE TABLE）
- 検索・絞り込み・ページネーション

## Decisions

### D1: schema を `src/schema/resource.ts` / `src/schema/service.ts` に分離配置する

db-customer が `src/schema/customer.ts` に分離しているパターンを踏襲する。schema ディレクトリ配下に 1 テーブル 1 ファイルで配置する。

- **Rationale**: 既存パターンと一貫性を保つ。テーブルが増えても見通しが良い。
- **Alternative（却下）**: 1 ファイルに全テーブルをまとめる — テーブル数が増えると肥大化する。

### D2: `resource_kinds` カラムを `jsonb` とする

`Service.resourceKinds` は `readonly string[]` であり、正規化（別テーブル）ではなく jsonb で保持する。

- **Rationale**: 現時点で resourceKinds は Service 集約内の値であり、外部キー制約や個別クエリの必要がない。検索・絞り込みはスコープ外。jsonb が最もシンプル。
- **Alternative（却下）**: 正規化テーブル `service_resource_kinds` — 検索要件がないのにテーブルを増やす正当性がない。

### D3: `duration_ms` / `price_amount` は `integer` カラムとする

`Duration.milliseconds` と `Money.amount` はいずれもドメイン上で整数制約がある。DB 上も integer で保持し型の不一致を防ぐ。

- **Rationale**: ドメインのファクトリが整数を要求するため、float カラムは不整合リスクを持つ。
- **Alternative（却下）**: `numeric` / `real` — 余計な精度を持ち込み、再構成時のキャストが必要になる。

### D4: `price_currency` は `text` カラムとする

現在 `Currency` 型は `'JPY'` のみだが、DB 層は enum ではなく text で保持する。

- **Rationale**: Currency の追加は DB マイグレーション不要で行える。PG enum は alter が重い。
- **Alternative（却下）**: PG enum — 型追加のたびに ALTER TYPE が必要。

### D5: 行 → 集約再構成はドメインファクトリ経由

`rowToResource` は `createResource` を、`rowToService` は `ofMilliseconds` + `createMoney` + `createService` を呼ぶ。DB から読んだデータもドメイン不変条件を必ず通る。

- **Rationale**: db-customer の確立パターン。不正データが DB に入った場合にも再構成時にエラーとして検出できる。
- **Alternative（却下）**: 行から直接オブジェクトリテラルを組み立て — 不変条件（capacity >= 1, duration > 0 等）をバイパスする。

### D6: テスト隔離は `beforeEach` で毎テスト fresh な pglite

db-customer で確立・検証済みのパターン。`beforeAll` 共有状態では upsert 件数アサーションが壊れる。

- **Rationale**: テスト間の状態汚染を完全に排除。
- **Alternative（却下）**: `beforeAll` + トランザクション rollback — upsert の件数テストが共有状態で不安定になる。

### D7: Repository ファクトリ関数の命名規則

`createDrizzleResourceRepository(db)` / `createDrizzleServiceRepository(db)` とする。`createDrizzleCustomerRepository` と同一の命名規則。

- **Rationale**: 既存パターンとの一貫性。
- **Alternative**: なし（合理的な代替がない）。

## Risks / Trade-offs

- **[Risk] pglite のテストパフォーマンス** — `beforeEach` で毎テスト DB を作り直すため、テスト数が増えるとスイート全体が遅くなる可能性がある。
  → **Mitigation**: 契約テストは最小限のケース（4-5 件/repo）に絞る。パフォーマンスが問題になった場合は将来的に並列化を検討する。

- **[Risk] `resource_kinds` の jsonb パース** — jsonb から取り出した値が `string[]` であることの保証は DB 制約ではなくアプリケーション側に依存する。
  → **Mitigation**: `createService` の `resourceKinds` 引数で型チェックが入る。テストで往復保存を検証する。

## Open Questions

なし。db-customer で確立済みのパターンの適用であり、未決定事項はない。
