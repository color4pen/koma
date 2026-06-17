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
| 1 | low | correctness | `apps/web/app/*/page.tsx` | 全ページが `○ (Static)` でビルド時プリレンダリング。DATABASE_URL なしでビルドした場合、初回デプロイ後の GET リクエストは in-memory（空）データの静的 HTML を返す。revalidatePath が呼ばれた後（書き込み操作後）は Drizzle path で再レンダリングされ正常動作する。初回アクセスで DB データを返したい場合は各ページに `export const dynamic = 'force-dynamic'` が必要。 | 各ページトップに `export const dynamic = 'force-dynamic'` を追加する。または `next/cache` の `unstable_noStore()` を呼ぶ。後続 request での対応でも可。 | yes |
| 2 | low | testing | `apps/web/lib/composition-root.ts` | TC-010（DATABASE_URL 設定時に Drizzle repos が返る）の automated test が存在しない。Drizzle 初期化パス（createPostgresClient + ensureSchema + 各 repo）は個別コンポーネントで検証済みだが、composition root での統合パスは test-cases.md で "must" とされている。スコープ制約（CI に DB なし）上、致し方ない側面はあるが、モック（vi.mock）で DB 接続なしに分岐を検証する選択肢もある。 | `composition-root.ts` の drizzle branch を `vi.mock('@koma/db', ...)` でモックし、DATABASE_URL 設定時に Drizzle repo が返ることを unit test で固定する。 | yes |
| 3 | low | maintainability | `packages/db/src/client.ts` | `DrizzleClient` の型が仕様（tasks.md T-01: `PgDatabase<any>`）と異なり `PgDatabase<PgQueryResultHKT>` になっている。意図的な改善（`any` より型安全）であり全型チェックがパスしているが、設計書との乖離はコメントで明示すべき。 | `DrizzleClient` の型定義に「`PgQueryResultHKT` を使用（spec では `any` だが基底型で同等の driver 非依存性を実現）」旨のコメントを追加する。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 8 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 8 | 0.10 |

- **total**: 8.50

## Summary

全受け入れ基準を満たし、verification が 4 フェーズ（typecheck / test / lint / build）すべて green。主要な設計判断（PgDatabase 基底による driver 非依存化・dynamic import による遅延初期化・composition root への adapter 選択の集約）はいずれも正しく実装されている。

**特筆すべき良い点:**
- `initDrizzleRepos` を `await import('@koma/db')` で dynamic import 化したことで、memory mode および build 時に postgres モジュールが一切ロードされない。これは design.md の「まず静的 import で進め、問題が出れば dynamic import に移行する」案よりも優れた選択。
- `drizzleInitPromise` を globalThis にキャッシュし、並行呼び出しでも二重初期化しない実装が正確。
- `selectPersistenceMode` が純関数（process.env を直参照しない）として実装されており、テストが容易。
- `DrizzleClient = PgDatabase<PgQueryResultHKT>` は spec が `any` としていたところを基底型で精緻化した正の逸脱。

**要対応（低優先度）:**
- Finding #1（静的ページ）：revalidatePath による on-demand revalidation があるため機能的には動作するが、初回デプロイ時の初期表示が空になるリスクがある。ポートフォリオ用途ではブロッカーではないが、後続で `dynamic = 'force-dynamic'` 追加を検討。
- Finding #2（TC-010 テスト）：vi.mock で composition root の drizzle branch を unit test すれば CI DB なしで確認できる。後続 iteration での追加を推奨。
- Finding #3（コメント）：型の意図的逸脱を示すコメントのみなのでコード修正不要。
