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
| 1 | MEDIUM | Spec Completeness (Security) | spec.md | spec-review-001 の HIGH 指摘（open redirect）は tasks.md T-07 で修正済みだが、spec.md 側の更新が未完了。「Login action SHALL authenticate」要件に「`next` は同一オリジン相対パスのみ有効、外部 URL は `/` へフォールバック」の安全制約が記述されておらず、external URL → fallback to `/` のシナリオも存在しない。tasks.md T-07 の実装ガイダンスが明示的なため実装は正しく行われる見込みだが、spec.md 単独では不完全な仕様となっている。 | spec.md の Login action 要件に「The `next` parameter SHALL be a same-origin relative path (starts with `/` and not `//`); any other value SHALL fall back to `/` to prevent open redirect.」を追記する。加えて Scenario を 1 件追加: **Given** valid credentials and `next=https://evil.com` **When** the login action succeeds **Then** the response redirects to `/` (external URL is rejected). |

## Review Notes

### spec-review-001 指摘の解消確認

| Finding | Severity | 解消状況 |
|---------|----------|---------|
| #1 Open Redirect（tasks.md T-07 に保護なし） | HIGH | ✅ tasks.md T-07 に `safeNext` 検証ロジック・Acceptance Criteria を追記済み。spec.md 未更新は Finding #1(MEDIUM) として残留。 |
| #2 User enumeration timing（design.md 記録推奨） | MEDIUM | ✅ design.md Risks に「後続スライス対応事項: ダミーハッシュ値への bcrypt.compare で均一化」を記録済み。 |
| #3 Email 表示方針不明（tasks.md T-09 に実装方針なし） | LOW | ✅ tasks.md T-09 に `resolveAuthConfig(process.env).adminEmail` を使用する旨と対応 Acceptance Criteria を追記済み。 |

### セキュリティ評価サマリー（再確認）

| OWASP カテゴリ | 評価 | 備考 |
|---|---|---|
| A01 Broken Access Control | ✅ tasks.md レベルで解消 | `next` 検証を tasks.md T-07 が明示。spec.md の文書完全性は MEDIUM 指摘 |
| A02 Cryptographic Failures | ✅ 問題なし | HMAC-SHA256 / httpOnly / secure in production |
| A03 Injection | ✅ 問題なし | zod/v4/mini による入力検証 |
| A04 Insecure Design | ✅ 許容範囲 | レート制限・ロックアウト欠如はスコープ外として明記済み |
| A05 Security Misconfiguration | ✅ 問題なし | Cookie 属性（httpOnly / sameSite=lax / path=/ / secure 本番のみ）適切 |
| A07 Identification & Auth Failures | ✅ 許容範囲 | エラーメッセージ単一化 ✅、タイミング均一化は design.md に後続事項として記録済み ✅ |

### 仕様整合性確認

- `SessionPayload = { userId: string; role: Role; exp: number }` と `setSessionCookie(Omit<SessionPayload,'exp'>)` のシグネチャは tasks.md T-07 の呼び出し `{ userId: user.id, role: user.role }` と整合 ✅
- `verifySession`（HMAC-SHA256, Web Crypto）は edge runtime 制約を満たす ✅
- middleware は `request.cookies`（edge 互換）、session-cookie.ts は `next/headers`（Server Component / Server Action 専用）の役割分離を維持 ✅
- `config.matcher` による静的アセット除外と `isPublicPath()` による公開パス判定の二層構造（D7）は一貫 ✅
- `isPublicPath('/login/reset') === false`（完全一致のみ）が tasks.md T-01 に含まれており、将来のパスワードリセット UI 追加時の意図しない public 化を防止 ✅
- `logoutAction(): Promise<void>` を `<form action={logoutAction}>` で使用する方針は spec-review-001 で確認済み ✅
- spec.md は rules.md の記法規律（`### Requirement:` / `#### Scenario:` / `SHALL` / Given-When-Then）に準拠 ✅
- tasks.md T-09 の `resolveAuthConfig(process.env).adminEmail` 表示は単一オーナー構成で適切。dev fallback により `undefined` にならないことも確認 ✅
