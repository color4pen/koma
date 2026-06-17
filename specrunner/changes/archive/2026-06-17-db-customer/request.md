# packages/db を新設し、Drizzle で CustomerRepository を実装する（pglite テスト）

## Meta

- **type**: new-feature
- **slug**: db-customer
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 新しい port/adapter 追加、既存パターンと異なる設計選択、振る舞い/契約を変える修正、構造的リファクタリング → true。いずれにも該当しない → false -->

## 背景

adapters/persistence 層 `packages/db` を新設し、ヘキサゴナルの payoff（**ドメインが定義した port を adapter が実装する**）を実証する。最初のスライスとして crm の `CustomerRepository` port を **Drizzle（PostgreSQL dialect）**で実装する。
`docs/アーキテクチャ/model.md`: `db` は `drizzle-orm` を import してよい**唯一の層**（B-2）。`db → domain` は **port / 型のみ**参照可（DSM △）。外部 DB を要さず検証するため、テストは **pglite（埋め込み Postgres・in-process）**で行う。

## 現状コードの前提

- crm の `CustomerRepository` port は `save(customer)` / `findById(id): Customer | null` / `list(): Customer[]`（`packages/crm/src/port/customer-repository.ts`）。
- `Customer` は `id: Id<'Customer'>` / `name` / `contact: ContactInfo`（`phone: string|null` / `email: string|null`、≥1 必須）/ `tags: readonly string[]` / `notes: string` / `customFields: Record<string, string|number|boolean>`（`packages/crm/src/customer.ts`）。
- crm は集約ファクトリ `createCustomer` と `createContactInfo` を export している（行 → ドメインの再構成に使う）。
- `packages/db` は未作成。`@koma/crm` は in-memory 実装のみで、Drizzle 実装は無い。

## 要件

<!-- 最重量部: ドメイン Customer ↔ DB 行のマッピングと、pglite による契約テストのセットアップ。 -->

1. **packages/db パッケージを新設する**。name `@koma/db`。`dependencies` に `drizzle-orm` ＋ `@electric-sql/pglite`（埋め込み Postgres）＋ `@koma/crm`（port / 型）＋ `@koma/shared`。**db は `drizzle-orm` を import してよい唯一の層**（B-2）。`next` / `react` / `zod` は入れない。scripts `check-types` / `test` / `lint`。公開 API は `src/index.ts`。

2. **Drizzle スキーマ（PostgreSQL dialect）**。`customers` テーブル: `id`(text, PK) / `name`(text) / `phone`(text, nullable) / `email`(text, nullable) / `tags`(jsonb) / `notes`(text) / `custom_fields`(jsonb)。

3. **DrizzleCustomerRepository** — crm の `CustomerRepository` port を実装する。Drizzle DB ハンドルを注入で受ける。`save`（`id` で **upsert**）/ `findById`（無ければ `null`）/ `list`。**ドメイン `Customer` ↔ DB 行のマッピング**を行い、**行 → `Customer` の再構成は crm の `createContactInfo` ＋ `createCustomer` 経由**（集約の不変条件を通す＝anti-corruption）。

4. **pglite で契約テスト**。テスト前にスキーマを作成し、in-memory 実装と同じ契約を固定する: `save` → `findById` で同値取得 / 未保存 id は `null` / `list` が保存分を返す / 同一 id を再 `save` で更新（upsert）。

5. `DrizzleCustomerRepository`（と DB ハンドル生成のヘルパ）を `src/index.ts` から export する。

## スコープ外

- 他リポジトリ（Resource / Service / Booking の Drizzle 実装）— 後続 request
- 本番マイグレーション運用（drizzle-kit。テストは programmatic なスキーマ作成で可）
- 接続プール・本番 DB 接続設定（配信 / インフラの責務）
- 検索 / 絞り込み / ページネーション
- マルチテナント

## 受け入れ基準

<!-- 機械検証できる文にする。 -->

- [ ] `packages/db/package.json` の name が `@koma/db`、`drizzle-orm` に依存（許可される層）、`grep -E '"(next|react|zod)"' packages/db/package.json` が 0 件、`@koma/crm` / `@koma/shared` に依存
- [ ] `pnpm -F @koma/db run check-types` が成功し、`DrizzleCustomerRepository` が `CustomerRepository` 型を満たす（型整合）
- [ ] **pglite を使った契約テスト**: `save` → `findById` で同値取得 / 未保存 id は `null` / `list` が保存分 / 同一 id 再 `save` で更新（upsert）、をテストで固定する
- [ ] 行 → 再構成された `Customer` が集約の不変条件を満たす（`contact` が ≥1 連絡先を保つ＝`createContactInfo` 経由）ことをテストで固定する
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green

## architect 評価済みの設計判断

<!-- 採用案 + 却下案。 -->

- **`db` が `drizzle-orm` を import する唯一の層**（B-2）。ドメイン（crm）は port を定義するだけで、db が実装する。これがヘキサゴナルの payoff。
- **行 → `Customer` の再構成は crm の集約ファクトリ（`createContactInfo` ＋ `createCustomer`）経由**。却下: DB 行から `Customer` オブジェクトを直接組み立てる（集約の不変条件をバイパスし anti-corruption の意味が薄れる）。
- **テストは pglite（埋め込み Postgres・in-process）**。外部 DB 不要で pipeline 検証可能。却下: 本番 Postgres 必須のテスト（CI / pipeline に外部依存）／ sqlite（Postgres と方言差で jsonb 等が乖離）。
- **`save` は `id` で upsert**（冪等な永続化）。却下: insert のみ（更新不可）。
- **`tags` / `customFields` は jsonb**（構造を保持）。
- **adr: true** の理由: 最初の adapter/persistence パッケージとして Drizzle + pglite の永続化パターンと「ドメイン ↔ 行」マッピング（集約ファクトリ経由の再構成）を確立する構造決定であり記録する。
