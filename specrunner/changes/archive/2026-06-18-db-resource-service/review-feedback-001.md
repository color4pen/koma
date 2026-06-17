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
| 1 | low | maintainability | packages/db/src/schema/service.ts | `resource_kinds` カラムに Drizzle の `.default()` 定義がないが、テスト DDL には `DEFAULT '[]'::jsonb` が含まれている。現在 repository は常に `resource_kinds` を明示 SET するため実害はない。マイグレーション生成を行う将来タスクで不一致が顕在化する可能性がある。 | Drizzle schema 側に `.default(sql`'[]'::jsonb`)` を追加し、テスト DDL と一致させる（マイグレーションスコープが来た時点で対処しても可）。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 10 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 10 | 0.10 |

- **total**: 9.15

## Summary

db-customer で確立した Drizzle + pglite アダプタパターンを `DrizzleResourceRepository` / `DrizzleServiceRepository` へ正確に適用した実装。以下の観点でいずれも仕様・設計を満たしている。

**Correctness**
- `ResourceRepository` / `ServiceRepository` port の `save` / `findById` / `list` を正しく実装。
- `findById` で未保存 id の場合は `null` を返す。`rows[0]` による first-or-undefined パターンは db-customer と同一。
- upsert は `onConflictDoUpdate({ target: <table>.id, set: {...} })` で正しく実装されており、同一 id の再 save で全フィールドが更新される。
- `rowToResource` は `createResource` 経由で再構成し、`capacity >= 1` 不変条件が DB read でも通る。
- `rowToService` は `ofMilliseconds(duration_ms)` → `createMoney(price_amount, price_currency as Currency)` → `createService` の連鎖でドメイン不変条件を通す。

**Architecture**
- 禁止依存（next / react / zod）なし（grep 0 件確認済み）。
- `@koma/resource` / `@koma/catalog` が `workspace:*` で追加されており、model.md 注⁴の許可範囲内。
- schema / repository / test がそれぞれ `src/schema/` / `src/drizzle-*-repository.ts` / `src/drizzle-*.test.ts` に配置され、db-customer の構造を踏襲。
- `index.ts` から `createDrizzleResourceRepository`, `createDrizzleServiceRepository`, `resources`, `services` が全て export されている。

**Testing**
- test-cases.md の全 23 ケース（TC-001〜TC-013 の自動化ケース）を網羅。
- `beforeEach` / `afterEach` の pglite 隔離パターンが db-customer テストと同一構造。
- Service の duration / price / resourceKinds の往復が独立したテストで明示的に検証されている。
- upsert テストで `list().length === 1` まで確認しており、重複挿入がないことを保証。

**Minor Finding**
`schema/service.ts` の `resource_kinds` に Drizzle 側の default が未定義（テスト DDL は `DEFAULT '[]'::jsonb`）。本 request のスコープ（programmatic CREATE TABLE、マイグレーション運用はスコープ外）では影響なし。将来マイグレーション生成時の対処事項として記録。fixer による修正は不要。

Verification フェーズ: typecheck / test / lint / build すべて passed（確認済み）。
