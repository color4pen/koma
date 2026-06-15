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
| 1 | medium | architecture | apps/web/eslint.config.mjs | スコープ外変更: `apps/web` に ESLint flat config を新規追加したが `@next/next` プラグインを含めていない。verification ログでも「The Next.js plugin was not detected」警告が出ており、次画像コンポーネント・スクリプト関連など Next.js 固有のリントルールが apps/web から欠落した状態になった | `eslint.config.mjs` に `eslint-config-next` を import して Next.js plugin を追加する（`import nextPlugin from '@next/eslint-plugin-next'`）か、本変更を別 request に切り出して revert する | yes |
| 2 | low | testing | packages/shared/src/id.test.ts | TC-012（should）が未カバー: `isEqualId` テストが同一ブランド同士の比較しか行っていない。TC-012 は `parseId<'Customer'>(uuid)` と `parseId<'Booking'>(uuid)` を同一 UUID 文字列から生成し `isEqualId` が `true` を返すことを検証するよう定める（runtime は素の文字列比較のため true になる） | `isEqualId` の `describe` ブロックにクロスブランドテストを追加する | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 10 | 0.30 |
| security | 9 | 0.25 |
| architecture | 7 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 8 | 0.10 |

- **total**: 8.90

## Summary

`packages/shared` の実装は全体として高品質で、受け入れ基準をすべて満たしている。

**合格した受け入れ基準:**
- `@koma/shared` の name と禁止依存ゼロ ✓（grep 0 件）
- `pnpm -F @koma/shared run check-types` 成功 ✓
- Id ブランド非互換: `@ts-expect-error` ガード付きテスト存在 ✓
- Money: 整数最小通貨単位・通貨不一致エラーのテスト存在 ✓
- TimeRange: `overlaps`/`contains` 真理値表テスト存在（隣接=false、start≥end 構築不可）✓
- 全値オブジェクト（Id / Money / Duration / TimeRange）に vitest テストあり ✓
- verification 全 4 フェーズ（typecheck / test / lint / build）が exit 0 ✓（55 tests passed）

**実装品質ハイライト:**
- Id: branded type + UUID v4 正規表現バリデーションが正確。生成は `crypto.randomUUID()`（外部依存ゼロ）。
- Money: `Object.freeze` による runtime 不変性と `Number.isInteger` による整数強制が正しく実装されている。
- Duration: `ofMilliseconds` が非負整数を強制し、`ofMinutes`/`ofHours` がそれに委譲するため不変条件の伝播が安全。
- TimeRange: `overlaps` の `a.start < b.end && b.start < a.end` は半開区間に正確で、隣接（end == start）が false になることをテストで固定している。
- `src/index.ts` が TC-053 要求の全シンボルをエクスポートしている。

**要対応（medium 1 件・low 1 件）:**
Finding 1 は `apps/web` の Next.js 固有リントルール欠落であり、現状の minimal scaffold では実害がないが、Next.js コンポーネント追加前に対処が必要。Finding 2 は TC-012 のクロスブランドテスト追加（1 テストケース）。
