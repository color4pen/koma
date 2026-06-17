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
| 1 | MEDIUM | Implementation Risk | tasks.md T-01 | zod バージョン仕様が `^3.25.0`（v3 系）と記載されているが、`zod/mini` サブパスは zod v4 で初めて導入された機能。`^3.25.0` を package.json に直書きして `pnpm install` すると pnpm は zod@3.x を解決し、`import * as z from 'zod/mini'` が解決できずビルドが失敗する。インライン注記（「v4 系が利用可能ならそちらを使用 / `pnpm add` で最新版を入れる」）が唯一の救済であり、仕様文字列自体は誤り。pnpm-lock.yaml に zod@4.4.3 は存在するが semver 上 v3 レンジとは非互換であり自動使用されない。 | tasks.md T-01 の依存バージョン仕様を `"zod": "^4.0.0"` に修正する。または `pnpm add zod` を実行して latest（v4）を取得するよう明示し、package.json への `^3.25.0` 直書きを行わないよう指示を変更する。 |
| 2 | MEDIUM | Security (OWASP A01) | request.md スコープ外 | `/customers` 管理画面は認証・認可なしで公開アクセス可能。本スライスのスコープ外と明記されており in-memory ストアのため永続的被害は生じないが、後続の Drizzle 移行後に auth なし管理画面として残存した場合、実際の顧客データへの無認証アクセスが可能になる。 | 本スライスの acceptanceとしては許容。後続スライスで IAM による保護を必須要件として追加することを推奨する。 |
| 3 | LOW | Input Validation (OWASP A03) | design.md D3 / spec.md | `phone` / `email` フィールドにフォーマット検証（RFC5322 email、E.164 phone 等）・最大長制約がない。任意長の文字列を受け付ける。in-memory では問題ないが、Drizzle 移行後に DB カラム長制約違反で初めてエラーになるリスクがある。 | 後続の Drizzle スライスで zod スキーマに長さ制約・フォーマット検証を追加する際に対応。本スライスは in-memory のため LOW として許容。 |
| 4 | LOW | Test Coverage Gap | tasks.md T-02 / spec.md | composition root の singleton 同一性（「複数回呼び出しで同一インスタンスが返る」）は spec.md に Scenario として記載されているが、vitest テストには含まれずコードレビューのみで検証される。行動的契約としてテストで固定できていない。 | 必須ではないが、`getCustomerRepository() === getCustomerRepository()` を確認する vitest テストを追加すると振る舞い仕様をコードで固定できる。現状の T-02 受け入れ基準（コードレビューで確認）のままでも実装可能。 |
| 5 | LOW | Error Handling Gap | design.md D4 / tasks.md T-05 | `createCustomerAction` で `repo.save()` が throw した場合の catch が仕様に規定されていない。in-memory 実装では throw しないため現在は問題ないが、Drizzle 移行後に DB 障害等で unhandled rejection / 500 エラーになるリスクがある。 | 本スライスは in-memory のため許容。後続の Drizzle スライスの tasks に server action への try-catch 追加を明記することを推奨する。 |

## Review Notes

### コードベース検証

- `packages/crm/src/index.ts`: `createCustomer` / `createContactInfo` / `CustomerRepository`（port）/ `createInMemoryCustomerRepository` を export 済み。設計が依拠する全関数・型が揃っている。
- `createContactInfo`: phone・email 両方 null のとき throw する実装を確認。zod/mini での事前検証との二段防御が機能する。
- `createCustomer`: name の非空チェックなし（B-3 に従い delivery 境界のみで制御）。設計方針と整合。
- `CustomerRepository` port: `save / findById / list` の 3 メソッド。design.md の `list()` 呼び出しと一致。
- `apps/web/package.json`: `next` / `react` / `react-dom` のみ。`@koma/crm` / `zod` / `vitest` 未追加で request の前提と一致。
- `apps/web/tsconfig.json`: `"@/*": ["./*"]` パスエイリアス設定済み。D7 の vitest.config.ts `resolve.alias` と整合。
- pnpm-lock.yaml: `zod@4.4.3` がワークスペースに存在（specrunner 経由）。ただし v3 レンジ指定では自動利用されない（finding #1）。

### アーキテクチャ適合性

| 不変条件 | 評価 |
|---------|------|
| B-1: domain/shared が `next`/`react` を import しない | 適合（delivery のみ変更） |
| B-2: domain/shared が `drizzle-orm` を import しない | 適合。`drizzle-orm` を apps/web に入れないことを受け入れ基準で機械検証 |
| B-3: 入力検証は delivery 境界で `zod/mini` | 適合。`parseCustomerInput` を `apps/web/lib/` に配置 |
| B-4: shared が他パッケージを import しない | 影響なし |
| B-5: 兄弟コンテキストの相互 import 禁止 | 影響なし |
| B-6: 業種固有語彙を domain/shared に置かない | 影響なし |

依存方向（delivery → domain ✓）も適合。

### セキュリティレビュー（OWASP Top 10）

| 項目 | 評価 |
|------|------|
| A01 Broken Access Control | 管理画面に認証なし（スコープ外として明記）。finding #2 として記録 |
| A02 Cryptographic Failures | 非該当（in-memory、機密データなし） |
| A03 Injection | SQL injection: 非該当（in-memory）。XSS: React のデフォルト HTML エスケープで保護 |
| A04 Insecure Design | 二段の防御（zod/mini + ドメインファクトリ）で適切 |
| A05 Security Misconfiguration | 非該当 |
| A06 Vulnerable Components | 非該当 |
| A07 Auth Failures | finding #2 参照 |
| A08 Software and Data Integrity | Next.js server action は組み込み CSRF 保護を持つ。適合 |
| A09 Logging | 本スライスはスコープ外 |
| A10 SSRF | 非該当 |

### 仕様整合性

- request.md / design.md / tasks.md / spec.md の間に重大な矛盾はない。
- D2（composition root globalThis パターン）は Prisma Client 等で確立済みの Next.js パターンに準拠。
- D5（server/client 境界）の設計は React 19 の `useActionState` を正しく活用している。`useActionState` の import 元が `react`（react-dom ではない）という仕様も正確。
- D6（`transpilePackages`）で `@koma/crm` と `@koma/shared` の両方を明示しているのは推移的依存を考慮した正しい対処。
- spec.md の Given/When/Then シナリオは tasks.md の受け入れ基準と整合している。
- finding #1 の zod バージョン仕様の誤りを除けば、実装者が仕様に従って作業を完遂できる品質が確保されている。
