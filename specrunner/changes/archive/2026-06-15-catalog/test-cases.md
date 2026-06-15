# Test Cases: packages/catalog — Service 集約と ServiceRepository port

## Summary

- **Total**: 20 cases
- **Automated** (unit/integration): 15
- **Manual**: 5
- **Priority**: must: 12, should: 8, could: 0

---

### TC-001: duration が 0 ミリ秒のとき構築に失敗する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Service の所要時間（duration）は正でなければならない > Scenario: duration が 0 ミリ秒のとき構築に失敗する

---

### TC-002: duration が正のとき構築に成功する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Service の所要時間（duration）は正でなければならない > Scenario: duration が正のとき構築に成功する

---

### TC-003: price が負のとき構築に失敗する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Service の料金（price）は非負でなければならない > Scenario: price が負のとき構築に失敗する

---

### TC-004: price が 0 のとき構築に成功する（無料メニュー許容）

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: Service の料金（price）は非負でなければならない > Scenario: price が 0 のとき構築に成功する

---

### TC-005: name を更新したとき元インスタンスは変更されない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Service の更新は immutable でなければならない > Scenario: name を更新したとき元インスタンスは変更されない

---

### TC-006: 更新時に不正な duration を渡すと失敗する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Service の更新は immutable でなければならない > Scenario: 更新時に不正な duration を渡すと失敗する

---

### TC-007: save した Service を findById で取得できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: InMemoryServiceRepository は Repository 契約を満たさなければならない > Scenario: save した Service を findById で取得できる

---

### TC-008: 未保存の id で findById すると null が返る

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: InMemoryServiceRepository は Repository 契約を満たさなければならない > Scenario: 未保存の id で findById すると null が返る

---

### TC-009: list が保存分を全件返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: InMemoryServiceRepository は Repository 契約を満たさなければならない > Scenario: list が保存分を全件返す

---

### TC-010: 同一 id で save を 2 回呼ぶと上書きされる（upsert セマンティクス）

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: InMemoryServiceRepository は Repository 契約を満たさなければならない > Scenario: 同一 id で save を 2 回呼ぶと上書きされる

---

### TC-011: id 省略時に createService が id を自動生成する

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02

**GIVEN** `name` / `duration`（正）/ `price`（非負）のみを指定し `id` を省略した引数
**WHEN** `createService` を呼ぶ
**THEN** 返却された Service の `id` が空でない文字列であり、呼び出し側で指定した値ではない

---

### TC-012: resourceKinds 省略時に空配列が設定される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02

**GIVEN** `resourceKinds` を指定しない引数（name / duration / price のみ）
**WHEN** `createService` を呼ぶ
**THEN** 返却された Service の `resourceKinds` が `[]`（空配列）である

---

### TC-013: createService の返却値が Object.freeze されている

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02

**GIVEN** 有効な引数（duration 正・price 非負）
**WHEN** `createService` を呼ぶ
**THEN** `Object.isFrozen(service)` が `true` を返す

---

### TC-014: updateService で price を負の値に変更しようとすると例外が投げられる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03

**GIVEN** 正常に構築済みの Service
**WHEN** `updateService` で `price` を `createMoney(-1, 'JPY')` に変更しようとする
**THEN** 例外が投げられ、元の Service インスタンスは変更されない

---

### TC-015: list が空のとき空配列を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-06

**GIVEN** 空の `InMemoryServiceRepository`（何も save していない状態）
**WHEN** `list()` を呼ぶ
**THEN** `[]`（空配列）が返る

---

### TC-016: package.json の構成が要件を満たしている

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `packages/catalog/package.json` が存在する
**WHEN** `name` / `dependencies` / `devDependencies` の各フィールドを確認する
**THEN** `name` が `@koma/catalog`、`dependencies` に `@koma/shared: "workspace:*"` がある、`next` / `react` / `drizzle-orm` / `zod` のいずれも含まない

---

### TC-017: scripts に check-types / test / lint が定義されている

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-01

**GIVEN** `packages/catalog/package.json` が存在する
**WHEN** `scripts` フィールドを確認する
**THEN** `check-types` / `test` / `lint` の 3 スクリプトがすべて定義されている

---

### TC-018: @koma/catalog から必要な全シンボルが export されている

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** `packages/catalog/src/index.ts` が実装済み
**WHEN** `index.ts` の export 一覧を確認する
**THEN** `Service`（type）/ `ServiceRepository`（type）/ `createService` / `updateService` / `createInMemoryServiceRepository` がすべて export されている

---

### TC-019: pnpm -F @koma/catalog run check-types が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** `packages/catalog` のソースが実装済みで `pnpm install` が完了している
**WHEN** `pnpm -F @koma/catalog run check-types` を実行する
**THEN** exit code 0 で完了する

---

### TC-020: workspace 全体の check-types && test が green（既存パッケージ含む）

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** `pnpm install` が完了した workspace（shared / resource / crm / catalog）
**WHEN** `pnpm -r --if-present run check-types && pnpm -r --if-present run test` を実行する
**THEN** 全パッケージが exit code 0 で完了し、既存パッケージ（shared / resource / crm）のテスト結果に影響がない

---

## Result

```yaml
result: completed
total: 20
automated: 15
manual: 5
must: 12
should: 8
could: 0
blocked_reasons: []
```
