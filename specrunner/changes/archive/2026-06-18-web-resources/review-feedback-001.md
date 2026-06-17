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
| 1 | medium | testing | `apps/web/app/resources/actions.test.ts` | TC-015/TC-016/TC-017（createResourceAction の integration テスト）が test-cases.md で automated/must に指定されているが、ファイルが存在しない。`app/customers/actions.test.ts`（4 tests）が web-customers で確立したパターンであり、web-resources では同等ファイルが作成されていない。18 件 automated と宣言されているが実際は 14 件のみ green。 | `app/customers/actions.test.ts` のパターンを踏襲して `app/resources/actions.test.ts` を作成する（vi.mock next/cache、vi.mock composition-root、valid FormData → ok:true + save 確認、invalid FormData → ok:false + save なし確認、revalidatePath 呼び出し確認）。 | no |
| 2 | low | testing | `apps/web/lib/composition-root.ts` | TC-027（getResourceRepository 複数回呼び出しで同一インスタンス）が unit/must に指定されているが automated テストとして実装されていない。 | `composition-root.test.ts` に同一参照テストを追加するか、既存の actions.test.ts 内で確認する。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 8 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 8.45

## Summary

実装は web-customers の delivery パターンを高い忠実度で踏襲しており、全体的な品質は良好。

**正常に実装されている点:**

- `@koma/resource: workspace:*` が dependencies に追加、`drizzle-orm` は含まれていない（TC-029/TC-030 ✓）
- `composition-root.ts` に `getResourceRepository()` が `globalThis` lazy singleton パターンで追加され、`createInMemoryResourceRepository()` の呼び出しは 1 箇所のみ（TC-028 ✓）
- `parse-resource-input.ts` は `zod/v4/mini` + カスタム `Number()` / `Number.isInteger` によるフォーム文字列→正整数変換を実装。`parseInt` ではなく `Number()` を使うことで `"1.5"` の小数検出を正しく担保し、`createResource` との二段防御（D3）を実現（TC-007/TC-008/TC-009 ✓）
- `parse-resource-input.test.ts` が 14 テスト全 green（TC-001〜TC-014 ✓）
- `actions.ts` は `'use server'` directive、`createCustomerAction` と同一シグネチャ、`revalidatePath('/resources')` 呼び出しを備える（TC-018 ✓）
- `resource-form.tsx` は `'use client'` directive、`useActionState` バインド、`capacity` が `type="number" min="1" step="1" defaultValue="1"`、フィールド別エラー表示、成功メッセージ、isPending ボタン制御（TC-023/TC-024 ✓）
- `page.tsx` は server component、`list()` による一覧取得、空状態と一覧テーブル（名前/種別/同時受付数）の両方（TC-021/TC-022 ✓）
- `pnpm -r run check-types && test && lint && build` 全 phase green（TC-031〜TC-033 ✓）

**課題（blocking ではない）:**

Finding #1 / #2 は `medium` / `low` であり `needs-fix` に至らないが、web-customers パターンとの一貫性を保つためには後続で `app/resources/actions.test.ts` の追加が望ましい。現行スライスでは verification が green であるため機能的影響はなく、next iteration またはテスト補完スライスで対応可能。
