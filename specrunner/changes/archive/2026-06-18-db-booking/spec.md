# Spec: db-booking

## Requirements

### Requirement: DrizzleBookingRepository SHALL persist and restore Booking with slot and status fidelity

`DrizzleBookingRepository` は `BookingRepository` port を実装し、`Booking` の全フィールド（`id`, `customerId`, `serviceId`, `resourceId`, `slot`, `status`, `customFields`）を欠損なく永続化・復元する。復元は `restoreBooking` 経由で行い、保存時の `status` をそのまま再構成する。`slot` の `start` / `end`（絶対 epoch ミリ秒）は `bigint` カラムで保持し、`2^31` を超える値も欠損なく往復する。

#### Scenario: save した Booking を findById で slot と status が一致した状態で取得できる

**Given** `Booking`（status = `pending`, slot = 任意の TimeRange）が save されている
**When** 同じ id で `findById` を呼ぶ
**Then** 返された `Booking` の `slot.start`, `slot.end`, `status` が save 時と一致する

#### Scenario: 2026 年の epoch ms を slot に設定しても値が欠損しない

**Given** `slot.start` = `1_800_000_000_000`（2027-01 付近）の `Booking` が save されている
**When** 同じ id で `findById` を呼ぶ
**Then** `slot.start` が `1_800_000_000_000` として返される（bigint → number の往復で欠損なし）

### Requirement: findById SHALL return null for non-existent Booking

存在しない id で `findById` を呼んだ場合、`null` を返す。

#### Scenario: 未保存の id で findById すると null が返る

**Given** データベースに Booking が存在しない
**When** 任意の id で `findById` を呼ぶ
**Then** `null` が返される

### Requirement: save SHALL upsert on same id

同一 id で `save` を 2 回呼ぶと、2 回目の値で既存行を更新する（重複行を作らない）。

#### Scenario: 同一 id で再 save すると既存データが更新される

**Given** id = X の `Booking`（status = `pending`）が save されている
**When** 同じ id = X で `status` = `confirmed` に変更した `Booking` を再 save する
**Then** `findById(X)` が `confirmed` を返し、`list()` の件数が 1 である

### Requirement: list SHALL return all saved Bookings

`list()` は保存済みの全 `Booking` を返す。

#### Scenario: 複数 Booking を save し list で全件取得できる

**Given** 3 件の異なる `Booking` が save されている
**When** `list()` を呼ぶ
**Then** 3 件の `Booking` が返され、各 id が含まれる

### Requirement: findActiveByResource SHALL return only active Bookings for the specified resource

`findActiveByResource(resourceId)` は、指定された `resourceId` に紐づく active 状態（`pending` または `confirmed`）の Booking のみを返す。terminal 状態（`cancelled`, `completed`, `no-show`）の Booking や、別 resource の Booking は含まない。

#### Scenario: active な予約のみ返し terminal を除外する

**Given** resource A に対して `pending`・`confirmed`・`cancelled` の 3 Booking が save されている
**When** `findActiveByResource(resourceA)` を呼ぶ
**Then** `pending` と `confirmed` の 2 件のみ返される（`cancelled` は含まれない）

#### Scenario: 別 resource の Booking は含まない

**Given** resource A に `pending` の Booking、resource B に `pending` の Booking が save されている
**When** `findActiveByResource(resourceA)` を呼ぶ
**Then** resource A の Booking のみ返され、resource B の Booking は含まれない

### Requirement: Row-to-Booking reconstruction SHALL use restoreBooking

データベース行から `Booking` への再構成は `restoreBooking`（`@koma/scheduling` export）を経由して行う。`createBooking` は使用しない（`createBooking` は常に `status: 'pending'` を設定するため、保存済みの status を失う）。

#### Scenario: confirmed 状態の Booking が restoreBooking 経由で正しく復元される

**Given** `status` = `confirmed` の `Booking` が save されている
**When** `findById` で取得する
**Then** 返された `Booking` の `status` が `confirmed` である（`pending` にリセットされない）
