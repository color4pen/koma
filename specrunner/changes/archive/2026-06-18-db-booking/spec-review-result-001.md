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
| 1 | LOW | Dual source of truth | design.md D3 / tasks.md T-03 | `findActiveByResource` の active 定義が SQL `status IN ('pending', 'confirmed')` と `isActive` 関数の 2 箇所に存在する。design.md もこれをリスクとして明記し「テストで検出する」としている。契約テスト T5 が乖離を検出する仕組みになっており許容範囲。 | 現状のまま実装可。将来 active 定義が変わる際は両箇所の同期を忘れないよう、実装ファイルにコメントを残す（例: `// active = pending | confirmed (sync with isActive in @koma/scheduling)`）。 |
| 2 | LOW | Runtime type safety | tasks.md T-03 | `row.status as BookingStatus` は TypeScript レベルの型キャストであり、DBに不正な status 値が入った場合はランタイムで無言通過する。既存 repository（`row.kind as string`、`row.price_currency as Currency`）と同じパターンであり、adapter 層の慣例として許容範囲。 | 現状のまま許容。将来ランタイム検証が必要になれば Zod schema を adapter 境界に置く選択肢があるが、本 request のスコープ外。 |
| 3 | LOW | Test DDL completeness | tasks.md T-05 | `CREATE_BOOKINGS_TABLE` の完全な DDL が tasks.md に記載されていない。`custom_fields` の `DEFAULT '{}'::jsonb` の要否が実装者判断になる。既存パターン（customers テーブルは DEFAULT 付き）を参照すれば解決するが、明示されていない。 | 実装者は既存テスト DDL（`drizzle-customer-repository.test.ts`）を参照し、`custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb` とする。save は常に値を提供するため機能上の影響はない。 |

## Review Notes

### 既存パターンとの整合性チェック

`packages/db/src/` の 3 実装（drizzle-customer / drizzle-resource / drizzle-service）とテストを全件照合した。spec が前提とするパターンはすべて一致している。

| 要素 | 既存パターン | spec の記述 | 一致 |
|------|------------|------------|------|
| ファクトリ関数形式 | `createDrizzleXxxRepository(db: DrizzleClient): XxxRepository` | T-03 同形式 | ✅ |
| upsert | `insert(...).onConflictDoUpdate({ target: table.id, set: ... })` | T-03 同形式 | ✅ |
| 行→集約再構成 | `createXxx` / `parseId` 経由 | `restoreBooking` + `parseId` + `createTimeRange` 経由 | ✅ |
| pglite 隔離 | `beforeEach`: new PGlite + exec DDL + createDrizzleClient / `afterEach`: close | T-05 同形式 | ✅ |
| テスト内 DDL | `pglite.exec(CREATE_XXX_TABLE)` 直接 SQL | T-05 同形式 | ✅ |
| frozen オブジェクト解除 | `[...arr]` / `{ ...obj }` でスプレッド | T-03: `{ ...booking.customFields }` | ✅ |
| schema ファイル分離 | `schema/<entity>.ts` | T-02: `schema/booking.ts` | ✅ |
| index.ts export | `createDrizzleXxxRepository` + schema | T-04 同形式 | ✅ |

### 技術的判断の検証

**bigint `mode: 'number'` の精度安全性**

2026-06-18 現在の epoch ms: 約 1.750 × 10¹²。`Number.MAX_SAFE_INTEGER` = 9.007 × 10¹⁵。差は 3 桁以上あり、2100 年（約 4.1 × 10¹²）でも安全。`integer`（PostgreSQL 32-bit、上限 ~2.1 × 10⁹）は 2038-01-19 相当の epoch ms で溢れるため、`bigint` の選択は正しい。`mode: 'number'` のマッピングは Drizzle 公式 API で valid。bigint 往復テスト（T-05 テスト 6: `1_800_000_000_000`）が実装後に精度を機械的に検証する。

**`restoreBooking` の必要性**

`booking.ts` を確認: `createBooking` は `status: 'pending' as BookingStatus` で固定する。`restoreBooking` は `status` を引数で受け取り保存時の状態をそのまま返す。確認済み `status` 値（`pending`, `confirmed`, `cancelled`, `completed`, `no-show`）を持つ行を正しく復元するには `restoreBooking` が必須。spec の却下理由は正確。

**`findActiveByResource` の active 定義**

`booking-status.ts` の `isActive`: `return status === 'pending' || status === 'confirmed'`。`in-memory-booking-repository.ts` が `isActive` でポストフィルタしており、SQL `status IN ('pending', 'confirmed')` と等価であることを確認。spec T-05 テスト 5 が `cancelled` 除外と別 resource 除外を明示的に検証するため、実装の乖離はテストで検出できる。

**`@koma/scheduling` 依存追加の妥当性**

現状 `packages/db/package.json` の依存: `@koma/crm`, `@koma/resource`, `@koma/catalog`, `@koma/shared`。`@koma/scheduling` は `next`/`react`/`drizzle-orm`/`zod` を import しない純粋 TS パッケージ（`packages/scheduling/src/index.ts` および全ソースを確認）。アーキテクチャ制約（db は adapter 層として domain package に依存）に反しない。

### セキュリティレビュー（OWASP Top 10 該当箇所）

本 request は HTTP 非公開の pure DB adapter であるため、直接的な Web 攻撃ベクタは存在しない。

- **A03 Injection**: Drizzle ORM のパラメータ化クエリ（`eq`, `and`, `inArray` operators）を使用。生 SQL 文字列への変数埋め込みはなし（テスト DDL は静的文字列）。問題なし。
- **A04 Insecure Design**: ビジネスロジックを adapter に持ち込まない設計。`findActiveByResource` の active 判定は SQL filter に閉じており、副作用がない。問題なし。
- **A08 Integrity Failures**: `restoreBooking` 経由の再構成により、domain factory が不変条件を保証。`createTimeRange(start, end)` は `start >= end` を弾く。問題なし。
- その他 Top 10 項目（認証・セッション・アクセス制御・SSRF 等）はこの層に該当しない。

### 受け入れ基準の検証可能性

全 7 項目が機械検証可能。

| AC | 検証手段 | 備考 |
|----|---------|------|
| `@koma/scheduling` 依存 | `grep` / package.json 目視 | T-01 |
| `next/react/zod` 混入なし | `grep -E '"(next\|react\|zod)"'` | T-01 |
| `check-types` 成功 | `pnpm -F @koma/db run check-types` | T-02〜T-04 |
| `start_millis`/`end_millis` が bigint | schema ソース目視 + 型チェック | T-02 |
| pglite 契約テスト（隔離・往復） | `pnpm -F @koma/db run test` | T-05 |
| `findActiveByResource` active filter | テスト 5 (T-05) | terminal 除外・別 resource 除外 |
| `restoreBooking` 経由 | ソース目視 + テスト 1 の status 往復 | T-03・T-05 |

### 総合評価

CRITICAL / HIGH 該当なし。LOW 3 件はいずれも既存パターンとの照合により許容範囲内と判断。spec は実装に必要な情報を過不足なく含み、設計判断に矛盾はない。実装ガイドとして機能する品質に達している。
