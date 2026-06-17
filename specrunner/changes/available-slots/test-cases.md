# Test Cases: packages/scheduling — availableSlots 純関数

## Summary

- **Total**: 16 cases
- **Automated** (unit/integration): 13
- **Manual**: 3
- **Priority**: must: 11, should: 5, could: 0

---

### TC-001: capacity=1 で重なる予約がない場合、全候補枠が返る

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: availableSlots は開窓内で capacity に空きがある枠のみを返す > Scenario: capacity=1 で重なる予約がない場合、全候補枠が返る

---

### TC-002: capacity=1 で全枠が塞がっている場合、空配列が返る

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: availableSlots は開窓内で capacity に空きがある枠のみを返す > Scenario: capacity=1 で全枠が塞がっている場合、空配列が返る

---

### TC-003: capacity=1 で一部の枠のみ重なる場合、空きのある枠だけが返る

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: availableSlots は開窓内で capacity に空きがある枠のみを返す > Scenario: capacity=1 で一部の枠のみ重なる場合、空きのある枠だけが返る

---

### TC-004: step 省略（既定 = duration）で back-to-back の連続枠が出る

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: step 既定値は duration であり、step 指定で候補粒度が変わる > Scenario: step 省略（既定 = duration）で back-to-back の連続枠が出る

---

### TC-005: step = 30 で 60 分枠を 30 分刻みに候補生成する

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: step 既定値は duration であり、step 指定で候補粒度が変わる > Scenario: step = 30 で 60 分枠を 30 分刻みに候補生成する

---

### TC-006: duration が窓の残り幅を超える候補は生成されない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 窓に収まらない末尾候補は出力しない > Scenario: duration が窓の残り幅を超える候補は生成されない

---

### TC-007: 開窓の幅が duration 未満なら空配列が返る

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: 窓に収まらない末尾候補は出力しない > Scenario: 開窓の幅が duration 未満なら空配列が返る

---

### TC-008: 2 つの開窓の間にギャップがある場合、ギャップを跨ぐ枠は生成されない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 1 枠は単一開窓内に収まり、開窓をまたがない > Scenario: 2 つの開窓の間にギャップがある場合、ギャップを跨ぐ枠は生成されない

---

### TC-009: capacity=2 で 1 件重なる時間帯の枠も予約可能として返る

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: capacity-aware で canAccommodate 経由の判定を行う > Scenario: capacity=2 で 1 件重なる時間帯の枠も予約可能として返る

---

### TC-010: capacity=2 で 2 件重なる時間帯の枠は返らない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: capacity-aware で canAccommodate 経由の判定を行う > Scenario: capacity=2 で 2 件重なる時間帯の枠は返らない

---

### TC-011: 逆順で渡された開窓でも出力は start 昇順

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: 出力は開始時刻の昇順である > Scenario: 逆順で渡された開窓でも出力は start 昇順

---

### TC-012: 同一入力で 2 回呼び出すと同一出力が返る

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: availableSlots は純関数である > Scenario: 同一入力で 2 回呼び出すと同一出力が返る

---

### TC-013: index.ts から availableSlots が import できる

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: availableSlots は `@koma/scheduling` の `src/index.ts` から export される > Scenario: index.ts から availableSlots が import できる

---

### TC-014: 空の開窓リスト（openWindows = []）で空配列が返る

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03: `availableSlots` のテスト（テストケース — 既存予約なしで空の開窓リスト）

**GIVEN** `openWindows = []` / `duration = { milliseconds: 60 }` / `existingActive = []` / `capacity = 1`
**WHEN** `availableSlots` を呼び出す
**THEN** 空配列 `[]` が返る

---

### TC-015: 禁止依存が scheduling/package.json に含まれない

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-04: 全体検証（禁止依存チェック）

**GIVEN** `packages/scheduling/package.json` が存在する
**WHEN** `grep -E '"(next|react|drizzle-orm|zod)"' packages/scheduling/package.json` を実行する
**THEN** マッチが 0 件（終了コード 1）で返る

---

### TC-016: pnpm -r check-types && pnpm -r test が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-04: 全体検証（CI ゲート）

**GIVEN** T-01 / T-02 / T-03 の実装がすべて完了している
**WHEN** `pnpm -r --if-present run check-types && pnpm -r --if-present run test` を実行する
**THEN** 全コマンドが終了コード 0 で完了し、他パッケージへの影響がない

---

## Result

```yaml
result: completed
total: 16
automated: 13
manual: 3
must: 11
should: 5
could: 0
blocked_reasons: []
```
