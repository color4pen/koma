# Test Cases: resource-availability

## Summary

- **Total**: 46 cases
- **Automated** (unit/integration): 41
- **Manual**: 5
- **Priority**: must: 33, should: 13, could: 0

---

凡例:
- Scenario 由来 TC — Source 参照のみ（GWT 省略）。behavior の正典は spec.md の Scenario。
- 非 Scenario 由来 TC — GWT を記述する。

---

## A. DailyTimeRange 構築

### TC-001: 有効な営業時間帯（9:00–17:00）を構築できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: DailyTimeRange は分 from midnight の半開区間で不変条件を強制する > Scenario: 有効な営業時間帯を構築できる

---

### TC-002: 全日（0:00–24:00）を構築できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: DailyTimeRange は分 from midnight の半開区間で不変条件を強制する > Scenario: 全日の時間帯を構築できる

---

### TC-003: open > close（逆転）のとき構築に失敗する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: DailyTimeRange は分 from midnight の半開区間で不変条件を強制する > Scenario: open >= close のとき構築に失敗する

---

### TC-004: open と close が同値のとき構築に失敗する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: DailyTimeRange は分 from midnight の半開区間で不変条件を強制する > Scenario: open と close が同値のとき構築に失敗する

---

### TC-005: open が負値（-1）のとき構築に失敗する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: DailyTimeRange は分 from midnight の半開区間で不変条件を強制する > Scenario: 範囲外の値で構築に失敗する

---

### TC-006: close が 1440 を超えると構築に失敗する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: DailyTimeRange は分 from midnight の半開区間で不変条件を強制する > Scenario: close が 1440 を超えると構築に失敗する

---

### TC-007: 非整数で構築に失敗する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: DailyTimeRange は分 from midnight の半開区間で不変条件を強制する > Scenario: 非整数で構築に失敗する

---

### TC-008: 返却値が Object.freeze されている

**Category**: unit
**Priority**: must
**Source**: tasks.md §T-01

**GIVEN** `createDailyTimeRange(540, 1020)` を呼び出して返却値 `dtr` を得る
**WHEN** `Object.isFrozen(dtr)` を評価する
**THEN** `true` が返る

---

### TC-009: 最小非ゼロ範囲（0:00–1:00）を構築できる

**Category**: unit
**Priority**: should
**Source**: tasks.md §T-02

**GIVEN** `open: 0`, `close: 60`
**WHEN** `createDailyTimeRange(0, 60)` を呼び出す
**THEN** `DailyTimeRange` が返り、`open` は `0`、`close` は `60`

---

## B. DailyTimeRange overlap 判定

### TC-010: 重なる時間帯は overlap と判定される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: DailyTimeRange の overlap 判定は半開区間で行う > Scenario: 重なる時間帯は overlap と判定される

---

### TC-011: 隣接する時間帯は overlap しない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: DailyTimeRange の overlap 判定は半開区間で行う > Scenario: 隣接する時間帯は overlap しない

---

### TC-012: 離れた時間帯は overlap しない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: DailyTimeRange の overlap 判定は半開区間で行う > Scenario: 離れた時間帯は overlap しない

---

## C. DailyTimeRange 等値判定

### TC-013: 同値の DailyTimeRange は等値と判定される

**Category**: unit
**Priority**: should
**Source**: tasks.md §T-02

**GIVEN** `a = createDailyTimeRange(540, 1020)`, `b = createDailyTimeRange(540, 1020)`（同じ値で別インスタンス）
**WHEN** `isEqualDailyTimeRange(a, b)` を呼び出す
**THEN** `true` が返る

---

### TC-014: 異なる DailyTimeRange は等値でないと判定される

**Category**: unit
**Priority**: should
**Source**: tasks.md §T-02

**GIVEN** `a = createDailyTimeRange(540, 1020)`, `b = createDailyTimeRange(540, 900)`（close が異なる）
**WHEN** `isEqualDailyTimeRange(a, b)` を呼び出す
**THEN** `false` が返る

---

## D. Availability 構築

### TC-015: overlap のない複数時間帯で Availability を構築できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Availability は overlap する DailyTimeRange の組み合わせを拒否する > Scenario: overlap のない複数時間帯で構築できる

---

### TC-016: 隣接する時間帯で Availability を構築できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Availability は overlap する DailyTimeRange の組み合わせを拒否する > Scenario: 隣接する時間帯で構築できる

---

### TC-017: 同一曜日内で overlap すると構築に失敗する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Availability は overlap する DailyTimeRange の組み合わせを拒否する > Scenario: 同一曜日内で overlap すると構築に失敗する

---

### TC-018: 同一例外日内で overlap すると構築に失敗する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Availability は overlap する DailyTimeRange の組み合わせを拒否する > Scenario: 同一例外日内で overlap すると構築に失敗する

---

### TC-019: 例外日に空配列を設定できる（休業表現）

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Availability の例外日に空配列を設定することで休業を表現する > Scenario: 例外日に空配列を設定できる

---

### TC-020: weeklyHours / exceptions を両方省略して構築できる

**Category**: unit
**Priority**: should
**Source**: tasks.md §T-05

**GIVEN** 引数として `{}` を渡す
**WHEN** `createAvailability({})` を呼び出す
**THEN** `Availability` が正常に構築される（エラーなし）

---

### TC-021: 全曜日未指定（weeklyHours: {}）で構築できる

**Category**: unit
**Priority**: should
**Source**: tasks.md §T-05

**GIVEN** `weeklyHours: {}`, `exceptions: {}` を渡す
**WHEN** `createAvailability({ weeklyHours: {}, exceptions: {} })` を呼び出す
**THEN** `Availability` が正常に構築される

---

### TC-022: 月–金 週次稼働（9:00–17:00）を構築できる

**Category**: unit
**Priority**: should
**Source**: tasks.md §T-05

**GIVEN** `weeklyHours` に曜日 `1`〜`5`（月〜金）それぞれ `[createDailyTimeRange(540, 1020)]` を設定した引数
**WHEN** `createAvailability({ weeklyHours: { 1: [...], 2: [...], 3: [...], 4: [...], 5: [...] } })` を呼び出す
**THEN** `Availability` が正常に構築される

---

### TC-023: 1 日に複数の時間帯（午前 + 午後）を設定できる

**Category**: unit
**Priority**: should
**Source**: tasks.md §T-05

**GIVEN** 月曜（`1`）に `[createDailyTimeRange(540, 720), createDailyTimeRange(780, 1020)]` を設定した weeklyHours
**WHEN** `createAvailability({ weeklyHours: { 1: [dtr1, dtr2] } })` を呼び出す
**THEN** `Availability` が正常に構築される（2 時間帯は overlap なし）

---

### TC-024: 例外日に特別営業時間を設定できる

**Category**: unit
**Priority**: should
**Source**: tasks.md §T-05

**GIVEN** `exceptions` に `'2026-12-31': [createDailyTimeRange(600, 900)]` を設定した引数
**WHEN** `createAvailability({ exceptions: { '2026-12-31': [dtr] } })` を呼び出す
**THEN** `Availability` が正常に構築される

---

## E. dailyHoursOn — 例外優先

### TC-025: 例外日は例外の時間帯を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: dailyHoursOn は例外日を週次稼働より優先して返す > Scenario: 例外日は例外の時間帯を返す

---

### TC-026: 例外日が空配列なら休業（[] を返す）

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: dailyHoursOn は例外日を週次稼働より優先して返す > Scenario: 例外日が空配列なら休業

---

### TC-027: 例外なしの日は曜日の週次稼働を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: dailyHoursOn は例外日を週次稼働より優先して返す > Scenario: 例外なしの日は曜日の週次稼働を返す

---

### TC-028: 週次稼働が未設定の曜日は空配列を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: dailyHoursOn は例外日を週次稼働より優先して返す > Scenario: 週次稼働が未設定の曜日は空配列を返す

---

## F. dailyHoursOn — 曜日導出

### TC-029: 2026-06-14 は日曜日（Weekday 0）として導出される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: dailyHoursOn の曜日導出はカレンダー日付から決定的である > Scenario: 2026-06-14 は日曜日として導出される

---

### TC-030: 2026-06-15 は月曜日（Weekday 1）として導出される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: dailyHoursOn の曜日導出はカレンダー日付から決定的である > Scenario: 2026-06-15 は月曜日として導出される

---

### TC-031: 2026-06-20 は土曜日（Weekday 6）として導出される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: dailyHoursOn の曜日導出はカレンダー日付から決定的である > Scenario: 2026-06-20 は土曜日として導出される

---

### TC-032: 2026-06-16 は火曜日（Weekday 2）として導出される

**Category**: unit
**Priority**: must
**Source**: tasks.md §T-04, §T-05

**GIVEN** 火曜（`2`）に `[createDailyTimeRange(540, 1020)]` を設定した `Availability`
**WHEN** `dailyHoursOn(availability, '2026-06-16')` を呼び出す
**THEN** `[{ open: 540, close: 1020 }]` が返る（火曜 = Weekday 2）

---

### TC-033: 2026-06-17 は水曜日（Weekday 3）として導出される

**Category**: unit
**Priority**: should
**Source**: tasks.md §T-05

**GIVEN** 水曜（`3`）に `[createDailyTimeRange(540, 1020)]` を設定した `Availability`
**WHEN** `dailyHoursOn(availability, '2026-06-17')` を呼び出す
**THEN** `[{ open: 540, close: 1020 }]` が返る（水曜 = Weekday 3）

---

### TC-034: 2026-06-18 は木曜日（Weekday 4）として導出される

**Category**: unit
**Priority**: should
**Source**: tasks.md §T-05

**GIVEN** 木曜（`4`）に `[createDailyTimeRange(540, 1020)]` を設定した `Availability`
**WHEN** `dailyHoursOn(availability, '2026-06-18')` を呼び出す
**THEN** `[{ open: 540, close: 1020 }]` が返る（木曜 = Weekday 4）

---

### TC-035: 2026-06-19 は金曜日（Weekday 5）として導出される

**Category**: unit
**Priority**: should
**Source**: tasks.md §T-05

**GIVEN** 金曜（`5`）に `[createDailyTimeRange(540, 1020)]` を設定した `Availability`
**WHEN** `dailyHoursOn(availability, '2026-06-19')` を呼び出す
**THEN** `[{ open: 540, close: 1020 }]` が返る（金曜 = Weekday 5）

---

### TC-036: 不正な日付文字列で例外が送出される

**Category**: unit
**Priority**: must
**Source**: tasks.md §T-04, design.md §Risks

**GIVEN** 任意の `Availability` と不正な日付文字列 `'not-a-date'`
**WHEN** `dailyHoursOn(availability, 'not-a-date')` を呼び出す
**THEN** 例外が送出される（`getUTCDay()` が `NaN` を返す不正入力）

---

## G. dailyHoursOn — 純関数性

### TC-037: 同一入力で同一出力を返す（参照ではなく値として等価）

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: dailyHoursOn は純関数である > Scenario: 同一入力で同一出力を返す

---

## H. パブリック API export

### TC-038: DailyTimeRange 型・関数が src/index.ts から import 可能

**Category**: integration
**Priority**: must
**Source**: tasks.md §T-01, §T-06

**GIVEN** `packages/resource/src/index.ts` の最終実装
**WHEN** `import { DailyTimeRange, createDailyTimeRange, dailyTimeRangeOverlaps, isEqualDailyTimeRange } from '@koma/resource'` を型チェックする
**THEN** コンパイルエラーなし（`pnpm -F @koma/resource run check-types` が green）

---

### TC-039: Weekday 型・Availability 型・createAvailability が src/index.ts から import 可能

**Category**: integration
**Priority**: must
**Source**: tasks.md §T-03, §T-06

**GIVEN** `packages/resource/src/index.ts` の最終実装
**WHEN** `import { Weekday, Availability, createAvailability } from '@koma/resource'` を型チェックする
**THEN** コンパイルエラーなし（`pnpm -F @koma/resource run check-types` が green）

---

### TC-040: dailyHoursOn が src/index.ts から import 可能

**Category**: integration
**Priority**: must
**Source**: tasks.md §T-04, §T-06

**GIVEN** `packages/resource/src/index.ts` の最終実装
**WHEN** `import { dailyHoursOn } from '@koma/resource'` を型チェックする
**THEN** コンパイルエラーなし（`pnpm -F @koma/resource run check-types` が green）

---

### TC-041: isEqualDailyTimeRange が src/index.ts から import 可能

**Category**: integration
**Priority**: should
**Source**: tasks.md §T-01, §T-06

**GIVEN** `packages/resource/src/index.ts` の最終実装
**WHEN** `import { isEqualDailyTimeRange } from '@koma/resource'` を型チェックする
**THEN** コンパイルエラーなし（`pnpm -F @koma/resource run check-types` が green）

---

## I. 依存制約・ビルド健全性

### TC-042: package.json に禁止依存が追加されていない

**Category**: manual
**Priority**: must
**Source**: tasks.md §T-06, request.md §受け入れ基準

**GIVEN** `packages/resource/package.json` の最終状態
**WHEN** `grep -E '"(next|react|drizzle-orm|zod)"' packages/resource/package.json` を実行する
**THEN** マッチが 0 件（コマンドが exit code 1 で終了、または出力が空）

---

### TC-043: pnpm -F @koma/resource run check-types が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md §T-06

**GIVEN** `packages/resource` の最終実装
**WHEN** `pnpm -F @koma/resource run check-types` を実行する
**THEN** exit code 0（型エラーなし）

---

### TC-044: pnpm -F @koma/resource run test が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md §T-06

**GIVEN** `packages/resource` の最終実装（vitest テストファイル含む）
**WHEN** `pnpm -F @koma/resource run test` を実行する
**THEN** exit code 0（全テスト green）

---

### TC-045: pnpm -F @koma/resource run lint が成功する

**Category**: manual
**Priority**: should
**Source**: tasks.md §T-06

**GIVEN** `packages/resource` の最終実装
**WHEN** `pnpm -F @koma/resource run lint` を実行する
**THEN** exit code 0（lint エラーなし）

---

### TC-046: pnpm -r --if-present run check-types && test が全パッケージで成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md §T-06, request.md §受け入れ基準

**GIVEN** リポジトリ全体の最終実装
**WHEN** `pnpm -r --if-present run check-types && pnpm -r --if-present run test` を実行する
**THEN** exit code 0（全パッケージの型チェック・テストが green）

---

## Result

```yaml
result: completed
total: 46
automated: 41
manual: 5
must: 33
should: 13
could: 0
blocked_reasons: []
```
