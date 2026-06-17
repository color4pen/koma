# Spec: apps/web に予約作成フローを追加する（capacity-aware 二重予約防止・コンテキスト横断 use-case）

## Requirements

### Requirement: parseBookingInput は有効な入力から予約パラメータを抽出する

`parseBookingInput` SHALL accept a raw input object with `customerId`, `serviceId`, `resourceId` (non-empty strings), and `startAt` (`datetime-local` string), validate them via `zod/v4/mini`, convert `startAt` to epoch milliseconds, and return `{ ok: true, input: { customerId, serviceId, resourceId, startMillis } }`. On failure, it SHALL return `{ ok: false, errors }` with field-specific error messages.

#### Scenario: 有効な入力で予約パラメータが返る

**Given** `raw` が `{ customerId: "cust-1", serviceId: "svc-1", resourceId: "res-1", startAt: "2026-07-01T10:00" }` である
**When** `parseBookingInput(raw)` を呼び出す
**Then** 戻り値は `{ ok: true }` であり、`input.customerId` は `"cust-1"`、`input.serviceId` は `"svc-1"`、`input.resourceId` は `"res-1"`、`input.startMillis` は `new Date("2026-07-01T10:00").getTime()` と等しい

#### Scenario: customerId が空文字で失敗する

**Given** `raw` が `{ customerId: "", serviceId: "svc-1", resourceId: "res-1", startAt: "2026-07-01T10:00" }` である
**When** `parseBookingInput(raw)` を呼び出す
**Then** 戻り値は `{ ok: false }` であり、`errors.customerId` が 1 件以上のエラーメッセージを含む

#### Scenario: serviceId が空文字で失敗する

**Given** `raw` が `{ customerId: "cust-1", serviceId: "", resourceId: "res-1", startAt: "2026-07-01T10:00" }` である
**When** `parseBookingInput(raw)` を呼び出す
**Then** 戻り値は `{ ok: false }` であり、`errors.serviceId` が 1 件以上のエラーメッセージを含む

#### Scenario: resourceId が空文字で失敗する

**Given** `raw` が `{ customerId: "cust-1", serviceId: "svc-1", resourceId: "", startAt: "2026-07-01T10:00" }` である
**When** `parseBookingInput(raw)` を呼び出す
**Then** 戻り値は `{ ok: false }` であり、`errors.resourceId` が 1 件以上のエラーメッセージを含む

#### Scenario: startAt が不正な文字列で失敗する

**Given** `raw` が `{ customerId: "cust-1", serviceId: "svc-1", resourceId: "res-1", startAt: "not-a-date" }` である
**When** `parseBookingInput(raw)` を呼び出す
**Then** 戻り値は `{ ok: false }` であり、`errors.startAt` が 1 件以上のエラーメッセージを含む

#### Scenario: startAt が空文字で失敗する

**Given** `raw` が `{ customerId: "cust-1", serviceId: "svc-1", resourceId: "res-1", startAt: "" }` である
**When** `parseBookingInput(raw)` を呼び出す
**Then** 戻り値は `{ ok: false }` であり、`errors.startAt` が 1 件以上のエラーメッセージを含む

### Requirement: createBookingUseCase は service の duration と resource の capacity を使って予約を作成する

`createBookingUseCase` SHALL retrieve the `Service` (for `duration`) and `Resource` (for `capacity`) from their respective repositories, compute the `slot` as `createTimeRange(startMillis, startMillis + duration.milliseconds)`, check capacity via `canAccommodate`, and save the booking via `bookingRepo.save`. On success it SHALL return `{ ok: true, booking }`.

#### Scenario: 有効な入力で予約が作成される

**Given** `ServiceRepository` に `id: "svc-1"` の `Service`（`duration: ofMinutes(60)`）が存在し、`ResourceRepository` に `id: "res-1"` の `Resource`（`capacity: 1`）が存在し、`BookingRepository` に active 予約が存在しない
**When** `createBookingUseCase(deps, { customerId: "cust-1", serviceId: "svc-1", resourceId: "res-1", startMillis })` を呼び出す
**Then** 戻り値は `{ ok: true, booking }` であり、`booking.status` は `"pending"`、`booking.slot` の長さは 60 分相当、`BookingRepository` に 1 件保存されている

### Requirement: createBookingUseCase は存在しない service で service-not-found を返す

`createBookingUseCase` SHALL return `{ ok: false, reason: 'service-not-found' }` when the given `serviceId` does not exist in the `ServiceRepository`.

#### Scenario: 存在しない serviceId

**Given** `ServiceRepository` に `id: "svc-1"` の `Service` が存在しない
**When** `createBookingUseCase(deps, { customerId: "cust-1", serviceId: "svc-1", resourceId: "res-1", startMillis })` を呼び出す
**Then** 戻り値は `{ ok: false, reason: 'service-not-found' }`

### Requirement: createBookingUseCase は存在しない resource で resource-not-found を返す

`createBookingUseCase` SHALL return `{ ok: false, reason: 'resource-not-found' }` when the given `resourceId` does not exist in the `ResourceRepository`.

#### Scenario: 存在しない resourceId

**Given** `ServiceRepository` に `id: "svc-1"` の `Service` が存在し、`ResourceRepository` に `id: "res-1"` の `Resource` が存在しない
**When** `createBookingUseCase(deps, { customerId: "cust-1", serviceId: "svc-1", resourceId: "res-1", startMillis })` を呼び出す
**Then** 戻り値は `{ ok: false, reason: 'resource-not-found' }`

### Requirement: createBookingUseCase は capacity 超過で no-capacity を返す（二重予約防止）

`createBookingUseCase` SHALL return `{ ok: false, reason: 'no-capacity' }` when adding the proposed booking would exceed the resource's capacity as determined by `canAccommodate`.

#### Scenario: capacity=1 で同一 Resource・重なる時刻の 2 件目が拒否される

**Given** `Resource`（`capacity: 1`）に対し、10:00〜11:00 の active 予約が 1 件存在する
**When** 同一 Resource に 10:30〜11:30 の予約を `createBookingUseCase` で作成する
**Then** 戻り値は `{ ok: false, reason: 'no-capacity' }`

#### Scenario: capacity=1 で隣接時刻（[a,b)+[b,c)）は許可される

**Given** `Resource`（`capacity: 1`）に対し、10:00〜11:00 の active 予約が 1 件存在する
**When** 同一 Resource に 11:00〜12:00 の予約を `createBookingUseCase` で作成する
**Then** 戻り値は `{ ok: true, booking }` であり予約が保存される

#### Scenario: capacity=2 で 2 件 ok・3 件目は no-capacity

**Given** `Resource`（`capacity: 2`）に対し、10:00〜11:00 の active 予約が 2 件存在する
**When** 同一 Resource に 10:00〜11:00 の予約を `createBookingUseCase` で作成する
**Then** 戻り値は `{ ok: false, reason: 'no-capacity' }`

#### Scenario: capacity=2 で 1 件目・2 件目は ok

**Given** `Resource`（`capacity: 2`）に対し、active 予約が存在しない
**When** 同一 Resource・同一時刻で `createBookingUseCase` を 2 回呼び出す
**Then** 1 回目・2 回目ともに `{ ok: true, booking }` が返る

### Requirement: createBookingAction は parse 失敗時にフィールドエラーを返し save しない

`createBookingAction` SHALL parse form data via `parseBookingInput` and return `{ ok: false, errors }` without calling `createBookingUseCase` when parsing fails.

#### Scenario: customerId が空でエラーが返る

**Given** `FormData` に `customerId: ""`, その他有効値がセットされている
**When** `createBookingAction` を呼び出す
**Then** `bookingRepo.save` は呼ばれず、戻り値は `{ ok: false, errors }` であり `errors.customerId` が存在する

### Requirement: createBookingAction は use-case 成功時に save してパスを再検証する

`createBookingAction` SHALL invoke `createBookingUseCase` with composition root repositories on successful parse, and call `revalidatePath('/bookings')` on booking success.

#### Scenario: 有効なフォーム送信で予約が保存される

**Given** 有効な `FormData` がセットされ、`ServiceRepository` / `ResourceRepository` に対応するエンティティが存在し、capacity に空きがある
**When** `createBookingAction` を呼び出す
**Then** `bookingRepo.save` が呼ばれ、`revalidatePath('/bookings')` が呼ばれ、戻り値は `{ ok: true }` である

#### Scenario: capacity 不足時にエラーメッセージが返る

**Given** 有効な `FormData` がセットされているが、`createBookingUseCase` が `{ ok: false, reason: 'no-capacity' }` を返す状況
**When** `createBookingAction` を呼び出す
**Then** 戻り値は `{ ok: false, errors }` であり、`errors._form` にキャパシティ不足を示すメッセージが含まれる

### Requirement: 予約一覧ページは予約一覧と作成フォームを表示する

`app/bookings/page.tsx` SHALL render a list of all bookings from `bookingRepo.list()` with customer / service / resource names resolved from their respective repositories, and include a `BookingForm` client component for new booking creation.

#### Scenario: 予約が 0 件のとき空メッセージと登録フォームを表示

**Given** `BookingRepository` に予約が保存されていない
**When** `/bookings` ページを表示する
**Then** 「予約がありません。」というメッセージと予約作成フォーム（顧客/サービス/リソースのドロップダウン + 日時入力）が表示される

#### Scenario: 予約が存在するとき一覧テーブルを表示

**Given** `BookingRepository` に予約が 1 件保存されており、対応する Customer / Service / Resource が各 repo に存在する
**When** `/bookings` ページを表示する
**Then** テーブルに顧客名・サービス名・リソース名・日時・ステータスが表示される

### Requirement: composition root は BookingRepository を単一生成する

`getBookingRepository` SHALL return the same `BookingRepository` instance across multiple calls within the same process, using the `globalThis` lazy singleton pattern established by `getCustomerRepository` / `getResourceRepository` / `getServiceRepository`.

#### Scenario: 複数回呼び出しで同一インスタンスを返す

**Given** `getBookingRepository` が未呼び出しの状態
**When** `getBookingRepository()` を 2 回呼び出す
**Then** 両方の戻り値が同一の参照（`===`）である
