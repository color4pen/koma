# Tasks: db-booking

## T-01: `packages/db/package.json` に `@koma/scheduling` 依存を追加

- [ ] `packages/db/package.json` の `dependencies` に `"@koma/scheduling": "workspace:*"` を追加する
- [ ] `pnpm install` を実行して lockfile を更新する

**Acceptance Criteria**:
- `packages/db/package.json` の `dependencies` に `"@koma/scheduling": "workspace:*"` が存在する
- `grep -E '"(next|react|zod)"' packages/db/package.json` が 0 件（既存の純粋性を維持）

## T-02: Drizzle schema `bookings` テーブルを定義する

- [ ] `packages/db/src/schema/booking.ts` を新規作成する
- [ ] `pgTable('bookings', ...)` で以下のカラムを定義する:
  - `id`: `text('id').primaryKey()`
  - `customer_id`: `text('customer_id').notNull()`
  - `service_id`: `text('service_id').notNull()`
  - `resource_id`: `text('resource_id').notNull()`
  - `start_millis`: `bigint('start_millis', { mode: 'number' }).notNull()`
  - `end_millis`: `bigint('end_millis', { mode: 'number' }).notNull()`
  - `status`: `text('status').notNull()`
  - `custom_fields`: `jsonb('custom_fields').notNull()`
- [ ] `BookingRow` 型を export する（`typeof bookings.$inferSelect`）
- [ ] import は `drizzle-orm/pg-core` から `pgTable`, `text`, `bigint`, `jsonb` を使用する

**Acceptance Criteria**:
- `packages/db/src/schema/booking.ts` が存在し、`bookings` テーブルが定義されている
- `start_millis` / `end_millis` が `bigint` 型（`mode: 'number'`）である
- `pnpm -F @koma/db run check-types` が成功する

## T-03: `DrizzleBookingRepository` を実装する

- [ ] `packages/db/src/drizzle-booking-repository.ts` を新規作成する
- [ ] `createDrizzleBookingRepository(db: DrizzleClient): BookingRepository` ファクトリ関数を export する
- [ ] `rowToBooking` ヘルパ関数を実装する:
  - `parseId<'Booking'>(row.id)` で id を復元
  - `parseId<'Customer'>(row.customer_id)` 等で各外部キーを復元
  - `createTimeRange(row.start_millis, row.end_millis)` で `slot` を復元
  - `row.status as BookingStatus` で status をキャスト
  - `row.custom_fields as Record<string, CustomFieldValue>` で customFields を復元
  - **`restoreBooking({ id, customerId, serviceId, resourceId, slot, status, customFields })` を呼び出して `Booking` を返す**
- [ ] `save` メソッド: `insert(bookings).values(...).onConflictDoUpdate({ target: bookings.id, set: ... })` で upsert
  - `slot.start` → `start_millis`、`slot.end` → `end_millis` としてマッピング
  - `customFields` は `{ ...booking.customFields }` でスプレッドして frozen を解除
- [ ] `findById` メソッド: `select().from(bookings).where(eq(bookings.id, id))` → 先頭行を `rowToBooking` で変換、無ければ `null`
- [ ] `list` メソッド: `select().from(bookings)` → `rows.map(rowToBooking)`
- [ ] `findActiveByResource` メソッド: `select().from(bookings).where(and(eq(bookings.resource_id, resourceId), inArray(bookings.status, ['pending', 'confirmed'])))` → `rows.map(rowToBooking)`
- [ ] import 元: `drizzle-orm` から `eq`, `and`, `inArray`。`@koma/scheduling` から `BookingRepository`, `Booking`, `BookingStatus`, `CustomFieldValue`, `restoreBooking`。`@koma/shared` から `parseId`, `createTimeRange`

**Acceptance Criteria**:
- `DrizzleBookingRepository` が `BookingRepository`（`save`, `findById`, `list`, `findActiveByResource`）を満たす
- 行 → `Booking` の再構成が `restoreBooking` 経由である
- `pnpm -F @koma/db run check-types` が成功する

## T-04: `src/index.ts` に export を追加する

- [ ] `packages/db/src/index.ts` に以下を追加する:
  - `export { createDrizzleBookingRepository } from './drizzle-booking-repository.js';`
  - `export { bookings } from './schema/booking.js';`

**Acceptance Criteria**:
- `@koma/db` から `createDrizzleBookingRepository` と `bookings` schema が import 可能
- `pnpm -F @koma/db run check-types` が成功する

## T-05: pglite 契約テストを実装する

- [ ] `packages/db/src/drizzle-booking-repository.test.ts` を新規作成する
- [ ] テストファイルの先頭で pglite セットアップを定義する:
  - `CREATE_BOOKINGS_TABLE` SQL 文字列（`start_millis BIGINT NOT NULL`, `end_millis BIGINT NOT NULL` を含む）
  - `beforeEach`: `new PGlite()` → `pglite.exec(CREATE_BOOKINGS_TABLE)` → `createDrizzleClient(pglite)`
  - `afterEach`: `pglite.close()`
- [ ] テストデータ生成のヘルパまたは共通変数を用意する（`createId`, `createTimeRange`, `createBooking` / `restoreBooking` を使用）
- [ ] **テスト 1: save → findById で slot と status が往復する**
  - `createBooking` で予約を作成し `save`
  - `findById` で取得し、`slot.start` / `slot.end` / `status` が元と一致することを検証
  - 全フィールド（`customerId`, `serviceId`, `resourceId`, `customFields`）も一致を検証
- [ ] **テスト 2: 未保存 id は null**
  - 存在しない id で `findById` → `null` を検証
- [ ] **テスト 3: list が保存分を返す**
  - 複数 Booking を save し、`list()` が全件返すことを検証
- [ ] **テスト 4: 同一 id 再 save で更新（upsert）**
  - 同一 id で `status` / `slot` を変えた Booking を再 save
  - `findById` で更新後の値が返ることを検証
  - `list` の件数が 1 であることを検証
- [ ] **テスト 5: findActiveByResource が該当 resource の active のみ返す**
  - 同一 resource に `pending`・`confirmed`・`cancelled` の 3 予約を save
  - 別 resource に `pending` の予約を save
  - `findActiveByResource(targetResourceId)` が `pending` と `confirmed` の 2 件のみ返すことを検証
  - terminal 状態（`cancelled`）が含まれないことを検証
  - 別 resource の予約が含まれないことを検証
- [ ] **テスト 6: bigint 往復（大きな epoch ms 値）**
  - 2026 年の epoch ms（例: `1_800_000_000_000`）を `start_millis` に設定
  - save → findById で値が欠損なく往復することを検証

**Acceptance Criteria**:
- `pnpm -F @koma/db run test` が green
- 上記 6 テストケースがすべて pass する
- `beforeEach` / `afterEach` で pglite が隔離されている

## T-06: 全体検証

- [ ] `pnpm -F @koma/db run check-types` が成功する
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green

**Acceptance Criteria**:
- 型チェック・テストがすべて green
- 既存テスト（customer / resource / service）に regression がない
