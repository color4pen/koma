# Spec: web-booking-status

## Requirements

### Requirement: allowedTransitions は ALLOWED_TRANSITIONS から許可遷移先の配列を返す

`allowedTransitions(status)` SHALL return an array of `BookingStatus` values that the given status can transition to, derived from `ALLOWED_TRANSITIONS`. Terminal statuses SHALL return an empty array.

#### Scenario: pending の許可遷移

**Given** status が `pending` である
**When** `allowedTransitions('pending')` を呼ぶ
**Then** `['confirmed', 'cancelled']` が返る

#### Scenario: confirmed の許可遷移

**Given** status が `confirmed` である
**When** `allowedTransitions('confirmed')` を呼ぶ
**Then** `['cancelled', 'completed', 'no-show']` が返る

#### Scenario: terminal 状態の許可遷移は空

**Given** status が `cancelled`、`completed`、`no-show` のいずれかである
**When** `allowedTransitions(status)` を呼ぶ
**Then** 空配列 `[]` が返る

### Requirement: transitionLabel は BookingStatus に対応する日本語ラベルを返す

`transitionLabel(status)` SHALL return a human-readable Japanese label for each `BookingStatus`.

#### Scenario: 各ステータスのラベル

**Given** `BookingStatus` の各値
**When** `transitionLabel(status)` を呼ぶ
**Then** `confirmed` → `'確定'`、`cancelled` → `'キャンセル'`、`completed` → `'完了'`、`no-show` → `'来店なし'` が返る

### Requirement: transitionBookingAction は許可遷移で予約の status を更新する

`transitionBookingAction` SHALL find the booking by ID, call `transitionBooking` to transition its status, save the updated booking, and revalidate `/bookings`.

#### Scenario: 許可遷移で status が更新される

**Given** status が `pending` の予約が存在する
**When** `transitionBookingAction(bookingId, 'confirmed')` を呼ぶ
**Then** 予約の status が `confirmed` に更新され `save` が呼ばれ、`{ ok: true }` が返る

#### Scenario: 不正遷移でエラーを返し save しない

**Given** status が `pending` の予約が存在する
**When** `transitionBookingAction(bookingId, 'completed')` を呼ぶ
**Then** `{ ok: false, errors: { _form: [...] } }` が返り、予約の status は `pending` のまま

#### Scenario: 存在しない bookingId でエラーを返す

**Given** 指定の bookingId に該当する予約が存在しない
**When** `transitionBookingAction(bookingId, 'confirmed')` を呼ぶ
**Then** `{ ok: false, errors: { _form: [...] } }` が返る

### Requirement: 予約一覧は許可された遷移操作のみをボタンとして表示する

予約一覧の各行 SHALL display the current status and render action buttons only for transitions allowed from that status. Terminal statuses SHALL have no action buttons.

#### Scenario: pending の予約に確定・キャンセルボタンが表示される

**Given** status が `pending` の予約がある
**When** 予約一覧を表示する
**Then** その行に「確定」「キャンセル」ボタンが表示される

#### Scenario: confirmed の予約にキャンセル・完了・来店なしボタンが表示される

**Given** status が `confirmed` の予約がある
**When** 予約一覧を表示する
**Then** その行に「キャンセル」「完了」「来店なし」ボタンが表示される

#### Scenario: terminal な予約には操作ボタンが表示されない

**Given** status が `cancelled` の予約がある
**When** 予約一覧を表示する
**Then** その行に操作ボタンは表示されない
