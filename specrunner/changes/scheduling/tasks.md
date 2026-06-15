# Tasks: packages/scheduling — Booking 集約・BookingStatus 状態機械・capacity-aware 二重予約整合性

## T-01: パッケージスキャフォールド

- [ ] `packages/scheduling/package.json` を作成する。`@koma/resource` の `package.json` をベースに以下を変更:
  - `name`: `@koma/scheduling`
  - `dependencies`: `@koma/shared: "workspace:*"` のみ
  - `devDependencies`: resource と同一（`@eslint/js`, `eslint`, `typescript`, `typescript-eslint`, `vitest`、同バージョン）
  - `scripts`: `check-types`, `test`, `lint`（resource と同一）
  - `private: true`, `type: "module"`, `exports: { ".": "./src/index.ts" }`
- [ ] `packages/scheduling/tsconfig.json` を作成する（resource と同一内容: `ES2022` / `bundler` / `strict` / `noEmit`）
- [ ] `packages/scheduling/vitest.config.ts` を作成する（resource と同一内容）
- [ ] `packages/scheduling/eslint.config.js` を作成する（resource と同一内容）
- [ ] `packages/scheduling/src/index.ts` を空のバレルファイルとして作成する
- [ ] `pnpm install` を実行してワークスペースリンクを確立する

**Acceptance Criteria**:
- `packages/scheduling/package.json` の `name` が `@koma/scheduling`
- `grep -E '"(next|react|drizzle-orm|zod)"' packages/scheduling/package.json` が 0 件
- `@koma/shared` に `workspace:*` で依存している
- `pnpm -F @koma/scheduling run check-types` が成功する

## T-02: BookingStatus 型と状態機械（`src/booking-status.ts`）

- [ ] `BookingStatus` 型を定義する: `'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show'`
- [ ] `ALLOWED_TRANSITIONS` を `Map<BookingStatus, ReadonlySet<BookingStatus>>` として定義する:
  - `pending → { confirmed, cancelled }`
  - `confirmed → { cancelled, completed, no-show }`
  - `cancelled → ∅`
  - `completed → ∅`
  - `no-show → ∅`
- [ ] `isActive(status: BookingStatus): boolean` — `pending` | `confirmed` で `true`
- [ ] `isTerminal(status: BookingStatus): boolean` — `cancelled` | `completed` | `no-show` で `true`
- [ ] `src/index.ts` から `BookingStatus` 型、`isActive`、`isTerminal` を export する

**Acceptance Criteria**:
- `BookingStatus` が 5 値の union 型である
- `isActive('pending')` → `true`、`isActive('cancelled')` → `false`
- `isTerminal('cancelled')` → `true`、`isTerminal('pending')` → `false`
- `pnpm -F @koma/scheduling run check-types` が成功する

## T-03: BookingStatus 状態機械のテスト（`src/booking-status.test.ts`）

- [ ] `isActive` のテスト: 5 値全てに対して期待値を検証する
- [ ] `isTerminal` のテスト: 5 値全てに対して期待値を検証する
- [ ] `isActive` と `isTerminal` が相互排他で全状態をカバーすることを検証する

**Acceptance Criteria**:
- `pnpm -F @koma/scheduling run test` で booking-status.test.ts の全テストが green

## T-04: Booking 集約（`src/booking.ts`）

- [ ] `CustomFieldValue` 型を定義する: `string | number | boolean`
- [ ] `Booking` 型を定義する（全フィールド `readonly`）:
  - `id: Id<'Booking'>`
  - `customerId: Id<'Customer'>`
  - `serviceId: Id<'Service'>`
  - `resourceId: Id<'Resource'>`
  - `slot: TimeRange`
  - `status: BookingStatus`
  - `customFields: Readonly<Record<string, CustomFieldValue>>`
- [ ] `createBooking` ファクトリ関数を実装する:
  - 引数: `{ id?: Id<'Booking'>; customerId: Id<'Customer'>; serviceId: Id<'Service'>; resourceId: Id<'Resource'>; slot: TimeRange; customFields?: Record<string, CustomFieldValue> }`
  - `id` 省略時は `createId<'Booking'>()` で自動生成
  - `status` は常に `'pending'`（引数で受け取らない）
  - `customFields` 省略時は空オブジェクト
  - 返却オブジェクトを `Object.freeze` する
- [ ] `restoreBooking` ファクトリ関数を実装する（永続化復元・テスト用）:
  - 引数: `Booking` の全フィールドを必須で受け取る（`status` を含む）
  - 返却オブジェクトを `Object.freeze` する
- [ ] `transitionBooking(booking: Booking, to: BookingStatus): Booking` を実装する:
  - `ALLOWED_TRANSITIONS` を参照し、許可遷移なら `status` を変えた新しい frozen `Booking` を返す
  - 不正遷移（同一状態への遷移を含む）は `Error` を throw する
  - 元の `Booking` は変更しない
- [ ] `src/index.ts` から `Booking` 型、`CustomFieldValue` 型、`createBooking`、`restoreBooking`、`transitionBooking` を export する

**Acceptance Criteria**:
- `createBooking` の返却値の `status` が `'pending'`
- `createBooking` の返却値が `Object.isFrozen === true`
- `transitionBooking` が新インスタンスを返し元を破壊しない
- 不正遷移で throw する
- `pnpm -F @koma/scheduling run check-types` が成功する

## T-05: Booking 集約のテスト（`src/booking.test.ts`）

- [ ] `createBooking` のテスト:
  - 必須フィールドのみで構築でき、`status` が `'pending'` である
  - `id` 省略時に自動生成される
  - `customFields` 省略時に空オブジェクトが設定される
  - 返却値が frozen である
- [ ] `restoreBooking` のテスト:
  - 任意の `status` で復元できる
  - 返却値が frozen である
- [ ] `transitionBooking` のテスト:
  - 許可遷移（`pending → confirmed`、`pending → cancelled`、`confirmed → cancelled`、`confirmed → completed`、`confirmed → no-show`）が成功する
  - 不正遷移（`pending → completed`、`pending → no-show`）が throw する
  - terminal 状態（`cancelled`、`completed`、`no-show`）からの任意の遷移が throw する
  - 同一状態への遷移が throw する
  - 遷移後も元の Booking の `status` が変わらない（immutability）
  - 遷移後の Booking は異なるオブジェクト参照である

**Acceptance Criteria**:
- `pnpm -F @koma/scheduling run test` で booking.test.ts の全テストが green

## T-06: capacity-aware 整合性判定（`src/can-accommodate.ts`）

- [ ] `canAccommodate(existingActive: Booking[], slot: TimeRange, capacity: number): boolean` を実装する:
  - `slot` と重なる（`overlaps` で判定）既存予約を抽出する
  - 重なる予約がない場合は `true`（提案 1 件 ≤ capacity、capacity ≥ 1 前提）
  - スイープライン方式で最大同時重なり数を算出する:
    - 重なる各予約の `start` に `+1`、`end` に `-1` のイベントを作成
    - 時刻でソート（同時刻は `-1` を先に処理 — 半開区間 `[start, end)` の end と次の start が同時刻なら重ならない）
    - 累積カウントの最大値 + 1（提案分）が `capacity` を超えるなら `false`、以下なら `true`
- [ ] `@koma/shared` の `overlaps` を利用して重なり判定する
- [ ] `src/index.ts` から `canAccommodate` を export する

**Acceptance Criteria**:
- `canAccommodate([], slot, 1)` → `true`
- capacity=1 で重なる active 予約 1 件 → `false`
- 隣接 `[a,b)` + `[b,c)` は capacity=1 で `true`
- capacity=2 で 2 重なりまで `true`、3 重なりで `false`
- 部分的重なり（前半のみ・後半のみ）ではピーク時の同時数で判定する
- `pnpm -F @koma/scheduling run check-types` が成功する

## T-07: capacity-aware 整合性判定のテスト（`src/can-accommodate.test.ts`）

- [ ] テストケース:
  - 既存予約なし + capacity=1 → `true`
  - capacity=1 で完全に重なる active 予約 1 件 → `false`
  - capacity=1 で部分的に重なる active 予約 1 件 → `false`
  - 隣接する半開区間 `[a,b)` + `[b,c)` + capacity=1 → `true`
  - capacity=2 で 1 件重なり → `true`（1+1=2 ≤ 2）
  - capacity=2 で 2 件同時重なり → `false`（2+1=3 > 2）
  - 部分的重なり: 前半のみ・後半のみに各 1 件（同時刻に全部重ならない）+ capacity=2 → `true`
  - capacity=3 で 2 件同時重なり → `true`（2+1=3 ≤ 3）

**Acceptance Criteria**:
- `pnpm -F @koma/scheduling run test` で can-accommodate.test.ts の全テストが green

## T-08: BookingRepository port（`src/port/booking-repository.ts`）

- [ ] `BookingRepository` 型（interface）を定義する:
  - `save(booking: Booking): Promise<void>`
  - `findById(id: Id<'Booking'>): Promise<Booking | null>`
  - `list(): Promise<Booking[]>`
  - `findActiveByResource(resourceId: Id<'Resource'>): Promise<Booking[]>`
- [ ] `src/index.ts` から `BookingRepository` 型を export する

**Acceptance Criteria**:
- `BookingRepository` が `save` / `findById` / `list` / `findActiveByResource` の 4 メソッドを持つ
- `pnpm -F @koma/scheduling run check-types` が成功する

## T-09: in-memory BookingRepository 実装（`src/in-memory-booking-repository.ts`）

- [ ] `createInMemoryBookingRepository` ファクトリ関数を実装する:
  - 内部に `Map<string, Booking>` を保持
  - `save`: `store.set(booking.id, booking)` → `Promise.resolve()`
  - `findById`: `store.get(id) ?? null` → `Promise.resolve()`
  - `list`: `[...store.values()]` → `Promise.resolve()`
  - `findActiveByResource(resourceId)`: store から `resourceId` が一致かつ `isActive(status)` が `true` の Booking のみ抽出して返す
- [ ] `src/index.ts` から `createInMemoryBookingRepository` を export する

**Acceptance Criteria**:
- `createInMemoryBookingRepository()` が `BookingRepository` 型を満たす
- `findActiveByResource` が active のみ・該当 resource のみ返す
- `pnpm -F @koma/scheduling run check-types` が成功する

## T-10: in-memory BookingRepository のテスト（`src/in-memory-booking-repository.test.ts`）

- [ ] 基本操作テスト:
  - `save` した `Booking` を `findById` で取得できる
  - 未保存の id で `findById` すると `null` が返る
  - `save` → `list` で保存分が全て返る
  - 空の状態で `list` が空配列を返す
  - 同一 id で `save` を 2 回呼ぶと上書き（upsert）される
  - 複数の `Booking` を `save` し `list` が全件返す
- [ ] `findActiveByResource` テスト:
  - active（`pending` / `confirmed`）な Booking のみ返す（`cancelled` / `completed` / `no-show` は除外）
  - 指定 `resourceId` の Booking のみ返す（他 resource は除外）
  - active かつ該当 resource に一致する Booking がない場合は空配列

**Acceptance Criteria**:
- `pnpm -F @koma/scheduling run test` で in-memory-booking-repository.test.ts の全テストが green

## T-11: barrel export の完成（`src/index.ts`）

- [ ] 以下を全て `src/index.ts` から export する:
  - 型: `Booking`, `BookingStatus`, `CustomFieldValue`, `BookingRepository`
  - 関数: `createBooking`, `restoreBooking`, `transitionBooking`, `isActive`, `isTerminal`, `canAccommodate`, `createInMemoryBookingRepository`
- [ ] `pnpm -F @koma/scheduling run check-types` で export 整合性を確認する

**Acceptance Criteria**:
- 上記の型・関数が全て `@koma/scheduling` から import 可能
- `pnpm -F @koma/scheduling run check-types` が成功する

## T-12: 全体検証

- [ ] `pnpm -F @koma/scheduling run check-types` が成功する
- [ ] `pnpm -F @koma/scheduling run test` が成功する
- [ ] `pnpm -F @koma/scheduling run lint` が成功する
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green（他パッケージへの影響がない）
- [ ] `grep -E '"(next|react|drizzle-orm|zod)"' packages/scheduling/package.json` が 0 件

**Acceptance Criteria**:
- 上記 5 コマンド/確認すべてが期待通り
