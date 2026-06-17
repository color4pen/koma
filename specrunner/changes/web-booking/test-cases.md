# Test Cases: apps/web に予約作成フローを追加する（capacity-aware 二重予約防止・コンテキスト横断 use-case）

## Summary

- **Total**: 26 cases
- **Automated** (unit/integration): 21
- **Manual**: 5
- **Priority**: must: 17, should: 9, could: 0

---

## parseBookingInput

### TC-001: 有効な入力で予約パラメータが返る

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseBookingInput は有効な入力から予約パラメータを抽出する > Scenario: 有効な入力で予約パラメータが返る

### TC-002: customerId が空文字で失敗する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseBookingInput は有効な入力から予約パラメータを抽出する > Scenario: customerId が空文字で失敗する

### TC-003: serviceId が空文字で失敗する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseBookingInput は有効な入力から予約パラメータを抽出する > Scenario: serviceId が空文字で失敗する

### TC-004: resourceId が空文字で失敗する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseBookingInput は有効な入力から予約パラメータを抽出する > Scenario: resourceId が空文字で失敗する

### TC-005: startAt が不正な文字列で失敗する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseBookingInput は有効な入力から予約パラメータを抽出する > Scenario: startAt が不正な文字列で失敗する

### TC-006: startAt が空文字で失敗する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseBookingInput は有効な入力から予約パラメータを抽出する > Scenario: startAt が空文字で失敗する

### TC-021: null 入力で ok: false を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04 Acceptance Criteria

**GIVEN** `raw` が `null` である
**WHEN** `parseBookingInput(null)` を呼び出す
**THEN** 戻り値は `{ ok: false }` である

### TC-022: startAt が "abc" で失敗する

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04 Acceptance Criteria

**GIVEN** `raw` が `{ customerId: "c1", serviceId: "s1", resourceId: "r1", startAt: "abc" }` である
**WHEN** `parseBookingInput(raw)` を呼び出す
**THEN** 戻り値は `{ ok: false }` であり、`errors.startAt` が 1 件以上のエラーメッセージを含む

---

## createBookingUseCase

### TC-007: 有効な入力で予約が作成される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: createBookingUseCase は service の duration と resource の capacity を使って予約を作成する > Scenario: 有効な入力で予約が作成される

### TC-008: 存在しない serviceId で service-not-found が返る

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: createBookingUseCase は存在しない service で service-not-found を返す > Scenario: 存在しない serviceId

### TC-009: 存在しない resourceId で resource-not-found が返る

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: createBookingUseCase は存在しない resource で resource-not-found を返す > Scenario: 存在しない resourceId

### TC-010: capacity=1 で同一 Resource・重なる時刻の 2 件目が拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: createBookingUseCase は capacity 超過で no-capacity を返す（二重予約防止） > Scenario: capacity=1 で同一 Resource・重なる時刻の 2 件目が拒否される

### TC-011: capacity=1 で隣接時刻（[a,b)+[b,c)）は許可される

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: createBookingUseCase は capacity 超過で no-capacity を返す（二重予約防止） > Scenario: capacity=1 で隣接時刻（[a,b)+[b,c)）は許可される

### TC-012: capacity=2 で 2 件 ok・3 件目は no-capacity

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: createBookingUseCase は capacity 超過で no-capacity を返す（二重予約防止） > Scenario: capacity=2 で 2 件 ok・3 件目は no-capacity

### TC-013: capacity=2 で 1 件目・2 件目は ok

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: createBookingUseCase は capacity 超過で no-capacity を返す（二重予約防止） > Scenario: capacity=2 で 1 件目・2 件目は ok

---

## createBookingAction

### TC-014: customerId が空でエラーが返り save が呼ばれない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: createBookingAction は parse 失敗時にフィールドエラーを返し save しない > Scenario: customerId が空でエラーが返る

### TC-015: 有効なフォーム送信で予約が保存され revalidatePath が呼ばれる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: createBookingAction は use-case 成功時に save してパスを再検証する > Scenario: 有効なフォーム送信で予約が保存される

### TC-016: capacity 不足時に _form エラーメッセージが返る

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: createBookingAction は use-case 成功時に save してパスを再検証する > Scenario: capacity 不足時にエラーメッセージが返る

### TC-023: service-not-found 時に _form に指定メッセージが返る

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-07 Acceptance Criteria

**GIVEN** `createBookingUseCase` が `{ ok: false, reason: 'service-not-found' }` を返す状況
**WHEN** `createBookingAction` を呼び出す
**THEN** 戻り値は `{ ok: false }` であり、`errors._form` に `'指定されたサービスが見つかりません'` が含まれる

### TC-024: resource-not-found 時に _form に指定メッセージが返る

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-07 Acceptance Criteria

**GIVEN** `createBookingUseCase` が `{ ok: false, reason: 'resource-not-found' }` を返す状況
**WHEN** `createBookingAction` を呼び出す
**THEN** 戻り値は `{ ok: false }` であり、`errors._form` に `'指定されたリソースが見つかりません'` が含まれる

---

## 予約一覧ページ（/bookings）

### TC-017: 予約が 0 件のとき空メッセージと登録フォームを表示

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 予約一覧ページは予約一覧と作成フォームを表示する > Scenario: 予約が 0 件のとき空メッセージと登録フォームを表示

### TC-018: 予約が存在するとき一覧テーブルを表示

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: 予約一覧ページは予約一覧と作成フォームを表示する > Scenario: 予約が存在するとき一覧テーブルを表示

---

## composition root

### TC-019: getBookingRepository は複数回呼び出しで同一インスタンスを返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: composition root は BookingRepository を単一生成する > Scenario: 複数回呼び出しで同一インスタンスを返す

---

## 依存・ビルド・ファイル構造

### TC-020: @koma/scheduling が依存に含まれ drizzle-orm が含まれない

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01 Acceptance Criteria

**GIVEN** `apps/web/package.json` が存在する
**WHEN** `package.json` の `dependencies` を確認する
**THEN** `"@koma/scheduling": "workspace:*"` が存在し、`"drizzle-orm"` が存在しない

### TC-025: 'use server' / 'use client' directive が各ファイルに存在する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-07 Acceptance Criteria, T-09 Acceptance Criteria

**GIVEN** `apps/web/app/bookings/actions.ts` と `apps/web/app/bookings/booking-form.tsx` が存在する
**WHEN** 各ファイルの先頭行を確認する
**THEN** `actions.ts` の先頭に `'use server'` が、`booking-form.tsx` の先頭に `'use client'` が記述されている

### TC-026: pnpm 全体ビルド・型チェック・テストが green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-11 Acceptance Criteria

**GIVEN** すべての実装が完了している
**WHEN** `pnpm -r --if-present run check-types && pnpm -r --if-present run test && pnpm -r --if-present run build` を実行する
**THEN** コマンドがエラーなく完了する（exit code 0）

---

## Result

```yaml
result: completed
total: 26
automated: 21
manual: 5
must: 17
should: 9
could: 0
blocked_reasons: []
```
