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
| 1 | low | maintainability | apps/web/app/layout.tsx | `href="/"` リンクがロゴ ("Koma") とナビ ("ホーム") の 2 箇所に存在する。tasks.md T-01 で明示的に要求された仕様であり意図的。将来ナビが複雑化した際に重複と感じる可能性があるが、現スライスのスコープ内で問題なし。 | 将来アクティブリンクハイライトを追加する際にロゴ側のリンクを非ナビとして分離するか、ホームリンクをナビ側のみに統合することを検討する。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 10 | 0.30 |
| security | 10 | 0.25 |
| architecture | 10 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 10 | 0.10 |

- **total**: 9.8

## Summary

実装は要件を完全に満たしており、全受け入れ基準が green。

### テストカバレッジ (test-cases.md 対比)

| TC | Priority | Category | 結果 |
|----|----------|----------|------|
| TC-001 layout にナビゲーションリンクが存在する | must | manual | ✅ `layout.tsx` に `<header>` + 5 `<Link>` 確認 |
| TC-002 ナビゲーションは server component | must | manual | ✅ `'use client'` なし確認 |
| TC-003 空の repo で全 0 を返す | must | unit | ✅ `dashboard.test.ts` でパス |
| TC-004 既知件数で正しい件数を返す | must | unit | ✅ `dashboard.test.ts` でパス (customers:2, resources:1, services:3, bookings:1) |
| TC-005 ダッシュボードに 4 セクションのカードが表示される | must | manual | ✅ `page.tsx` にカード描画確認 |
| TC-006 ダッシュボード home は server component | must | manual | ✅ `'use client'` なし、`async function` 確認 |
| TC-007 monorepo 全体の検証が green | must | manual | ✅ verification-result.md: typecheck/test/lint/build 全 passed |
| TC-008 DashboardCounts 型が export | should | manual | ✅ `export type DashboardCounts` 確認 |
| TC-009 Promise.all で並行呼び出し | could | manual | ✅ `dashboard.ts` L16 に `Promise.all([...])` 確認 |
| TC-010 テストファイルが正しいパスに配置 | should | manual | ✅ `apps/web/lib/dashboard.test.ts` 存在確認 |
| TC-011 page.tsx が getDashboardCounts に委譲 | should | manual | ✅ `@/lib/dashboard` から import して呼び出し確認 |
| TC-012 page.tsx が composition root 経由で repo 取得 | should | manual | ✅ `@/lib/composition-root` から 4 getter import 確認 |
| TC-013 layout.tsx にアプリ名「Koma」のホームリンク | could | manual | ✅ `<Link href="/">Koma</Link>` 確認 |

全 13 TC が must 7 / should 4 / could 2 すべてカバー。

### 実装品質

- **`dashboard.ts`**: `DashboardDeps` を構造型で受け取るため具体的なドメイン型への依存なし。`Promise.all` で 4 `list()` 並行呼び出し。設計 D2 を忠実に実装。
- **`layout.tsx`**: `'use client'` なしの server component。`<header>` 内に `<nav>` + 5 `<Link>`。最小インラインスタイルで設計 D1 を実装。
- **`page.tsx`**: 集計ロジックを `getDashboardCounts` に委譲し、composition root getter 経由で repo 注入。server component として `async function` で実装。設計 D3・D4 を忠実に実装。
- **`dashboard.test.ts`**: in-memory repo を使った 2 ケース（空 → 全 0、既知件数 → 正確な件数）。`vi.mock` 不使用で実装密結合を回避。設計 D5 の方針通り。

### 検証結果

verification-result.md によると全フェーズ passed:
- `check-types`: apps/web を含む全 7 パッケージ 0 エラー
- `test`: apps/web で `lib/dashboard.test.ts` (2 tests) を含む 87 テスト全 pass
- `lint`: ESLint 警告・エラーなし
- `build`: `next build` 成功、8 静的ページ生成

指摘事項は info 1 件のみ（修正不要）。
