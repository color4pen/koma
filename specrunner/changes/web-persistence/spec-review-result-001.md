# Spec Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:    specification is complete, consistent, and ready for implementation
  - needs-fix:   specification has issues that must be resolved before implementation
  - escalation:  unresolvable conflicts, missing context, or requires human judgment
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
  - CRITICAL: production outage, data loss, security breach
  - HIGH:     functional failure, clear bug, no workaround — blocks approval
  - MEDIUM:   quality degradation, maintainability issue, future risk
  - LOW:      informational, style, minor improvement
- If no findings, write a table row with "None" or omit the table body.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | MEDIUM | Implementation Completeness | tasks.md T-06 | T-06 は「呼び出し元の page / action は変更不要」と書きつつ「async にする場合は呼び出し元も await を追加する」と例外を添える。実際には `get*Repository()` が async になると `apps/web/app/` 配下に約 15 コールサイト（page.tsx×5、actions.ts×4、chained call `getXxx().save()` 等）が型エラーになる。これら更新対象ファイルが T-06 に列挙されておらず、T-07 の check-types が最後に全部を捕まえるまで実装者が見落とすリスクがある。 | T-06 に「async 化した場合、以下のコールサイトを `await getXxxRepository()` パターンに更新する」として `apps/web/app/page.tsx`・`customers/{page,actions}.{tsx,ts}`・`resources/{page,actions}.{tsx,ts}`・`services/{page,actions}.{tsx,ts}`・`bookings/{page,actions}.{tsx,ts}` を列挙する（または T-06 とは別タスクに分割して明示する）。T-07 の check-types が安全網として機能するため、列挙を追記すれば十分で実装可能。 |
| 2 | LOW | Test Coverage | spec.md / tasks.md | spec.md に「DATABASE_URL 設定時に Drizzle repo が返る（createPostgresClient + ensureSchema が 1 回実行される）」シナリオが定義されているが、対応する vitest タスクが存在しない。drizzle 経路の composition root 動作は型チェックのみで固定され、行動レベルの自動テストがない。 | 本 request のスコープ外（CI に外部 DB なし）で設計上承認済みのトレードオフ。対処不要。後続で本番 PostgreSQL 結合テストを導入する際に補完する旨を composition-root.ts のコメントに残すことを推奨する。 |
| 3 | LOW | Maintainability | tasks.md T-02 / design.md D3 | `ensure-schema.ts` に手書きする DDL 文が `packages/db/src/schema/*.ts` の Drizzle 定義と分離するため、スキーマ変更時に両者が乖離するリスクがある。 | design.md で既承認のトレードオフ（drizzle-kit 導入後に廃止予定）。T-02 が関数ヘッダーコメントの追加を明示しているため追加アクション不要。 |

## 評価サマリ

### 仕様の一貫性

- request.md・design.md・tasks.md・spec.md 間で要件・設計判断・タスク・シナリオが整合している。
- `PgDatabase` 基底型への一般化（D1）、`createPostgresClient`（D2）、`ensureSchema`（D3）、env 駆動 adapter 選択（D4）はいずれも一貫して記述されており、実装者が迷う余地が少ない。

### アーキテクチャ整合性

- `delivery(apps/web) → db(packages/db)` の依存追加は `model.md §3` の許可 edge（✓）に合致する。
- `PgDatabase<any>` への一般化により drizzle-orm の import が `packages/db` に集中し、B-2 不変条件（domain/shared は drizzle-orm を import しない）が維持される。
- composition root への adapter 選択の集約は `model.md §2`（"配信 = composition root"）と整合する。

### セキュリティ評価（OWASP Top 10）

- **A03 インジェクション**: `ensureSchema` は `sql` テンプレートタグを使い DDL を発行する。テーブル名・カラム定義は実装側のハードコード値のみで、ユーザー入力は混入しないためインジェクションリスクはない。Drizzle ORM のクエリビルダーも同様にパラメータ化クエリを生成する。
- **A05 セキュリティ設定ミス**: `DATABASE_URL` はサーバーサイド環境変数から取得する。ユーザー制御可能な入力ではなく、SSRF / 接続文字列インジェクションリスクは実質なし。
- **A06 脆弱なコンポーネント**: 追加される `postgres`（postgres-js v3.x）は drizzle-orm の公式推奨 driver であり積極的にメンテナンスされている。
- **その他（A01, A02, A04, A07–A10）**: 本 request は認証・認可・暗号化に触れておらず、スコープ外。現行のセキュリティ面への悪影響なし。

### 受け入れ基準の検証可能性

- 6 項目すべてが機械検証可能（型チェック・vitest・`pnpm build`）であり、品質ゲートとして十分。

### 結論

CRITICAL・HIGH 所見なし。Finding #1（MEDIUM）は caller 更新範囲の列挙不足だが、T-07 の check-types が安全網として機能するため実装遮断にはならない。Finding #2・#3 は設計時点で承認済みのトレードオフ。spec は実装可能な状態と判断する。
