# Test Cases: packages/scheduling — Booking 集約・BookingStatus 状態機械・capacity-aware 二重予約整合性

## Summary

- **Total**: 47 cases
- **Automated** (unit/integration): 42
- **Manual**: 5
- **Priority**: must: 31, should: 15, could: 1

---

## BookingStatus 状態機械 — 許可遷移

### TC-001: pending → confirmed は成功する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: BookingStatus 状態機械は許可遷移のみを受け入れる > Scenario: pending → confirmed は成功する

---

### TC-002: pending → cancelled は成功する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: BookingStatus 状態機械は許可遷移のみを受け入れる > Scenario: pending → cancelled は成功する

---

### TC-003: confirmed → cancelled は成功する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: BookingStatus 状態機械は許可遷移のみを受け入れる > Scenario: confirmed → cancelled は成功する

---

### TC-004: confirmed → completed は成功する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: BookingStatus 状態機械は許可遷移のみを受け入れる > Scenario: confirmed → completed は成功する

---

### TC-005: confirmed → no-show は成功する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: BookingStatus 状態機械は許可遷移のみを受け入れる > Scenario: confirmed → no-show は成功する

---

### TC-006: pending → completed は不正遷移として拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: BookingStatus 状態機械は許可遷移のみを受け入れる > Scenario: pending → completed は不正遷移として拒否される

---

### TC-007: pending → no-show は不正遷移として拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: BookingStatus 状態機械は許可遷移のみを受け入れる > Scenario: pending → no-show は不正遷移として拒否される

---

### TC-008: terminal 状態からの遷移は全て拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: BookingStatus 状態機械は許可遷移のみを受け入れる > Scenario: terminal 状態からの遷移は全て拒否される

---

### TC-009: 同一状態への遷移は拒否される

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: BookingStatus 状態機械は許可遷移のみを受け入れる > Scenario: 同一状態への遷移は拒否される

---

## BookingStatus — isActive / isTerminal 判定

### TC-010: pending は active である

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: isActive と isTerminal は BookingStatus の区分を正しく判定する > Scenario: pending は active である

---

### TC-011: confirmed は active である

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: isActive と isTerminal は BookingStatus の区分を正しく判定する > Scenario: confirmed は active である

---

### TC-012: cancelled は terminal である

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: isActive と isTerminal は BookingStatus の区分を正しく判定する > Scenario: cancelled は terminal である

---

### TC-013: completed は terminal である

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: isActive と isTerminal は BookingStatus の区分を正しく判定する > Scenario: completed は terminal である

---

### TC-014: no-show は terminal である

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: isActive と isTerminal は BookingStatus の区分を正しく判定する > Scenario: no-show は terminal である

---

### TC-015: active な status は terminal でない

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: isActive と isTerminal は BookingStatus の区分を正しく判定する > Scenario: active な status は terminal でない

---

## Booking 集約 — immutability

### TC-016: 遷移後も元の Booking は変更されない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: transitionBooking は元の Booking を破壊しない > Scenario: 遷移後も元の Booking は変更されない

---

## Booking 集約 — createBooking

### TC-017: 新規 Booking は pending で作成される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: createBooking は初期 status を pending に固定する > Scenario: 新規 Booking は pending で作成される

---

## canAccommodate — capacity-aware 整合性判定

### TC-018: capacity=1 で重なる active 予約がなければ true

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: canAccommodate は capacity-aware で重なり数を判定する > Scenario: capacity=1 で重なる active 予約がなければ true

---

### TC-019: capacity=1 で重なる active 予約があると false

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: canAccommodate は capacity-aware で重なり数を判定する > Scenario: capacity=1 で重なる active 予約があると false

---

### TC-020: 隣接する半開区間は重ならない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: canAccommodate は capacity-aware で重なり数を判定する > Scenario: 隣接する半開区間は重ならない

---

### TC-021: capacity=2 で 2 重なりまでは true

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: canAccommodate は capacity-aware で重なり数を判定する > Scenario: capacity=2 で 2 重なりまでは true

---

### TC-022: capacity=2 で 3 重なりになると false

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: canAccommodate は capacity-aware で重なり数を判定する > Scenario: capacity=2 で 3 重なりになると false

---

### TC-023: 部分的に重なる場合はピーク時の同時数で判定する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: canAccommodate は capacity-aware で重なり数を判定する > Scenario: 部分的に重なる場合はピーク時の同時数で判定する

---

## InMemoryBookingRepository — findActiveByResource

### TC-024: active な Booking のみが返る

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: InMemoryBookingRepository の findActiveByResource は active かつ該当 resource の Booking のみ返す > Scenario: active な Booking のみが返る

---

### TC-025: 該当 resource の Booking のみが返る

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: InMemoryBookingRepository の findActiveByResource は active かつ該当 resource の Booking のみ返す > Scenario: 該当 resource の Booking のみが返る

---

### TC-026: active かつ該当 resource に一致する Booking がない場合は空配列

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: InMemoryBookingRepository の findActiveByResource は active かつ該当 resource の Booking のみ返す > Scenario: active かつ該当 resource に一致する Booking がない場合は空配列

---

## InMemoryBookingRepository — 基本操作

### TC-027: save した Booking を findById で取得できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: InMemoryBookingRepository は save/findById/list の基本操作を提供する > Scenario: save した Booking を findById で取得できる

---

### TC-028: 未保存の id で findById すると null が返る

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: InMemoryBookingRepository は save/findById/list の基本操作を提供する > Scenario: 未保存の id で findById すると null が返る

---

### TC-029: save した Booking が list に含まれる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: InMemoryBookingRepository は save/findById/list の基本操作を提供する > Scenario: save した Booking が list に含まれる

---

### TC-030: 空の状態で list は空配列を返す

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: InMemoryBookingRepository は save/findById/list の基本操作を提供する > Scenario: 空の状態で list は空配列を返す

---

### TC-031: 同一 id で save を 2 回呼ぶと上書きされる

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: InMemoryBookingRepository は save/findById/list の基本操作を提供する > Scenario: 同一 id で save を 2 回呼ぶと上書きされる

---

## パッケージ設定 — スキャフォールド検証

### TC-032: package.json の name が @koma/scheduling である

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01 Acceptance Criteria

**GIVEN** `packages/scheduling/package.json` が作成されている
**WHEN** `cat packages/scheduling/package.json | jq '.name'` を実行する
**THEN** `"@koma/scheduling"` が出力される

---

### TC-033: 禁止パッケージ依存（next / react / drizzle-orm / zod）が含まれていない

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01 Acceptance Criteria

**GIVEN** `packages/scheduling/package.json` が作成されている
**WHEN** `grep -E '"(next|react|drizzle-orm|zod)"' packages/scheduling/package.json` を実行する
**THEN** マッチが 0 件（exit code 1）である

---

### TC-034: @koma/shared への workspace:* 依存が存在する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01 Acceptance Criteria

**GIVEN** `packages/scheduling/package.json` が作成されている
**WHEN** `cat packages/scheduling/package.json | jq '.dependencies["@koma/shared"]'` を実行する
**THEN** `"workspace:*"` が出力される

---

### TC-035: pnpm -F @koma/scheduling run check-types が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12 Acceptance Criteria

**GIVEN** `packages/scheduling` の全ソースが実装されている
**WHEN** `pnpm -F @koma/scheduling run check-types` を実行する
**THEN** exit code が 0 であり、型エラーが報告されない

---

## BookingStatus — 5 値網羅・相互排他検証

### TC-036: isActive と isTerminal が 5 値全てで相互排他かつ網羅的である

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03 Acceptance Criteria

**GIVEN** `BookingStatus` の全 5 値（`pending` / `confirmed` / `cancelled` / `completed` / `no-show`）
**WHEN** 各値に対して `isActive(s)` と `isTerminal(s)` の両方を評価する
**THEN** 全 5 値について `isActive(s) !== isTerminal(s)` が成立し（相互排他）、かつ `isActive(s) || isTerminal(s) === true` が成立する（網羅的）

---

## Booking 集約 — createBooking 追加カバレッジ

### TC-037: createBooking は id 省略時に自動生成する

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04 / T-05

**GIVEN** `id` を指定しない引数（`customerId` / `serviceId` / `resourceId` / `slot` のみ）
**WHEN** `createBooking(args)` を呼び出す
**THEN** 返された `Booking` の `id` が空でない文字列として自動生成されている

---

### TC-038: createBooking は customFields 省略時に空オブジェクトを設定する

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04 / T-05

**GIVEN** `customFields` を指定しない引数
**WHEN** `createBooking(args)` を呼び出す
**THEN** 返された `Booking` の `customFields` が `{}` に等しい

---

### TC-039: createBooking の返却値は Object.freeze されている

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04 Acceptance Criteria

**GIVEN** `createBooking` を呼び出した結果の `Booking` オブジェクト
**WHEN** `Object.isFrozen(booking)` を評価する
**THEN** `true` が返る

---

## Booking 集約 — restoreBooking

### TC-040: restoreBooking は任意の status で Booking を復元できる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04 / T-05

**GIVEN** `status: 'completed'` を含む全フィールドを指定した引数
**WHEN** `restoreBooking(args)` を呼び出す
**THEN** 返された `Booking` の `status` が `'completed'` であり、全フィールドが引数と一致する

---

### TC-041: restoreBooking の返却値は Object.freeze されている

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04 / T-05

**GIVEN** `restoreBooking` を呼び出した結果の `Booking` オブジェクト
**WHEN** `Object.isFrozen(booking)` を評価する
**THEN** `true` が返る

---

## canAccommodate — 追加カバレッジ

### TC-042: capacity=1 で部分的に重なる active 予約 1 件は false

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** 既存 active 予約の slot が `[10:00, 11:00)`、提案 slot が `[10:30, 11:30)`（前半のみ重なる）、`capacity = 1`
**WHEN** `canAccommodate([existingBooking], proposedSlot, 1)` を呼び出す
**THEN** `false` が返る（部分的重なりでも重複あり）

---

### TC-043: capacity=3 で 2 件同時重なりは true

**Category**: unit
**Priority**: could
**Source**: tasks.md > T-07

**GIVEN** `existingActive` に提案 slot と同時刻に重なる Booking が 2 件、`capacity = 3`
**WHEN** `canAccommodate(existingActive, proposedSlot, 3)` を呼び出す
**THEN** `true` が返る（既存 2 + 提案 1 = 3 ≤ capacity 3）

---

## InMemoryBookingRepository — 追加カバレッジ

### TC-044: 複数の Booking を save し list が全件返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-10

**GIVEN** 空の `InMemoryBookingRepository` に 3 件の異なる `Booking` を `save` している
**WHEN** `list()` を呼び出す
**THEN** 保存した 3 件全てを含む配列が返り、件数が 3 である

---

## BookingRepository port — インターフェース検証

### TC-045: BookingRepository interface が 4 メソッドを持つ

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-08 Acceptance Criteria

**GIVEN** `@koma/scheduling` の `BookingRepository` 型定義
**WHEN** TypeScript の型チェック（`pnpm -F @koma/scheduling run check-types`）を実行する
**THEN** `save` / `findById` / `list` / `findActiveByResource` の 4 メソッドが全て定義されており、型エラーが発生しない

---

## BookingStatus — terminal 状態の追加網羅

### TC-046: terminal 状態 completed・no-show からの遷移も全て拒否される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-05 Acceptance Criteria

**GIVEN** `status: 'completed'` の `Booking` と `status: 'no-show'` の `Booking` をそれぞれ用意する
**WHEN** 各 Booking に対して `transitionBooking(booking, 'pending')` を呼び出す
**THEN** どちらの呼び出しも例外が送出される（TC-008 の `cancelled` ケースを `completed` / `no-show` で補完）

---

## 全体統合検証

### TC-047: pnpm -r check-types && pnpm -r test が green（回帰なし）

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-12 Acceptance Criteria

**GIVEN** `packages/scheduling` の全実装が完了し、既存パッケージ（crm / resource / catalog / shared）が変更されていない
**WHEN** `pnpm -r --if-present run check-types && pnpm -r --if-present run test` を実行する
**THEN** 全パッケージで exit code が 0 となり、新規・既存の全テストが green である

---

## Result

```yaml
result: completed
total: 47
automated: 42
manual: 5
must: 31
should: 15
could: 1
blocked_reasons: []
```
