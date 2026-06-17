# Design: db-booking

## Context

`packages/db` は Drizzle + pglite アダプタパターンを確立済みで、`DrizzleCustomerRepository`・`DrizzleResourceRepository`・`DrizzleServiceRepository` が稼働している。いずれも共通構造を持つ:

- `schema/<entity>.ts` に Drizzle テーブル定義
- `drizzle-<entity>-repository.ts` にファクトリ関数（`DrizzleClient` を受け取り port を返す）
- `rowTo<Entity>` ヘルパでドメイン集約を再構成（`createXxx` / `parseId` 経由）
- `save` は `insert ... onConflictDoUpdate`（id で upsert）
- pglite 契約テスト（`beforeEach` で fresh pglite、`afterEach` で close）

`Booking` はこれら既存 repository と構造が近いが、2 点が異なる:

1. **`slot`（TimeRange）の `start` / `end` が絶対 epoch ミリ秒**で、PostgreSQL の `integer`（32-bit、最大約 21 億）を超える。2026 年の epoch ms は約 1.77 兆で `2^31 - 1` を大きく超える。
2. **`findActiveByResource`** という追加クエリがあり、`resource_id` 一致かつ `status` が active（`pending` / `confirmed`）の予約だけを返す。
3. **行 → Booking の再構成に `restoreBooking` を使う**（`createBooking` は常に `status: 'pending'` にリセットするため不適）。

## Goals / Non-Goals

**Goals**:

- `BookingRepository` port（`save` / `findById` / `list` / `findActiveByResource`）を満たす Drizzle adapter を `packages/db` に追加する
- 絶対 epoch ミリ秒の `slot.start` / `slot.end` を欠損なく永続化する
- 確立済みパターン（schema + factory + pglite テスト）を踏襲し、一貫性を保つ
- `src/index.ts` から `DrizzleBookingRepository` と schema を export する

**Non-Goals**:

- apps/web への配線（後続タスク）
- 本番マイグレーション運用（テストは programmatic スキーマ作成）
- 予約の期間クエリ / ページネーション / 検索
- 楽観ロック・トランザクション境界

## Decisions

### D1: epoch ミリ秒は `bigint` カラム（`mode: 'number'`）で保持する

**Rationale**: 絶対 epoch ms は 2026 年時点で約 1.77 兆。PostgreSQL `integer` は 32-bit（最大 ~2.1 × 10^9）で格納不可。`bigint`（64-bit）であれば十分。Drizzle の `bigint('col', { mode: 'number' })` は JS `number` として扱い、`2^53` 未満の値を安全にマッピングする。epoch ms は `2^53` に対して十分小さい。

**Alternatives considered**:
- `integer`: 2^31 を超えるため格納不可。却下。
- `timestamp` / `timestamptz`: ドメインが epoch ms を直接扱うため、変換コストとセマンティクスのズレが生じる。却下。

### D2: 行 → Booking の再構成は `restoreBooking` 経由

**Rationale**: `createBooking` は `status` を常に `'pending'` に固定するため、保存済みの `confirmed` / `cancelled` 等を復元できない。`restoreBooking` は `status` を引数で受け取り、保存時の状態をそのまま再構成する。

**Alternatives considered**:
- `createBooking`: status が pending にリセットされ、データベースの状態と乖離する。却下。

### D3: `findActiveByResource` は SQL レベルで `status IN (...)` フィルタ

**Rationale**: active 状態（`pending`, `confirmed`）を SQL の `WHERE status IN ('pending', 'confirmed') AND resource_id = ?` で絞る。全件取得後に `isActive` でフィルタする方法と比べ、データ量が増えた場合の効率が良い。active の定義が変わった場合のリスクはあるが、現時点では状態の種類が少なく、SQL と `isActive` の定義を同期するコストは低い。

**Alternatives considered**:
- 全件取得 + `isActive` フィルタ: 正確だが非効率。却下。

### D4: `packages/db` に `@koma/scheduling` 依存を追加

**Rationale**: `BookingRepository` port、`Booking` 型、`restoreBooking` ファクトリはすべて `@koma/scheduling` に定義されている。adapter が port を実装するために import が必要。既存パターンでも `@koma/crm`（Customer）、`@koma/resource`（Resource）、`@koma/catalog`（Service）を同様に依存に持つ。

**Alternatives considered**: なし（必須依存）。

### D5: 既存 repository パターンを踏襲

**Rationale**: ファクトリ関数パターン（`createDrizzleBookingRepository(db)` → `BookingRepository`）、schema 分離（`schema/booking.ts`）、テスト構造（`beforeEach` fresh pglite + raw SQL テーブル作成）をそのまま適用する。コードベースの一貫性を維持する。

**Alternatives considered**: なし（確立済みパターンの適用）。

## Risks / Trade-offs

- **[Risk] active 状態の定義が `isActive` と SQL `IN` 句で二重管理になる** → SQL 側に定数リストを使い、テストで `isActive` と一致することを検証する。`findActiveByResource` のテストが terminal 状態の除外を明示的に確認するため、乖離が起きればテストが検出する。
- **[Risk] `bigint({ mode: 'number' })` の JS number 精度** → epoch ms は 2100 年でも ~4.1 × 10^12 で `Number.MAX_SAFE_INTEGER`（~9.0 × 10^15）の範囲内。実用上問題ない。

## Open Questions

なし。確立済みパターンの適用であり、未解決の設計判断はない。
