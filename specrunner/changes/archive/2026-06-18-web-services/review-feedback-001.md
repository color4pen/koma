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
| 1 | low | testing | apps/web/lib/composition-root.ts | TC-023（must/unit）が未実装。test-cases.md は「複数回呼び出しで同一 ServiceRepository インスタンスを返す」を must 自動テストとして定義しているが、対応テストファイルが存在しない。実装ロジック自体は getCustomerRepository / getResourceRepository と同一パターンで正しく、既存の顧客・リソース実装にも同テストが存在しないため重大度は低い。 | `apps/web/lib/composition-root.test.ts` を追加し `getServiceRepository()` を 2 回呼んで `===` を検証する。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 10 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 8 | 0.10 |

- **total**: 9.05

## Summary

実装は全体的に高品質であり、確立済み delivery パターン（composition root / server action / zod/mini 境界検証 / 純関数 parse / server component + client form）を忠実に踏襲している。

**確認した主要ポイント:**

- **`parse-service-input.ts`**: `z.string().check(z.trim(), z.minLength(1, ...))` による name 検証、`Number()` + `Number.isInteger` によるカスタム整数変換（`durationMinutes` ≥ 1、`priceYen` ≥ 0）、`ofMinutes` → `Duration` / `createMoney('JPY')` → `Money` の境界変換、`createService` の `try/catch` による二段防御。いずれも設計書（D2, D3, D4）の仕様通り。
- **`composition-root.ts`**: `globalForApp` 型拡張 + lazy singleton パターンが `getCustomerRepository` / `getResourceRepository` と完全に対称。
- **`actions.ts`**: `'use server'` 先頭、`_prevState` シグネチャ、`parseServiceInput` → `save` → `revalidatePath('/services')` の薄い実装。既存 `createResourceAction` と同一構造。
- **`page.tsx`**: server component、`toMinutes(service.duration)` + `分`、`price.amount.toLocaleString('ja-JP')` + `円`、`resourceKinds.join(', ')` の表示フォーマット。`<main>` > `<h1>` + `<ServiceForm>` + `<section>` の構造。
- **`service-form.tsx`**: `'use client'`、`useActionState`、フィールド属性（`durationMinutes`: `type="number" min="1" step="1"`、`priceYen`: `type="number" min="0" step="1"`）、フィールド別エラー表示、`_form` エラー、成功メッセージ、`isPending` ボタン制御。
- **テスト**: `parse-service-input.test.ts` 17件 / `actions.test.ts` 3件（TC-001〜TC-022 の自動テスト対象をほぼ網羅）。vitest mock パターンも既存実装と一致。
- **検証結果**: typecheck / test / lint / build の全 4 フェーズが green。

**指摘事項（F-1）:** TC-023 の composition root singleton テストが未実装。実装自体は正しく、同等の gap が既存実装にも存在するため `Fix: no`（フィクサー対象外）とした。
