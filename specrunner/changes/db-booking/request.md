# packages/db に Drizzle の BookingRepository を実装する（pglite テスト）

## Meta

- **type**: new-feature
- **slug**: db-booking
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 新しい port/adapter 追加、既存パターンと異なる設計選択、振る舞い/契約を変える修正、構造的リファクタリング → true。いずれにも該当しない → false -->

## 背景

永続化レイヤを完成させる。db-customer / db-resource-service で確立した **Drizzle + pglite アダプタパターン**を `BookingRepository` に適用する。`Booking` は時間枠（絶対 epoch ミリ秒の `TimeRange`）・状態（`BookingStatus`）を持ち、`findActiveByResource`（active な予約のみ）という追加クエリがある点が他 repo と異なる。

## 現状コードの前提

- db-customer / db-resource-service が `packages/db` に Drizzle+pglite パターンを確立済み（`src/client.ts` / `schema/*` / `drizzle-*-repository.ts` ＋ `beforeEach` で fresh pglite ＋ `afterEach` close の契約テスト）。
- `BookingRepository` port は `save` / `findById(): Booking | null` / `list(): Booking[]` / **`findActiveByResource(resourceId): Booking[]`**（`packages/scheduling/src/port/booking-repository.ts`）。
- `Booking` は `id` / `customerId` / `serviceId` / `resourceId`（各 `Id<...>`）/ `slot: TimeRange`（`{ start, end }` ＝ 絶対 epoch ミリ秒）/ `status: BookingStatus` / `customFields`。
- `@koma/scheduling` は **`restoreBooking`**（id・status を明示して再構成）と `isActive` を export。`@koma/shared` は `createTimeRange` / `parseId` を export。active = `pending` / `confirmed`。
- `packages/db` に Booking の schema・実装は無い。

## 要件

<!-- 最重量部: 絶対 epoch ms の bigint 保持と、findActiveByResource の active フィルタ、restoreBooking 再構成。 -->

1. **依存**。`packages/db` に `@koma/scheduling`（`workspace:*`）を追加する。

2. **Drizzle schema `bookings`**。`id`(text PK) / `customer_id`(text) / `service_id`(text) / `resource_id`(text) / `start_millis`(**bigint**) / `end_millis`(**bigint**) / `status`(text) / `custom_fields`(jsonb)。**`slot` の start/end は絶対 epoch ミリ秒で integer（2^31）を超えるため bigint を使う**（Drizzle の bigint は JS number で扱える `mode: 'number'`。値は 2^53 未満で安全）。

3. **DrizzleBookingRepository**。`BookingRepository` port を実装。`save`（id で upsert）/ `findById`（無ければ null）/ `list` / **`findActiveByResource(resourceId)`**（`resource_id` 一致かつ **active 状態のみ** ＝ `isActive` 相当）。行 → `Booking` の再構成は **`restoreBooking`**（`slot` は `createTimeRange(start_millis, end_millis)`、`status` を明示）経由。

4. **pglite 契約テスト**（`beforeEach` で fresh pglite ＋ `afterEach` close の隔離）。固定する契約: `save` → `findById` で同値（slot/status 往復）/ 未保存 id は `null` / `list` / 同一 id 再 `save` で更新（upsert）/ **`findActiveByResource` が該当 resource の active のみ返す（terminal 状態や別 resource は含まない）**。

5. `DrizzleBookingRepository`（必要なら schema）を `src/index.ts` から export する。

## スコープ外

- apps/web を Drizzle に配線する作業（後続。本 request は adapter のみ）
- 本番マイグレーション運用（テストは programmatic スキーマ作成で可）
- 予約の検索 / 期間クエリ / ページネーション
- 楽観ロック・トランザクション境界（予約の同時実行排他は配信/ユースケース側で別途）

## 受け入れ基準

<!-- 機械検証できる文にする。 -->

- [ ] `packages/db/package.json` が `@koma/scheduling` に依存し、`grep -E '"(next|react|zod)"' packages/db/package.json` が 0 件
- [ ] `pnpm -F @koma/db run check-types` が成功し、`DrizzleBookingRepository` が `BookingRepository`（`findActiveByResource` を含む）を満たす
- [ ] schema の `start_millis` / `end_millis` が **bigint**（絶対 epoch ms を欠損なく保持できる）
- [ ] **pglite 契約テスト**（`beforeEach` 隔離）: `save` → `findById` で `slot`（start/end）と `status` が往復する / 未保存 null / `list` / 同一 id 再 `save` で更新、をテストで固定する
- [ ] **`findActiveByResource`**: 指定 resource の active（`pending` / `confirmed`）のみ返し、terminal（例 `cancelled`）や別 resource の予約を含まない、をテストで固定する
- [ ] 行 → `Booking` の再構成が `restoreBooking` 経由である
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green

## architect 評価済みの設計判断

<!-- 採用案 + 却下案。 -->

- **db-customer / db-resource-service の Drizzle+pglite パターンを踏襲**（`beforeEach` 隔離・集約ファクトリ再構成）。再発明しない。
- **絶対 epoch ms は bigint で保持**（`mode: 'number'`）。却下: integer（2^31 を超え 2026 年以降の日時を保持できない）。
- **行 → `Booking` は `restoreBooking` 経由**（保存済みの `status` を保つ。`createBooking` は常に `pending` 開始のため再構成に使えない）。却下: `createBooking`（status が pending に化ける）。
- **`findActiveByResource` は active フィルタ**（`isActive` ＝ `pending` / `confirmed`）。SQL で `status IN (...)` か、行取得後に `isActive` で絞る。capacity 判定の入力を正確に供給する。
- **adr: false** の理由: 確立済み adapter パターンの適用であり、新パターンの導入ではない。
