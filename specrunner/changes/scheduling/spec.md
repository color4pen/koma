# Spec: packages/scheduling — Booking 集約・BookingStatus 状態機械・capacity-aware 二重予約整合性

## Requirements

### Requirement: BookingStatus 状態機械は許可遷移のみを受け入れる

`transitionBooking` は遷移表に定義された遷移のみ成功し、不正遷移は例外を送出 SHALL する。許可遷移: `pending → confirmed | cancelled`、`confirmed → cancelled | completed | no-show`。terminal 状態（`cancelled` / `completed` / `no-show`）からの遷移は全て不正。

#### Scenario: pending → confirmed は成功する

**Given** `status: 'pending'` の `Booking`
**When** `transitionBooking(booking, 'confirmed')` を呼び出す
**Then** `status: 'confirmed'` の新しい `Booking` が返る

#### Scenario: pending → cancelled は成功する

**Given** `status: 'pending'` の `Booking`
**When** `transitionBooking(booking, 'cancelled')` を呼び出す
**Then** `status: 'cancelled'` の新しい `Booking` が返る

#### Scenario: confirmed → cancelled は成功する

**Given** `status: 'confirmed'` の `Booking`
**When** `transitionBooking(booking, 'cancelled')` を呼び出す
**Then** `status: 'cancelled'` の新しい `Booking` が返る

#### Scenario: confirmed → completed は成功する

**Given** `status: 'confirmed'` の `Booking`
**When** `transitionBooking(booking, 'completed')` を呼び出す
**Then** `status: 'completed'` の新しい `Booking` が返る

#### Scenario: confirmed → no-show は成功する

**Given** `status: 'confirmed'` の `Booking`
**When** `transitionBooking(booking, 'no-show')` を呼び出す
**Then** `status: 'no-show'` の新しい `Booking` が返る

#### Scenario: pending → completed は不正遷移として拒否される

**Given** `status: 'pending'` の `Booking`
**When** `transitionBooking(booking, 'completed')` を呼び出す
**Then** 例外が送出される

#### Scenario: pending → no-show は不正遷移として拒否される

**Given** `status: 'pending'` の `Booking`
**When** `transitionBooking(booking, 'no-show')` を呼び出す
**Then** 例外が送出される

#### Scenario: terminal 状態からの遷移は全て拒否される

**Given** `status: 'cancelled'` の `Booking`
**When** `transitionBooking(booking, 'pending')` を呼び出す
**Then** 例外が送出される

#### Scenario: 同一状態への遷移は拒否される

**Given** `status: 'pending'` の `Booking`
**When** `transitionBooking(booking, 'pending')` を呼び出す
**Then** 例外が送出される

### Requirement: isActive と isTerminal は BookingStatus の区分を正しく判定する

`isActive` は `pending` と `confirmed` に対して `true` を返し、それ以外に `false` を返す SHALL。`isTerminal` は `cancelled`・`completed`・`no-show` に対して `true` を返し、それ以外に `false` を返す SHALL。

#### Scenario: pending は active である

**Given** `status = 'pending'`
**When** `isActive(status)` を呼び出す
**Then** `true` が返る

#### Scenario: confirmed は active である

**Given** `status = 'confirmed'`
**When** `isActive(status)` を呼び出す
**Then** `true` が返る

#### Scenario: cancelled は terminal である

**Given** `status = 'cancelled'`
**When** `isTerminal(status)` を呼び出す
**Then** `true` が返る

#### Scenario: completed は terminal である

**Given** `status = 'completed'`
**When** `isTerminal(status)` を呼び出す
**Then** `true` が返る

#### Scenario: no-show は terminal である

**Given** `status = 'no-show'`
**When** `isTerminal(status)` を呼び出す
**Then** `true` が返る

#### Scenario: active な status は terminal でない

**Given** `status = 'pending'`
**When** `isTerminal(status)` を呼び出す
**Then** `false` が返る

### Requirement: transitionBooking は元の Booking を破壊しない

`transitionBooking` は新しい `Booking` インスタンスを返し、元の `Booking` の `status` を変更しない SHALL。

#### Scenario: 遷移後も元の Booking は変更されない

**Given** `status: 'pending'` の `Booking`（参照を保持）
**When** `transitionBooking(booking, 'confirmed')` を呼び出す
**Then** 元の `Booking` の `status` は `'pending'` のまま。返された新 `Booking` の `status` は `'confirmed'`。返された `Booking` は元と異なるオブジェクト参照

### Requirement: createBooking は初期 status を pending に固定する

`createBooking` で生成される `Booking` の `status` は必ず `'pending'` である SHALL。呼び出し側が status を指定する経路は存在しない。

#### Scenario: 新規 Booking は pending で作成される

**Given** `customerId`・`serviceId`・`resourceId`・`slot` を指定した引数
**When** `createBooking` を呼び出す
**Then** 生成された `Booking` の `status` は `'pending'`

### Requirement: canAccommodate は capacity-aware で重なり数を判定する

`canAccommodate(existingActive, slot, capacity)` は提案する `slot` を加えた場合に、任意の時刻で重なる active 予約数が `capacity` を超えないかを判定 SHALL する。半開区間 `[start, end)` で隣接する予約は重ならないものとする。

#### Scenario: capacity=1 で重なる active 予約がなければ true

**Given** `existingActive` が空、`capacity = 1`
**When** `canAccommodate([], slot, 1)` を呼び出す
**Then** `true` が返る

#### Scenario: capacity=1 で重なる active 予約があると false

**Given** `existingActive` に `slot` と重なる Booking が 1 件、`capacity = 1`
**When** `canAccommodate(existingActive, slot, 1)` を呼び出す
**Then** `false` が返る

#### Scenario: 隣接する半開区間は重ならない

**Given** 既存予約の slot が `[a, b)`、提案 slot が `[b, c)`、`capacity = 1`
**When** `canAccommodate([existingBooking], proposedSlot, 1)` を呼び出す
**Then** `true` が返る（隣接は重複しない）

#### Scenario: capacity=2 で 2 重なりまでは true

**Given** `existingActive` に提案 slot と重なる Booking が 1 件、`capacity = 2`
**When** `canAccommodate(existingActive, proposedSlot, 2)` を呼び出す
**Then** `true` が返る（既存 1 + 提案 1 = 2 ≤ capacity 2）

#### Scenario: capacity=2 で 3 重なりになると false

**Given** `existingActive` に提案 slot と重なる Booking が 2 件で同時刻に全て重なる、`capacity = 2`
**When** `canAccommodate(existingActive, proposedSlot, 2)` を呼び出す
**Then** `false` が返る（既存 2 + 提案 1 = 3 > capacity 2）

#### Scenario: 部分的に重なる場合はピーク時の同時数で判定する

**Given** `existingActive` に 2 件の Booking があり、1 件は提案 slot の前半のみ重なり、もう 1 件は後半のみ重なる（2 件同士は重ならない）、`capacity = 2`
**When** `canAccommodate(existingActive, proposedSlot, 2)` を呼び出す
**Then** `true` が返る（ピーク時の同時数 = 1 + 1 = 2 ≤ capacity 2）

### Requirement: InMemoryBookingRepository の findActiveByResource は active かつ該当 resource の Booking のみ返す

`findActiveByResource` は指定された `resourceId` に一致し、かつ `isActive(status)` が `true` の `Booking` のみを返す SHALL。

#### Scenario: active な Booking のみが返る

**Given** 同一 `resourceId` で `status: 'pending'` と `status: 'cancelled'` の Booking を save した `InMemoryBookingRepository`
**When** `findActiveByResource(resourceId)` を呼び出す
**Then** `status: 'pending'` の Booking のみが返る

#### Scenario: 該当 resource の Booking のみが返る

**Given** `resourceId: A` で `status: 'confirmed'` と `resourceId: B` で `status: 'confirmed'` の Booking を save した `InMemoryBookingRepository`
**When** `findActiveByResource(A)` を呼び出す
**Then** `resourceId: A` の Booking のみが返る

#### Scenario: active かつ該当 resource に一致する Booking がない場合は空配列

**Given** `resourceId: A` で `status: 'cancelled'` の Booking のみ save した `InMemoryBookingRepository`
**When** `findActiveByResource(A)` を呼び出す
**Then** 空配列が返る

### Requirement: InMemoryBookingRepository は save/findById/list の基本操作を提供する

in-memory 実装は `BookingRepository` interface の基本契約を満たす SHALL。

#### Scenario: save した Booking を findById で取得できる

**Given** 空の `InMemoryBookingRepository`
**When** `Booking` を `save` し、その `id` で `findById` する
**Then** 保存した `Booking` と等価なオブジェクトが返る

#### Scenario: 未保存の id で findById すると null が返る

**Given** 空の `InMemoryBookingRepository`
**When** 未保存の `Id<'Booking'>` で `findById` する
**Then** `null` が返る

#### Scenario: save した Booking が list に含まれる

**Given** 空の `InMemoryBookingRepository`
**When** `Booking` を `save` し、`list` を呼び出す
**Then** 保存した `Booking` を含む配列が返る

#### Scenario: 空の状態で list は空配列を返す

**Given** 空の `InMemoryBookingRepository`
**When** `list` を呼び出す
**Then** 空配列が返る

#### Scenario: 同一 id で save を 2 回呼ぶと上書きされる

**Given** `Booking` を `save` した `InMemoryBookingRepository`
**When** 同一 `id` で status を遷移させた `Booking` を `save` し、`findById` する
**Then** 後に保存した `Booking` が返る。`list` の件数は 1
