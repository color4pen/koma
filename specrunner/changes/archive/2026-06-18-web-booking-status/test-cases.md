# Test Cases: web-booking-status

## Summary

- **Total**: 14 cases
- **Automated** (unit/integration): 8
- **Manual**: 6
- **Priority**: must: 10, should: 3, could: 1

---

### TC-001: allowedTransitions — pending の許可遷移

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: allowedTransitions は ALLOWED_TRANSITIONS から許可遷移先の配列を返す > Scenario: pending の許可遷移

---

### TC-002: allowedTransitions — confirmed の許可遷移

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: allowedTransitions は ALLOWED_TRANSITIONS から許可遷移先の配列を返す > Scenario: confirmed の許可遷移

---

### TC-003: allowedTransitions — terminal 状態の許可遷移は空

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: allowedTransitions は ALLOWED_TRANSITIONS から許可遷移先の配列を返す > Scenario: terminal 状態の許可遷移は空

---

### TC-004: transitionLabel — 各ステータスのラベル

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: transitionLabel は BookingStatus に対応する日本語ラベルを返す > Scenario: 各ステータスのラベル

---

### TC-005: transitionBookingAction — 許可遷移で status が更新される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: transitionBookingAction は許可遷移で予約の status を更新する > Scenario: 許可遷移で status が更新される

---

### TC-006: transitionBookingAction — 不正遷移でエラーを返し save しない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: transitionBookingAction は許可遷移で予約の status を更新する > Scenario: 不正遷移でエラーを返し save しない

---

### TC-007: transitionBookingAction — 存在しない bookingId でエラーを返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: transitionBookingAction は許可遷移で予約の status を更新する > Scenario: 存在しない bookingId でエラーを返す

---

### TC-008: UI — pending の予約に確定・キャンセルボタンが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 予約一覧は許可された遷移操作のみをボタンとして表示する > Scenario: pending の予約に確定・キャンセルボタンが表示される

---

### TC-009: UI — confirmed の予約にキャンセル・完了・来店なしボタンが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 予約一覧は許可された遷移操作のみをボタンとして表示する > Scenario: confirmed の予約にキャンセル・完了・来店なしボタンが表示される

---

### TC-010: UI — terminal な予約には操作ボタンが表示されない

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 予約一覧は許可された遷移操作のみをボタンとして表示する > Scenario: terminal な予約には操作ボタンが表示されない

---

### TC-011: transitionBookingAction — 成功時に revalidatePath('/bookings') が呼ばれる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** status が `pending` の予約が存在し、`revalidatePath` が mock されている
**WHEN** `transitionBookingAction(bookingId, 'confirmed')` を呼ぶ
**THEN** `revalidatePath('/bookings')` が 1 回呼ばれる

---

### TC-012: BookingStatusActions — 送信中にボタンが disabled になる

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-05

**GIVEN** status が `pending` の予約一覧が表示されており、「確定」ボタンが有効状態である
**WHEN** 「確定」ボタンをクリックして遷移処理が進行中である
**THEN** 全ての操作ボタンが `disabled` 状態になり、追加クリックが受け付けられない

---

### TC-013: page.tsx — ステータス列が transitionLabel で日本語表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** `pending` / `confirmed` / `cancelled` / `completed` / `no-show` 各ステータスの予約が一覧に含まれている
**WHEN** `/bookings` ページを開く
**THEN** ステータス列に `transitionLabel` が返す日本語ラベル（`pending` → `'保留'`、`confirmed` → `'確定'`、`cancelled` → `'キャンセル'`、`completed` → `'完了'`、`no-show` → `'来店なし'`）が表示される

---

### TC-014: 全体検証 — check-types・test・build が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** 全タスクの実装が完了した状態
**WHEN** `pnpm -r --if-present run check-types && pnpm -r --if-present run test && pnpm -r --if-present run build` を実行する
**THEN** すべてのコマンドが exit code 0 で終了する

---

## Result

```yaml
result: completed
total: 14
automated: 8
manual: 6
must: 10
should: 3
could: 1
blocked_reasons: []
```
