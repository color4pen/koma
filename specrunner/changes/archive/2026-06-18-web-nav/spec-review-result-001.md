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
| 1 | LOW | Security | spec.md / request.md | ダッシュボード home（`/`）および既存の全機能ページは認証なしでアクセス可能。spec は auth を明示的にスコープ外とし iam へ委譲しているため現時点では許容されるが、実装後に認証なし状態でデプロイする際のリスクを留意すること。 | 実装上の対処不要。iam コンテキストで認証を追加する際にこの旨を参照すること。 |
| 2 | LOW | Testability | tasks.md T-03 | `createBooking` の `slot` に渡す具体的なミリ秒値（`start` / `end`）が指定されていない。`start >= end` の場合 `createBooking` 自体はエラーを出さないが、`createTimeRange` を経由するケースでは失敗する。 | 実装者は `create-booking-use-case.test.ts` の `BASE_MS` / `HOUR_MS` パターンを踏襲すればよく、spec 修正は不要。 |

## Validation Notes

### コードベース前提検証

- `apps/web/app/layout.tsx`: `<html lang="ja"><body>{children}</body></html>` のみ、ナビなし → request 前提と一致 ✓
- `apps/web/app/page.tsx`: `<h1>Koma</h1>` と説明文の placeholder → request 前提と一致 ✓
- `apps/web/lib/composition-root.ts`: `getCustomerRepository` / `getResourceRepository` / `getServiceRepository` / `getBookingRepository` の 4 getter 全確認 ✓
- 各 getter は対応する in-memory repo を返し、いずれも `list(): Promise<T[]>` を持つ ✓

### パッケージ export 検証（T-03 import 一覧）

| Symbol | Package | 確認結果 |
|--------|---------|---------|
| `createInMemoryCustomerRepository`, `createCustomer`, `createContactInfo` | `@koma/crm` | ✓ |
| `createInMemoryResourceRepository`, `createResource` | `@koma/resource` | ✓ |
| `createInMemoryServiceRepository`, `createService` | `@koma/catalog` | ✓ |
| `createInMemoryBookingRepository`, `createBooking` | `@koma/scheduling` | ✓ |
| `createId`, `ofMinutes`, `createMoney` | `@koma/shared` | ✓ |

### 型シグネチャ整合

- `DashboardDeps` の各プロパティ型 `{ list(): Promise<unknown[]> }` は `CustomerRepository` / `ResourceRepository` / `ServiceRepository` / `BookingRepository` の実際の `list()` 戻り型（各ドメイン型の `Promise<T[]>`）に対して構造的に互換 → TypeScript コンパイル時に問題なし ✓
- `createBooking` は `slot: TimeRange`（`{ start: number; end: number }`）を受け取る純粋ファクトリ。T-03 の `slot: { start, end }` 記述はプレースホルダ表記であり、構造型として互換 ✓

### セキュリティレビュー（OWASP Top 10 観点）

| 項目 | 評価 |
|------|------|
| A01 Broken Access Control | ダッシュボードは認証なし公開。スコープ外（iam 委譲）のため意図的 |
| A02 Cryptographic Failures | 対象外（暗号化処理なし） |
| A03 Injection | ナビリンクはハードコード。件数は `number` 型（`.length`）。ユーザー入力なし → 問題なし |
| A05 Security Misconfiguration | Next.js App Router の server component として描画。`'use client'` なし → 攻撃面最小 |
| A07 Auth Failures | auth は iam コンテキストへ委譲（finding #1 参照） |
| XSS | カード表示値は `number` 型、リンクはハードコード → ユーザーデータの raw HTML 描画なし |
| CSRF | このスライスに mutation なし → 対象外 |

### 仕様整合性

- **request.md ↔ design.md**: 全要件（ナビ / getDashboardCounts / ダッシュボード home / テスト）に対応する設計判断（D1〜D5）が存在し整合 ✓
- **design.md ↔ tasks.md**: D1→T-01、D2→T-02、D5→T-03、D3→T-04、D4→T-04（composition root 再利用）のマッピングが成立 ✓
- **tasks.md ↔ spec.md**: T-03 の 2 テストケース（空→全 0、既知件数→正しい値）が spec.md の 2 Scenario と 1:1 対応 ✓
- **spec.md 記法**: 全 Requirement に `SHALL` 含む、全 Scenario が Given/When/Then 形式、Layer-0 記述なし ✓

### 総評

全スライス（ナビ追加・集計純関数・ダッシュボード home・テスト）の仕様は一貫しており、実装可能。新ドメイン・新パターン・新 port を導入しない delivery 層 UI の追加として適切に設計されている。`adr: false` 判定は妥当。
