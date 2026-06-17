# Design: db-customer

## Context

Koma のヘキサゴナルアーキテクチャでは、ドメインが port（interface）を定義し adapter が実装する。`packages/crm` は `CustomerRepository` port を定義済みだが、実装は in-memory のみ。永続化 adapter 層 `packages/db` は未作成。

本 change は `packages/db`（`@koma/db`）を新設し、Drizzle ORM（PostgreSQL dialect）で `CustomerRepository` を実装する最初のスライス。テストは pglite（埋め込み Postgres・in-process）で行い、外部 DB 不要で契約テストを固定する。

### 既存の構造的制約

- `model.md` B-2: `drizzle-orm` を import してよいのは `packages/db` のみ。ドメインは port 越し。
- `model.md` §3 footnote ⁴: `db → domain` は port interface / 型のみ参照可。
- ADR-003 D5: `CustomerRepository` port は upsert セマンティクス・非同期シグネチャで確立済み。
- ADR-003 D2/D3: Customer は readonly 型 + ファクトリ関数 + `Object.freeze`。ContactInfo は `createContactInfo` で「≥1 連絡先」を構築時に検証。

### request-review で指摘された事項

- **MEDIUM #1**: `db` が `createCustomer` / `createContactInfo` を import するパターンは model.md footnote ⁴「port interface / 型のみ参照可」と字義上矛盾する。model.md の更新が必要。
- **LOW #2**: `@electric-sql/pglite` はテスト専用のため `devDependencies` が妥当。
- **LOW #3**: `tsconfig.json` 等の設定ファイル作成を tasks に明示する。

## Goals / Non-Goals

**Goals**:

- `packages/db` パッケージを新設し、Drizzle（PostgreSQL dialect）で `CustomerRepository` port を実装する
- ドメイン `Customer` ↔ DB 行のマッピング層を確立する（行 → Customer の再構成は crm の集約ファクトリ経由）
- pglite による契約テストで in-memory 実装と同等の振る舞いを固定する
- 後続の Repository 実装（Resource / Service / Booking）が踏襲するパターンを先例として敷く
- model.md footnote ⁴ を更新し、集約ファクトリ（anti-corruption 用）の import を許容する

**Non-Goals**:

- 他集約の Drizzle 実装（Resource / Service / Booking）— 後続 request
- 本番マイグレーション運用（drizzle-kit）— テストは programmatic なスキーマ作成
- 接続プール・本番 DB 接続設定
- 検索 / 絞り込み / ページネーション
- マルチテナント

## Decisions

### D1: パッケージ scaffold — @koma/crm を踏襲

`packages/db/package.json`: name `@koma/db` / `private` / `type: module` / `exports: { ".": "./src/index.ts" }` / scripts `check-types`・`test`・`lint`。

**dependencies**: `drizzle-orm`（B-2 で許可された唯一の層）/ `@koma/crm`（port interface / 型 / 集約ファクトリ）/ `@koma/shared`（`Id` 等の値オブジェクト）。禁止依存（`next` / `react` / `zod`）はゼロ。

**devDependencies**: `@electric-sql/pglite`（テスト専用の埋め込み Postgres）/ `vitest` / `typescript` / `eslint` 関連。

**Rationale**: request-review LOW #2 を反映し pglite は devDependencies へ。private パッケージだが runtime / test の区別を明確にする。`build` スクリプトは持たない（内部 workspace パッケージはソース参照）。

**却下**: pglite を dependencies に置く → テスト専用ライブラリが runtime 依存に見え、意図が不明確。

### D2: Drizzle スキーマ — PostgreSQL dialect

`src/schema/customer.ts` に Drizzle のテーブル定義を配置。

```
customers テーブル:
  id          text    PK
  name        text    NOT NULL
  phone       text    nullable
  email       text    nullable
  tags        jsonb   NOT NULL  (default: [])
  notes       text    NOT NULL  (default: '')
  custom_fields jsonb NOT NULL  (default: {})
```

`drizzle-orm/pg-core` の `pgTable` / `text` / `jsonb` を使用。DB カラム名はスネークケース、TypeScript 側はキャメルケース（Drizzle のデフォルトマッピング）。

**Rationale**: `tags`（`readonly string[]`）と `customFields`（`Record<string, CustomFieldValue>`）は構造化データであり、jsonb が自然。PostgreSQL の jsonb は型安全なクエリ・インデックスが可能で、将来の検索拡張にも対応できる。`id` は UUID v4 文字列（`Id<'Customer'>` の実体）であり text PK が妥当。

**却下**: `tags` を別テーブルに正規化 → 現時点では検索要件がなく、不要な JOIN の複雑性。後続で検索要件が出た際に GIN インデックスで対応可能。

### D3: DrizzleCustomerRepository — port 実装 + マッピング

`src/drizzle-customer-repository.ts` に配置。Drizzle の DB ハンドル（現フェーズでは `PgliteDatabase` 型に固定）をコンストラクタ注入で受ける。本番 PostgreSQL 対応（汎用 DB 型への変更）は後続 request のスコープとする。ファクトリ関数パターン `createDrizzleCustomerRepository(db)` を採用。

**save**: Drizzle の `onConflictDoUpdate` で id ベースの upsert。Customer → DB 行へのマッピング（`tags` を `string[]`、`customFields` を JSON オブジェクトとして直列化）。

**findById**: `where(eq(customers.id, id))` で 1 行取得。行なしなら `null`。行ありなら行 → Customer の再構成。

**list**: 全行取得し、各行を Customer に再構成。

**行 → Customer の再構成**: `createContactInfo({ phone, email })` → `createCustomer({ id: parseId(row.id), name, contact, tags, notes, customFields })` の順で呼ぶ。集約ファクトリを経由することで、DB の不正データ（両方 null の ContactInfo 等）が集約の不変条件違反として即座に検出される（anti-corruption layer）。

**Rationale**: ADR-003 D7 が確立したファクトリ関数 + クロージャパターンを踏襲。集約ファクトリ経由の再構成により、DB ↔ ドメインの impedance mismatch を安全に吸収する。

**却下**: DB 行から `as Customer` で直接キャストする → 集約の不変条件（ContactInfo ≥1）をバイパスし anti-corruption の意味が薄れる。`Object.freeze` も適用されない。

### D4: DB ハンドル生成ヘルパ — drizzle(pglite) 接続

`src/client.ts` に DB ハンドル生成ヘルパを配置。pglite インスタンスを受け取り Drizzle DB ハンドルを返す `createDrizzleClient(pglite)` を export する。テスト・本番の両方で使えるシンプルなヘルパ。

**Rationale**: 接続プール等は本番設定の責務（スコープ外）。ここでは pglite → Drizzle DB ハンドルの変換のみを担う。

### D5: pglite による契約テスト

`src/drizzle-customer-repository.test.ts` に配置。`beforeEach` で毎テスト fresh な pglite インスタンスを作成し、Drizzle の `sql` ヘルパで CREATE TABLE を発行してスキーマをセットアップする。`afterEach` で pglite を close してテスト間の状態分離を保証する（`in-memory-customer-repository.test.ts` と同じ隔離パターン）。programmatic なスキーマ作成であり drizzle-kit 不要。

テストケース:
1. `save` → `findById` で同値取得（全フィールドの等価性）
2. 未保存 id は `null`
3. `list` が保存分を返す
4. 同一 id 再 `save` で更新（upsert）
5. 再構成された Customer が集約の不変条件を満たす（ContactInfo ≥1）

**Rationale**: pglite は埋め込み Postgres であり、jsonb 等の PostgreSQL 固有機能が本番と同じ方言で検証できる。外部 DB 不要で CI/pipeline でも安定して実行可能。

**却下**: 本番 Postgres を要するテスト → CI に外部依存。sqlite → PostgreSQL と方言差（jsonb 非サポート）。

### D6: model.md footnote ⁴ の更新

`db → domain` の依存許容範囲を「port interface / 型のみ」から「port interface / 型 / 集約ファクトリ（anti-corruption 用の再構成）」に拡張する。

**Rationale**: request-review MEDIUM #1 への対処。DB 行 → ドメイン集約の再構成には集約ファクトリが不可欠であり、これは anti-corruption の手段として hexagonal で広く認められたパターン。model.md を更新し、コードと定義の乖離を防ぐ。

**却下**: model.md を更新せず暗黙に許容 → 定義と実態の乖離。次のレビューで指摘が再発する。

### D7: ファイル配置

```
packages/db/
  package.json
  tsconfig.json
  vitest.config.ts
  eslint.config.js
  src/
    schema/
      customer.ts                        — Drizzle テーブル定義
    drizzle-customer-repository.ts       — DrizzleCustomerRepository 実装
    drizzle-customer-repository.test.ts  — pglite 契約テスト
    client.ts                            — DB ハンドル生成ヘルパ
    index.ts                             — 公開 API の re-export
```

**Rationale**: スキーマを `src/schema/` に分離し、後続テーブル追加時にディレクトリベースで整理できるようにする。テストは sibling 配置（プロジェクト規約）。

## Risks / Trade-offs

- **[Risk]** pglite と本番 PostgreSQL のバージョン差異による挙動差 → **Mitigation**: pglite は PostgreSQL エンジンを Wasm で動かすため方言差はほぼゼロ。バージョン固有の機能は使わない（jsonb + text は安定した機能）。
- **[Risk]** `createContactInfo` / `createCustomer` による再構成が DB のパフォーマンスボトルネックになる可能性 → **Mitigation**: 現時点では list に検索/ページネーションがなく、大量データは想定外。後続で必要になった際にページネーション + 遅延再構成を検討する。
- **[Trade-off]** `Object.freeze` による shallow freeze の制約は in-memory 実装と同じ。型レベルの `readonly` / `Readonly<Record<...>>` で補完する。
- **[Trade-off]** drizzle-kit を使わない programmatic スキーマ作成はテスト限定。本番マイグレーションは後続 request で drizzle-kit を導入する。

## Open Questions

なし。architect 評価済みの設計判断と request-review の指摘事項で設計方針は確定している。
