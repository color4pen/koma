# Test Cases: db-booking

## Summary

- **Total**: 14 cases
- **Automated** (unit/integration): 11
- **Manual**: 3
- **Priority**: must: 11, should: 3, could: 0

---

### TC-001: save → findById で slot と status が往復する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: DrizzleBookingRepository SHALL persist and restore Booking with slot and status fidelity > Scenario: save した Booking を findById で slot と status が一致した状態で取得できる

---

### TC-002: 2026 年以降の epoch ms を slot に設定しても値が欠損しない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: DrizzleBookingRepository SHALL persist and restore Booking with slot and status fidelity > Scenario: 2026 年の epoch ms を slot に設定しても値が欠損しない

---

### TC-003: 未保存の id で findById すると null が返る

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: findById SHALL return null for non-existent Booking > Scenario: 未保存の id で findById すると null が返る

---

### TC-004: 同一 id で再 save すると既存データが更新される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: save SHALL upsert on same id > Scenario: 同一 id で再 save すると既存データが更新される

---

### TC-005: 複数 Booking を save し list で全件取得できる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: list SHALL return all saved Bookings > Scenario: 複数 Booking を save し list で全件取得できる

---

### TC-006: findActiveByResource が active のみ返し terminal を除外する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: findActiveByResource SHALL return only active Bookings for the specified resource > Scenario: active な予約のみ返し terminal を除外する

---

### TC-007: findActiveByResource が別 resource の Booking を含まない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: findActiveByResource SHALL return only active Bookings for the specified resource > Scenario: 別 resource の Booking は含まない

---

### TC-008: confirmed 状態の Booking が restoreBooking 経由で正しく復元される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: Row-to-Booking reconstruction SHALL use restoreBooking > Scenario: confirmed 状態の Booking が restoreBooking 経由で正しく復元される

---

### TC-009: @koma/scheduling 依存の存在と不要依存の不在

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `packages/db/package.json` が存在する  
**WHEN** `grep "@koma/scheduling" packages/db/package.json` と `grep -E '"(next|react|zod)"' packages/db/package.json` を実行する  
**THEN** 前者はマッチあり（`"@koma/scheduling": "workspace:*"` が `dependencies` に存在）、後者は 0 件

---

### TC-010: bookings schema の start_millis / end_millis が bigint 型で定義されている

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-02 / design.md > D1

**GIVEN** `packages/db/src/schema/booking.ts` が存在する  
**WHEN** ファイルを参照して `start_millis` / `end_millis` のカラム定義を確認する  
**THEN** 両カラムが `bigint('...', { mode: 'number' })` で定義されており、`integer` ではない

---

### TC-011: pnpm check-types が成功し DrizzleBookingRepository が型を満たす

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-03 / T-06

**GIVEN** `packages/db` 配下に schema・repository・index の実装が揃っている  
**WHEN** `pnpm -F @koma/db run check-types` を実行する  
**THEN** 型エラーなく成功し、`DrizzleBookingRepository` が `BookingRepository`（`save` / `findById` / `list` / `findActiveByResource`）を満たしていることが確認できる

---

### TC-012: src/index.ts から createDrizzleBookingRepository と bookings が export される

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** `packages/db/src/index.ts` に `createDrizzleBookingRepository` と `bookings` の export が追加されている  
**WHEN** `@koma/db` から両シンボルを import するコードをコンパイルする  
**THEN** import が成功し、`createDrizzleBookingRepository` と `bookings` が定義済みシンボルとして利用できる

---

### TC-013: pglite テストが beforeEach / afterEach で隔離されている

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** `drizzle-booking-repository.test.ts` に pglite テストが実装されている  
**WHEN** テストスイートを実行し、各テストの実行順・データ持ち越しを確認する  
**THEN** `beforeEach` で新規 `PGlite` インスタンスが生成され、`afterEach` で `pglite.close()` が呼ばれており、テスト間で DB 状態が持ち越されない

---

### TC-014: 既存リポジトリテストに regression がない

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** db-booking の実装が追加された状態の `packages/db` が存在する  
**WHEN** `pnpm -r --if-present run test` を実行する  
**THEN** `DrizzleCustomerRepository` / `DrizzleResourceRepository` / `DrizzleServiceRepository` の既存テストがすべて pass する

---

## Result

```yaml
result: completed
total: 14
automated: 11
manual: 3
must: 11
should: 3
could: 0
blocked_reasons: []
```
