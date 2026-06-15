# Code Review Feedback — iteration 001

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
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | MEDIUM | テストカバレッジ | `packages/crm/src/customer.test.ts` | spec.md の Requirement "Customer は immutable に更新される" > Scenario "updateCustomer は id を保持する"（TC-015、must）に対応するテストが存在しない。実装の `updateCustomer` は `id: customer.id` を正しく伝播しており動作は正しいが、このシナリオを regression として固定するテストが欠けており、将来の保守リスクがある。 | `updateCustomer` describe ブロックに `it('id を保持する', () => { const original = createCustomer({ name: '山田 太郎', contact }); const updated = updateCustomer(original, { name: '新しい名前' }); expect(updated.id).toBe(original.id); })` を追加する。 | yes |
| 2 | LOW | テストカバレッジ | `packages/crm/src/customer.test.ts` | TC-018（should: "createCustomer に渡した元配列が呼び出し元で freeze されない"）に対応するテストが存在しない。実装は `Object.freeze([...(params.tags ?? [])])` でコピー後に freeze しており挙動は正しいが、副作用なしのコピーを regression として固定するテストがない。 | `createCustomer` describe ブロックに `it('渡した元配列が呼び出し元で freeze されない', () => { const originalTags = ['常連']; createCustomer({ name: 'テスト', contact, tags: originalTags }); expect(Object.isFrozen(originalTags)).toBe(false); })` を追加する。 | yes |
| 3 | LOW | テストカバレッジ | `packages/crm/src/in-memory-customer-repository.test.ts` | TC-024（must: "CustomerRepository の全メソッドが Promise<T> を返す"）が `await` による暗黙的な検証のみで `instanceof Promise` の明示的アサーションが存在しない。`await` で実質的に保証されているため実害なし（LOW）。 | 既存テストに `expect(repo.save(customer)).toBeInstanceOf(Promise)` 等の明示アサーションを追加するか、TC-024 専用テストを 1 件設ける。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 10 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 6 | 0.10 |

- **total**: 8.85

## Summary

実装の品質は全体的に高く、構造不変条件（B-1〜B-6）・設計判断（D1〜D7）・受け入れ基準の大部分を満たしている。verification（check-types / test 24件 / lint / build）は全パス済み。

最も重大な所見は **F-001（MEDIUM）**： spec.md で明示された must シナリオ "updateCustomer は id を保持する"（TC-015）に対応するテストが `customer.test.ts` に存在しない点。実装コード自体は `id: customer.id` を正しく渡しており動作に誤りはなく、これは品質低下・将来の回帰リスクとして MEDIUM とする。HIGH/CRITICAL 所見はなく verdict は approved。

### 受け入れ基準チェックリスト

| 基準 | 評価 |
|------|------|
| `@koma/crm` の name・禁止依存ゼロ・`@koma/shared` 依存 | ✅ |
| `pnpm -F @koma/crm run check-types` 成功 | ✅ |
| ContactInfo: 両方無いと構築できないことをテストで固定 | ✅ |
| Customer は immutable（テストで固定） | ⚠ TC-015（id保持）が欠如（F-001） |
| `CustomerRepository` interface が save / findById / list を持つ | ✅ |
| in-memory: save→findById / 未保存null / list 全件をテストで固定 | ✅ |
| 各型に vitest テストがある | ✅ |
| `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green | ✅ |

### テストカバレッジ（test-cases.md 対比）

| TC | Priority | カバレッジ |
|----|----------|-----------|
| TC-001〜007 | must/should | ✅ 全件 contact-info.test.ts で pass |
| TC-008〜009 | must | ✅ customer.test.ts |
| TC-010〜012 | should | ✅ customer.test.ts |
| TC-013〜014 | must | ✅ customer.test.ts |
| TC-015 | **must** | ❌ 欠如（F-001） |
| TC-016〜017 | should | ✅ customer.test.ts |
| TC-018 | should | ⚠ 欠如（F-002、LOW） |
| TC-019〜023 | must | ✅ in-memory-customer-repository.test.ts 全件 |
| TC-024 | must | ⚠ 暗黙的のみ（F-003、LOW） |
| TC-025〜029 | must/should | ✅ verification-result.md にて機械検証済み |
| TC-030 | could | — 未テスト（could のため許容） |

