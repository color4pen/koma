# Request Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approve | needs-discussion | reject
  - approve:          No blocking findings (no HIGH, no decision-needed). Request is ready for pipeline execution.
  - needs-discussion: One or more blocking findings (HIGH or decision-needed) resolvable through discussion.
  - reject:           Multiple blocking findings AND requirement contradictions or structural breakdown.
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | Location | Description | Recommendation
- Valid Severity values (uppercase): HIGH | MEDIUM | LOW
  - HIGH:   Request-level defect — goal unclear, acceptance criteria absent/untestable, or critical external constraint unspecified
  - MEDIUM: Scope ambiguity, recommended additions
  - LOW:    Clarity improvements, expression refinements
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approve

## Findings

| # | Severity | Category | Location | Description | Recommendation |
|---|----------|----------|----------|-------------|----------------|
| 1 | LOW | Clarity | 要件 3 `findActiveByResource` | SQL フィルタ（`status IN (...)`）とポスト取得フィルタ（`isActive`）の 2 案が並列提示されているが、どちらを選ぶかは実装者判断。どちらも機能的に正しく、受け入れ基準で検証可能なため blocking ではない。 | 実装者はいずれを選んでもよい。InMemory 実装（`isActive` でポストフィルタ）と対称にする場合はポストフィルタが読みやすい。 |

## Review Notes

### 既存パターンとの整合性

`packages/db` の 3 つの既存リポジトリ（drizzle-customer / drizzle-resource / drizzle-service）を確認した。request が前提とする「Drizzle + pglite アダプタパターン」は確立済みで、下記がすべて一致している。

- `DrizzleClient` を受け取るファクトリ関数形式
- `onConflictDoUpdate` による upsert
- ドメインファクトリ経由の行→集約再構成（`createCustomer` / `createResource` / `createService`）
- `beforeEach` で fresh PGlite + `afterEach` で `close()` の隔離パターン
- テスト内で `CREATE TABLE` DDL を直接 `pglite.exec` する方式

### 技術的判断の検証

**bigint `mode: 'number'`**  
2026 年現在のエポックミリ秒は約 1.75 × 10¹² であり、`Number.MAX_SAFE_INTEGER`（≈ 9 × 10¹⁵）より 3 桁以上小さい。`mode: 'number'` での精度損失リスクはなく、Drizzle の API としても valid。pglite は PostgreSQL `BIGINT` を正常にサポートしている。

**`restoreBooking` の採用**  
`booking.ts` を確認: `createBooking` は `status: 'pending'` で固定生成するため、DB から読み出した任意 status の行を再構成するには `restoreBooking`（id・status を明示）が必須。request の説明と却下理由は正確。

**`findActiveByResource` の active 定義**  
`booking-status.ts` の `isActive` は `pending | confirmed` を返す。`in-memory-booking-repository.ts` も同関数でフィルタしており、SQL 実装での `status IN ('pending', 'confirmed')` と等価。contract テストの仕様（terminal 状態や別 resource を除外）は検証可能かつ一意。

### 依存関係チェック

`packages/db/package.json` の現状: `@koma/crm`, `@koma/resource`, `@koma/catalog`, `@koma/shared` を依存に持つ。`@koma/scheduling` の追加は同パターンの踏襲であり、アーキテクチャ制約（db は adapter 層）に反しない。`@koma/scheduling` は `next`/`react`/`drizzle-orm`/`zod` を import しない純粋 TS パッケージであることを `packages/scheduling/src/index.ts` で確認済み。

### 受け入れ基準の検証可能性

全 6 項目が CLI / テスト実行で機械検証可能。特に `grep -E '"(next|react|zod)"'` による依存ガードと `pnpm -r run check-types` による型整合は過去リポジトリと統一された基準。

### 総合評価

HIGH / MEDIUM 該当なし。LOW 1 件（実装選択肢の文言）のみ。request は実装に必要な情報をすべて含み、既存パターンと矛盾しない。
