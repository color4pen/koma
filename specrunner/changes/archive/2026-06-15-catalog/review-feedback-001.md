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
| 1 | low | correctness | `packages/catalog/src/service.ts` | `resourceKinds` 配列を防御的コピー・freeze せずに直接保持している。`createService` の実装は `resourceKinds: params.resourceKinds ?? []` と渡された配列をそのまま格納するため、呼び出し元が元配列への参照を保持していれば実行時に `service.resourceKinds` の内容が変更されうる。兄弟パッケージ `crm` の `Customer.tags` は `Object.freeze([...(params.tags ?? [])])` でコピー＋freeze して同問題を防いでいる。TypeScript の `readonly string[]` はコンパイル時のみ有効であり、実行時 mutation（例: `(service.resourceKinds as string[]).push('new')`）は防げない。 | `createService` 内で `resourceKinds: Object.freeze([...(params.resourceKinds ?? [])])` とコピー後に freeze する。crm の `Customer.tags` パターンを踏襲する。 | yes |
| 2 | low | testing | `packages/catalog/src/service.test.ts` | TC-011（should: "id 省略時に createService が id を自動生成する"）のテストは `typeof service.id === 'string' && service.id.length > 0` を検証しているが、2 回の呼び出しで異なる id が生成されること（一意性）を保証するテストがない。resource パッケージの review（review-feedback-001.md #1）で同じ指摘がなされている。 | `createService` を 2 回呼び出し `expect(s1.id).not.toBe(s2.id)` を追加する。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 10 | 0.25 |
| architecture | 10 | 0.15 |
| performance | 10 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 8 | 0.10 |

- **total**: 9.40

## Summary

実装全体として高品質。crm / resource パターンを忠実に踏襲しており、アーキテクチャ整合性は完全。すべての "must" 受け入れ基準を満たし、全フェーズ（typecheck / test 19件 / lint / build）が green。

**承認理由**: critical / high / decision-needed finding がゼロ。不変条件（`duration > 0`・`price >= 0`）の強制・immutable 更新・ServiceRepository port・in-memory 実装・barrel export、いずれも設計仕様通りに実装されている。

**要改善点（low、次イテレーション推奨）**:

1. **`resourceKinds` 防御的コピー欠落（low）**: `createService` が渡された `resourceKinds` 配列をコピーせずそのまま保持するため、呼び出し元からの実行時 mutation が可能。crm の `Customer.tags`（`Object.freeze([...(params.tags ?? [])])`）と整合させることで設計の一貫性が保たれる。

2. **id 一意性テスト欠落（low）**: `createService` を 2 回呼び出して生成 id が互いに異なることを確認するケースがない。resource のレビューでも同様の指摘があった既知のパターン。

### 受け入れ基準チェックリスト

| 基準 | 評価 |
|------|------|
| `@koma/catalog`・禁止依存ゼロ・`@koma/shared` 依存 | ✅ |
| `pnpm -F @koma/catalog run check-types` 成功 | ✅ |
| `duration` 正でないと構築できない（0 / 負で throw）をテストで固定 | ✅ |
| `price` が `Money` として保持される | ✅ |
| Service は immutable（更新は新インスタンス・元破壊なし）をテストで固定 | ✅ |
| `ServiceRepository` interface が `save` / `findById` / `list` を持つ | ✅ |
| in-memory: save→findById / 未保存null / list 全件をテストで固定 | ✅ |
| 各型に vitest テストがある | ✅ |
| `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green | ✅ |

### テストカバレッジ（test-cases.md 対比）

| TC | Priority | カバレッジ |
|----|----------|-----------|
| TC-001 | must | ✅ `duration が 0（ofMinutes(0)）で throw する` |
| TC-002 | must | ✅ `duration が正のとき構築に成功する` |
| TC-003 | must | ✅ `price が負（createMoney(-100, "JPY")）で throw する` |
| TC-004 | should | ✅ `price が非負のとき構築に成功する（0 円含む）` |
| TC-005 | must | ✅ `新しい Service を返し、元は変更されない（immutability）` |
| TC-006 | must | ✅ `duration を不正値に更新しようとすると throw する` |
| TC-007 | must | ✅ `save した Service を findById で取得できる` |
| TC-008 | must | ✅ `未保存の id で findById すると null が返る` |
| TC-009 | must | ✅ `list が保存分を全件返す` |
| TC-010 | should | ✅ `同一 id で save を 2 回呼ぶと上書き（upsert）される` |
| TC-011 | should | ⚠ id 生成確認あり、一意性テスト欠落（F-002, low） |
| TC-012 | should | ✅ `resourceKinds を省略したとき空配列が設定される` |
| TC-013 | should | ✅ `返却値が frozen である` |
| TC-014 | should | ✅ `price を不正値に更新しようとすると throw する` |
| TC-015 | should | ✅ `空の状態で list が空配列を返す` |
| TC-016〜020 | must/should | ✅ verification-result.md にて機械検証済み |
