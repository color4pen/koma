# ADR-005: 永続化アダプタ層（@koma/db）の新設と Drizzle + pglite パターン、集約ファクトリ経由の anti-corruption 再構成

- **status**: accepted
- **date**: 2026-06-17
- **change**: db-customer
- **deciders**: architect, spec-runner

## Context

ADR-003 は `@koma/crm` で `CustomerRepository` port を非同期シグネチャ・upsert セマンティクスで確立し、「具象実装は `packages/db` が後続で提供する」と明記した。`model.md` B-2 は「`drizzle-orm` を import してよいのは `packages/db` のみ」と制約し、`db → domain` の依存は「port interface / 型のみ」を許容する（footnote ⁴）としていた。

本 change は `packages/db`（`@koma/db`）を monorepo 初の永続化アダプタ層として新設し、Drizzle ORM（PostgreSQL dialect）で `CustomerRepository` port を実装する最初のスライス。外部 DB 不要で契約を固定するためテストは pglite（Wasm 埋め込み PostgreSQL・in-process）で行う。

本 ADR が確立するパターン——Drizzle スキーマ定義、ファクトリ関数 + クロージャによる Repository 実装、集約ファクトリ経由の行→ドメイン再構成、pglite 契約テスト——は後続の全 Repository 実装（Resource / Service / Booking）が踏襲する先例となる。

また、DB 行→ドメイン集約の再構成に集約ファクトリ（`createContactInfo` + `createCustomer`）が不可欠であることが明らかになり、model.md footnote ⁴ を「port interface / 型 / 集約ファクトリ（anti-corruption 用の再構成）を参照可」に拡張する構造変更も含む。

## Decisions

### D1: パッケージ scaffold — @koma/crm のパターンを踏襲

`packages/db/package.json`: name `@koma/db` / `private` / `type: module` / `exports: { ".": "./src/index.ts" }` / scripts `check-types`（`tsc --noEmit`）・`test`（`vitest run`）・`lint`（`eslint .`）。`build` スクリプトは持たない（内部 workspace パッケージはソース参照）。

**dependencies**: `drizzle-orm`（B-2 で許可された唯一の層）/ `@koma/crm`（port interface / 型 / 集約ファクトリ）/ `@koma/shared`（`Id` 等の値オブジェクト）。  
**devDependencies**: `@electric-sql/pglite`（テスト専用の埋め込み PostgreSQL）/ `vitest` / `typescript` / `eslint` 関連。  
禁止依存（`next` / `react` / `zod`）はゼロ。

**採用理由**: ADR-003 D1 が確立した scaffold を継承し、後続の永続化パッケージが迷わず踏襲できるテンプレートにする。`pglite` を devDependencies に置くことで runtime / test の依存区分を明確にする。

**却下案**:
- `pglite` を dependencies に置く → テスト専用ライブラリが runtime 依存に見え、意図が不明確になる
- `drizzle-orm` をドメインパッケージに直接 import → `model.md` B-2 違反。永続化技術がドメインに漏れる

---

### D2: Drizzle スキーマ — PostgreSQL dialect / jsonb

`src/schema/customer.ts` に Drizzle のテーブル定義を配置。`drizzle-orm/pg-core` の `pgTable` / `text` / `jsonb` を使用。

```
customers テーブル:
  id            text    PK
  name          text    NOT NULL
  phone         text    nullable
  email         text    nullable
  tags          jsonb   NOT NULL  (default: [])
  notes         text    NOT NULL  (default: '')
  custom_fields jsonb   NOT NULL  (default: {})
```

DB カラム名はスネークケース、TypeScript 側はキャメルケース（Drizzle のデフォルトマッピング）。スキーマは `src/schema/` ディレクトリに分離し、後続テーブル追加時にディレクトリベースで整理できるようにする。

**採用理由**: `tags`（`readonly string[]`）と `customFields`（`Record<string, CustomFieldValue>`）は構造化データであり jsonb が自然。PostgreSQL の jsonb は型安全なクエリ・GIN インデックスが可能で、将来の検索拡張にも対応できる。`id` は UUID v4 文字列（`Id<'Customer'>` の実体）であり text PK が妥当。

**却下案**:
- `tags` を別テーブルに正規化 → 現時点では検索要件がなく、不要な JOIN の複雑性が生じる。後続で GIN インデックスで対応可能
- sqlite / text 型での JSON 保存 → PostgreSQL 固有の jsonb 機能が使えず、本番との方言差が生まれる

---

### D3: DrizzleCustomerRepository — ファクトリ関数 + クロージャ、集約ファクトリ経由の再構成

`src/drizzle-customer-repository.ts` に配置。ADR-003 D7 が確立したファクトリ関数 + クロージャパターンを踏襲し、`createDrizzleCustomerRepository(db)` を採用。Drizzle の DB ハンドルをコンストラクタ注入で受ける。

**save**: `onConflictDoUpdate` で id ベースの upsert（冪等な永続化）。Customer → DB 行へのマッピング（`tags` を `string[]`、`customFields` を JSON オブジェクトとして直列化）。

**findById**: `where(eq(customers.id, id))` で 1 行取得。行なしなら `null`。行ありなら行 → Customer の再構成。

**list**: 全行取得し、各行を Customer に再構成。

**行 → Customer の再構成**:
```
createContactInfo({ phone, email })
  → createCustomer({ id: parseId(row.id), name, contact, tags, notes, customFields })
```
集約ファクトリを経由することで、DB の不正データ（ContactInfo が両方 null 等）が集約の不変条件違反として即座に検出される（anti-corruption layer）。

**採用理由**: 集約ファクトリ経由の再構成により、DB ↔ ドメインの impedance mismatch を安全に吸収する。`createContactInfo` の「≥1 連絡先」検証が再構成時にも機能し、`Object.freeze` も適用される。後続 Repository 実装が踏襲すべき標準パターンとして確立する。

**却下案**:
- DB 行から `as Customer` で直接キャスト → 集約の不変条件（ContactInfo ≥1）をバイパスし anti-corruption の意味が薄れる。`Object.freeze` も適用されない
- class `DrizzleCustomerRepository` → ADR-003 D7 が確立したファクトリ関数パターンと不整合。クロージャで十分

---

### D4: model.md footnote ⁴ の拡張 — 集約ファクトリの import を許容

`db → domain` の依存許容範囲を「port interface / 型のみ」から「port interface / 型 / 集約ファクトリ（anti-corruption 用の再構成）」に拡張する。

**採用理由**: DB 行→ドメイン集約の再構成には集約ファクトリ（`createContactInfo` + `createCustomer`）が不可欠であり、これは hexagonal で広く認められた anti-corruption layer のパターン。model.md を更新してコードと定義の乖離を防ぐ。集約ファクトリは純粋な型・ファクトリ関数であり、インフラ依存を持たないためドメインの純粋性は保たれる。

**却下案**:
- model.md を更新せず暗黙に許容 → 定義と実態の乖離。後続レビューで指摘が再発する
- DB 行→ドメイン変換専用の mapper を `@koma/db` 内に用意し、集約ファクトリを使わない → 集約の不変条件検証が mapper の責務になり、ドメイン知識が `@koma/db` に漏れる

---

### D5: pglite による契約テスト — 方言一致・外部 DB 不要

`src/drizzle-customer-repository.test.ts` に配置。`beforeEach` で毎テスト fresh な pglite インスタンスを生成し、Drizzle の `sql` ヘルパで CREATE TABLE を発行してスキーマをセットアップする。`afterEach` で pglite を close してテスト間の状態を分離する。drizzle-kit 不要の programmatic スキーマ作成。

テストケース（契約固定）:
1. `save` → `findById` で全フィールド同値取得
2. 未保存 id で `findById` → `null`
3. `list` が保存済み全件を返す
4. 同一 id の再 `save` でデータが更新される（upsert）
5. 再構成された Customer が ContactInfo 不変条件（≥1 連絡先）を満たす（phone のみ / email のみ / 両方）

**採用理由**: pglite は PostgreSQL エンジンを Wasm で動かすため jsonb 等の PostgreSQL 固有機能が本番と同じ方言で検証できる。外部 DB 不要で CI/pipeline で安定実行可能。`in-memory-customer-repository.test.ts` と同一の隔離パターンにより、契約の等価性が担保される。

**却下案**:
- 本番 PostgreSQL を要するテスト → CI に外部依存が生まれ、pipeline の安定性が損なわれる
- sqlite → PostgreSQL と方言差（jsonb 非サポート等）があり、本番差異が検出できない
- 外部 Docker Compose → CI セットアップが複雑化し、ローカル開発の摩擦が増す

---

### D6: DB ハンドル生成ヘルパ — drizzle(pglite) 接続

`src/client.ts` に `createDrizzleClient(pglite)` を export する。pglite インスタンスを受け取り Drizzle DB ハンドルを返すシンプルなヘルパ。接続プール等は本番設定の責務（スコープ外）。現フェーズでは `PgliteDatabase` 型に固定し、汎用 Drizzle DB 型への変更は後続 request のスコープとする。

**採用理由**: テスト・本番の両方で使えるシンプルな変換ヘルパ。`src/index.ts` からの export により、利用側が Drizzle の内部 API に依存しない。

**却下案**: テストファイル内でインライン生成 → 後続 Repository が同じコードを繰り返す。ヘルパとして共通化する

---

### D7: ファイル配置

```
packages/db/
  package.json
  tsconfig.json
  vitest.config.ts
  eslint.config.js
  src/
    schema/
      customer.ts                        — Drizzle テーブル定義（後続テーブルも同ディレクトリ）
    drizzle-customer-repository.ts       — DrizzleCustomerRepository 実装
    drizzle-customer-repository.test.ts  — pglite 契約テスト
    client.ts                            — DB ハンドル生成ヘルパ
    index.ts                             — 公開 API の re-export
```

**採用理由**: スキーマを `src/schema/` に分離し、後続テーブル（resource / service / booking）追加時にディレクトリベースで整理できるようにする。テストは sibling 配置（プロジェクト規約）。公開 API は `src/index.ts` に集約し、内部構造を隠蔽する。

## Alternatives Considered

### Alternative 1: drizzle-orm をドメインパッケージ（@koma/crm）に直接 import

```typescript
// packages/crm から drizzle-orm を直接 import
import { db } from 'drizzle-orm'
```

**Pros**: アダプタ層の分離が不要。実装がシンプルになる。

**Cons**: `model.md` B-2 違反。永続化技術（ORM の型・SQL 構文）がドメインに漏れる。テスト時に DB が必要になり、ドメインの純粋性が失われる。将来の DB 変更でドメインも修正が必要になる。

**Why not**: ヘキサゴナルアーキテクチャの根本原則（domain は infra を知らない）に違反する。テスト可能性・変更容易性が著しく損なわれる。

---

### Alternative 2: 汎用 Drizzle DB 型を使い本番 PostgreSQL ドライバも初期から対応

```typescript
type DrizzleClient = ReturnType<typeof drizzle>  // 汎用 super type
```

**Pros**: `createDrizzleCustomerRepository` が pglite / node-postgres / postgres.js を問わず動作する。

**Cons**: Drizzle の型階層は方言（dialect）ごとに異なり、汎用型の抽出には注意が必要。現フェーズでは本番 PostgreSQL ドライバが存在せず、過剰な汎化となる。

**Why not**: 本番接続設定・接続プールは後続 request のスコープ。現時点では pglite 固定で十分であり、後続で汎用型に変更する際のコストも低い。

---

### Alternative 3: tags を別テーブルに正規化

```sql
CREATE TABLE customer_tags (customer_id text, tag text);
```

**Pros**: タグによる検索・集計が SQL で書ける。

**Cons**: 現時点では検索要件がなく、不要な JOIN の複雑性が生じる。`Customer` 集約の取得にも JOIN が必要になり、実装が煩雑になる。

**Why not**: jsonb + GIN インデックスで後続の検索要件に対応できる。正規化は実際の検索要件が出た際に検討する。

---

### Alternative 4: DB 行→ドメイン変換に専用 mapper を設ける（集約ファクトリを使わない）

```typescript
function rowToCustomer(row: CustomerRow): Customer {
  // 手動でフィールドを組み立て
  return Object.freeze({ id: ..., name: ..., contact: { phone: ..., email: ... }, ... })
}
```

**Pros**: `@koma/db` が集約ファクトリに依存しない。model.md footnote ⁴ の変更が不要。

**Cons**: ContactInfo の「≥1 連絡先」等の集約不変条件が mapper で再実装され、ドメイン知識が `@koma/db` に漏れる。`Object.freeze` の適用も mapper が担う必要があり、集約の整合性が分散する。DB の不正データ（両方 null の ContactInfo 等）が検出されないまま通過するリスクがある。

**Why not**: anti-corruption layer は集約の不変条件検証をドメインのファクトリに委ねることで成立する。mapper でドメイン知識を再実装すると、ドメイン変更時に mapper も更新が必要になり、二重メンテナンスが発生する。

## Consequences

### Positive

- `packages/db` が monorepo 初の永続化アダプタ層として確立される。後続の Resource / Service / Booking Repository 実装が本 ADR のパターン（Drizzle スキーマ / ファクトリ + クロージャ / pglite 契約テスト）を先例として踏襲できる
- 集約ファクトリ経由の再構成パターンにより、DB ↔ ドメインの impedance mismatch を安全に吸収する anti-corruption layer が確立される。DB の不正データが集約の不変条件違反として即座に検出される
- pglite による契約テストが「外部 DB 不要・本番と同一の PostgreSQL 方言・CI で安定実行可能」という三条件を満たし、後続 Repository テストの標準手法となる
- `drizzle-orm` を import する層を `packages/db` のみに制限する B-2 制約が、実装を通じて物理的に担保される
- model.md footnote ⁴ の更新により、集約ファクトリの anti-corruption 用途が公式に定義され、コードと定義の乖離が解消される

### Negative / Trade-offs

- 現フェーズの `DrizzleClient` 型が `PgliteDatabase` に固定されており、本番 PostgreSQL ドライバ（`node-postgres` 等）への変更は後続 request で行う必要がある
- jsonb カラム（`tags` / `custom_fields`）の Drizzle 型推論が `unknown` を返すため、`as string[]` / `as Record<string, CustomFieldValue>` のキャストが必要。Drizzle の `.$type<T>()` による型付けは pglite との相性を確認次第で後続適用を検討する
- drizzle-kit によるマイグレーション管理は本スコープ外。本番マイグレーション運用は後続 request で確立する
- `@koma/db` が `@koma/crm` の集約ファクトリに依存するため、crm の集約 API 変更時は db も更新が必要になる（ただしこれはドメイン変更が adapter に伝播する正常なヘキサゴナルの振る舞い）

## References

- `docs/アーキテクチャ/model.md` — 層・依存規律 B-1〜B-6、footnote ⁴（更新済み）
- `specrunner/adr/003-crm-domain-package-and-repository-port-pattern.md` — CustomerRepository port / upsert セマンティクス / 非同期シグネチャの確立
- `specrunner/changes/db-customer/design.md` — 詳細設計判断（D1〜D7）
- `packages/db/src/drizzle-customer-repository.ts` — DrizzleCustomerRepository 実装
- `packages/db/src/drizzle-customer-repository.test.ts` — pglite 契約テスト
- `packages/db/src/schema/customer.ts` — Drizzle テーブル定義
- `packages/crm/src/port/customer-repository.ts` — CustomerRepository port（実装対象）
- `packages/crm/src/customer.ts` — Customer 集約 + createCustomer / createContactInfo ファクトリ
