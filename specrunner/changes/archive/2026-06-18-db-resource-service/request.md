# packages/db に Drizzle の ResourceRepository / ServiceRepository を実装する（pglite テスト）

## Meta

- **type**: new-feature
- **slug**: db-resource-service
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 新しい port/adapter 追加、既存パターンと異なる設計選択、振る舞い/契約を変える修正、構造的リファクタリング → true。いずれにも該当しない → false -->

## 背景

永続化レイヤを広げる。db-customer で確立した **Drizzle + pglite アダプタパターン**（schema ＋ Repository 実装 ＋ 集約ファクトリ経由の再構成 ＋ pglite 契約テスト）を `ResourceRepository` / `ServiceRepository` に適用する。これで顧客・リソース・サービスが Drizzle で永続化できるようになる（予約は後続）。

## 現状コードの前提

- db-customer が `packages/db` に Drizzle+pglite パターンを確立済み: `src/client.ts`（DB ハンドル）/ `src/schema/customer.ts`（Drizzle schema）/ `src/drizzle-customer-repository.ts`（port 実装、行 → 集約は `createContactInfo`+`createCustomer` で再構成）/ `src/drizzle-customer-repository.test.ts`（**`beforeEach` で fresh な pglite ＋ `afterEach` で close** の隔離パターン）。
- `ResourceRepository` / `ServiceRepository` の port はいずれも `save` / `findById(): T | null` / `list(): T[]`（`packages/resource/src/port/resource-repository.ts` / `packages/catalog/src/port/service-repository.ts`）。
- `Resource` は `id` / `name` / `kind` / `capacity`（正整数）。`@koma/resource` は `createResource` を export。
- `Service` は `id` / `name` / `duration: Duration`（`{ milliseconds }`）/ `price: Money`（`{ amount, currency }`）/ `resourceKinds: readonly string[]`。`@koma/catalog` は `createService`、`@koma/shared` は `ofMilliseconds` / `createMoney` を export。
- `packages/db` に Resource / Service の schema・実装は無い。

## 要件

<!-- 最重量部: Service の duration/price/resourceKinds のマッピングと、db-customer の隔離パターン踏襲。 -->

1. **依存**。`packages/db` に `@koma/resource` / `@koma/catalog`（`workspace:*`）を追加する（port / 型 / 集約ファクトリの参照、`model.md` 注⁴で許可）。

2. **DrizzleResourceRepository**。schema `resources`（`id` text PK / `name` text / `kind` text / `capacity` integer）。`ResourceRepository` port を実装（`save` は id で upsert / `findById` / `list`）。行 → `Resource` の再構成は **`createResource` 経由**（集約の不変条件 `capacity >= 1` を通す）。

3. **DrizzleServiceRepository**。schema `services`（`id` text PK / `name` text / `duration_ms` integer / `price_amount` integer / `price_currency` text / `resource_kinds` jsonb）。`ServiceRepository` port を実装（upsert / findById / list）。行 → `Service` の再構成は **`ofMilliseconds(duration_ms)` ＋ `createMoney(price_amount, price_currency)` ＋ `createService` 経由**。

4. **pglite 契約テスト（各 repo）**。db-customer と同じく **`beforeEach` で fresh な pglite インスタンスを生成し CREATE TABLE を発行、`afterEach` で close** する隔離で、契約を固定: `save` → `findById` で同値 / 未保存 id は `null` / `list` が保存分 / 同一 id 再 `save` で更新（upsert）。

5. 両 Repository（と必要なら schema）を `src/index.ts` から export する。

## スコープ外

- `BookingRepository` の Drizzle 実装（後続 request、TimeRange / status を含むため別途）
- `Availability` の永続化（Resource 集約に未配線のため対象外）
- apps/web を Drizzle に配線する作業（後続。本 request は adapter のみ）
- 本番マイグレーション運用（テストは programmatic スキーマ作成で可）
- 検索 / 絞り込み / ページネーション

## 受け入れ基準

<!-- 機械検証できる文にする。 -->

- [ ] `packages/db/package.json` が `@koma/resource` / `@koma/catalog` に依存し、`grep -E '"(next|react|zod)"' packages/db/package.json` が 0 件
- [ ] `pnpm -F @koma/db run check-types` が成功し、`DrizzleResourceRepository` が `ResourceRepository`・`DrizzleServiceRepository` が `ServiceRepository` を満たす
- [ ] **pglite 契約テスト（各 repo、`beforeEach` 隔離）**: `save` → `findById` で同値 / 未保存 id は `null` / `list` が保存分 / 同一 id 再 `save` で更新（upsert）、をテストで固定する
- [ ] Service の再構成で `duration`（`ofMilliseconds`）・`price`（`createMoney`）・`resourceKinds` が往復（保存 → 取得）で保たれることをテストで固定する
- [ ] Resource の再構成が `capacity >= 1` の不変条件を `createResource` 経由で通すことをテストで固定する
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green

## architect 評価済みの設計判断

<!-- 採用案 + 却下案。 -->

- **db-customer の Drizzle+pglite パターンを踏襲**（schema / port 実装 / 集約ファクトリ再構成 / `beforeEach` 隔離の pglite 契約テスト）。再発明しない。
- **行 → 集約の再構成は集約/値オブジェクトのファクトリ経由**（`createResource` / `createService` / `ofMilliseconds` / `createMoney`）。却下: 行から直接オブジェクト組み立て（不変条件・通貨タグをバイパス）。
- **テスト隔離は `beforeEach`（毎テスト fresh な pglite）** とする（db-customer の escalation で確認済みの確立パターン。`beforeAll` 共有状態は upsert 件数アサーションを壊す）。
- **`duration_ms` / `price_amount` は integer、`resource_kinds` は jsonb**（構造保持）。`Money` は通貨を `price_currency` で保持。
- **adr: false** の理由: db-customer で確立済みの adapter パターンの適用であり、新パターン / 新方式の導入ではない。
