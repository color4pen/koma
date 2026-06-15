# Code Review Feedback — iteration 002

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- iteration line format (exact): `- **iteration**: NNN` (3-digit zero-padded integer)
- Findings table MUST have exactly 7 columns in this order:
  # | Severity | Category | File | Description | How to Fix | Fix
  - Fix column: yes = fixer should address this finding; no = skip (pre-existing / out-of-scope)
- Scores table columns: Category | Score | Weight
  - Valid Category values: correctness | security | architecture | performance | maintainability | testing
  - Score: integer 1-10
  - Weight: decimal as defined below
- total line format (exact): `- **total**: <decimal>`
- Default weights: correctness=0.30, security=0.25, architecture=0.15, performance=0.10, maintainability=0.10, testing=0.10
- Scores table is optional but recommended.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved
- **iteration**: 002

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | LOW | テストカバレッジ | `packages/crm/src/customer.test.ts` | iter 001 の F-002（LOW, fix:yes）持ち越し。TC-018（should: "createCustomer に渡した元配列が呼び出し元で freeze されない"）が未追加。実装は `Object.freeze([...(params.tags ?? [])])` でコピー後 freeze しており挙動は正しいが、副作用なしのコピーを regression として固定するテストが引き続き欠如している。 | `createCustomer` describe ブロックに `it('渡した元配列が呼び出し元で freeze されない', () => { const originalTags = ['常連']; createCustomer({ name: 'テスト', contact, tags: originalTags }); expect(Object.isFrozen(originalTags)).toBe(false); })` を追加する。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 10 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 8.95

## Summary

iter 001 の唯一の MEDIUM 所見（F-001: TC-015「updateCustomer は id を保持する」テスト欠如）が iter 002 で修正された。`customer.test.ts` に `it('id を保持する（TC-015）', ...)` が追加され、テスト総数は 24 → 25 件になっている。check-types / test（25件）/ lint / build はすべて green。

残存所見は LOW 1 件（TC-018、carryover from F-002）のみ。実装コードの正確性に問題はなく、verdict は `approved`。

### iter 001 所見対応状況

| 前回 # | 前回 Severity | Fix | 対応状況 |
|--------|---------------|-----|---------|
| F-001 | MEDIUM | yes | ✅ 修正済み（TC-015 テスト追加） |
| F-002 | LOW | yes | ❌ 未修正（今回 F-001 として持ち越し） |
| F-003 | LOW | no | — 対応不要のため評価対象外 |

### 受け入れ基準チェックリスト

| 基準 | 評価 |
|------|------|
| `@koma/crm` の name・禁止依存ゼロ・`@koma/shared` 依存 | ✅ |
| `pnpm -F @koma/crm run check-types` 成功 | ✅ |
| ContactInfo: 両方無いと構築できないことをテストで固定 | ✅ |
| Customer は immutable（テストで固定） | ✅（TC-015 id 保持テストが追加され全件カバー） |
| `CustomerRepository` interface が save / findById / list を持つ | ✅ |
| in-memory: save→findById / 未保存null / list 全件をテストで固定 | ✅ |
| 各型に vitest テストがある | ✅ |
| `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green | ✅（25件パス） |

### テストカバレッジ（test-cases.md 対比）

| TC | Priority | カバレッジ |
|----|----------|-----------|
| TC-001〜007 | must/should | ✅ contact-info.test.ts（7件）|
| TC-008〜009 | must | ✅ customer.test.ts |
| TC-010〜012 | should | ✅ customer.test.ts |
| TC-013〜015 | must | ✅ customer.test.ts（TC-015 今回追加）|
| TC-016〜017 | should | ✅ customer.test.ts |
| TC-018 | should | ⚠ 欠如（F-001、LOW）|
| TC-019〜023 | must | ✅ in-memory-customer-repository.test.ts（6件）|
| TC-024 | must | ⚠ 暗黙的のみ（前回 F-003 fix:no、引き続き評価対象外）|
| TC-025〜029 | must/should | ✅ verification-result にて機械検証済み |
| TC-030 | could | — 未テスト（could のため許容）|
