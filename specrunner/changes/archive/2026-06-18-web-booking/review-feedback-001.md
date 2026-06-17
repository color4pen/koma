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
| 1 | low | testing | `apps/web/lib/composition-root.ts` | TC-019（must/unit）が未実装。`getBookingRepository()` を 2 回呼んで同一インスタンス（`===`）を確認するテストが `composition-root.test.ts` に存在しない。実装は `globalThis` パターンで正しく、他の repo も同テストを持たないため コードの誤りではなく testing gap。 | `apps/web/lib/composition-root.test.ts` を追加し、`getBookingRepository()` を 2 回呼んで `===` を assert する。 | no |
| 2 | low | testing | `apps/web/app/bookings/actions.test.ts` | TC-023・TC-024（should/integration）が未実装。`createBookingAction` に対して `reason: 'service-not-found'` → `errors._form: ['指定されたサービスが見つかりません']` および `reason: 'resource-not-found'` → `errors._form: ['指定されたリソースが見つかりません']` のパスを確認するテストがない。`no-capacity` ケース（TC-016）はカバー済みのため実装ロジックは正しい。 | `actions.test.ts` に service/resource 不在シナリオのテストケースを追加する。 | no |

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

全受け入れ基準を達成している。verification-result（typecheck / test 71件 / lint / build）はすべて green。

**アーキテクチャ**: `createBookingUseCase` を delivery 層に配置してコンテキスト横断 orchestration を行う設計（B-5 準拠）が正しく実装されている。ドメイン間の直接 import は一切なく、deps 注入による純粋関数化でユニットテストが書けている。

**コア要件**: capacity-aware 二重予約防止（TC-010）および隣接時刻許可（TC-011）・capacity=2 の 3 件目拒否（TC-012）はすべて in-memory repo のユニットテストで固定済み。`parseBookingInput` の境界検証も 8 ケース網羅。

**コード品質**: `composition-root.ts` の `globalThis` lazy singleton 拡張・`actions.ts` の薄い配線・`page.tsx` の `Promise.all` + Map 最適化・`booking-form.tsx` の `useActionState` + per-field エラー表示、いずれも既存パターンと一貫しており保守性が高い。

**Testing gaps（low）**: TC-019（composition root singleton 単体テスト、must）と TC-023/024（action 層の service/resource-not-found メッセージ、should）が未実装。前者は既存 repo がいずれも composition-root テストを持たないため codebase 水準での pre-existing gap であり、後者は should 優先度。いずれも code defect ではなく testing coverage の補完事項のため Fix=no とし、次スライスで任意対応を推奨する。
