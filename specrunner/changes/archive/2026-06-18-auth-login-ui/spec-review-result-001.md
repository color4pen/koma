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

- **verdict**: needs-fix

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | HIGH | Security (Open Redirect) | tasks.md T-07 / spec.md | `loginAction` が `formData.get('next')` の値を無検証で `redirect(next \|\| '/')` に渡している。攻撃者が `/login?next=https://evil.com` という URL を被害者に踏ませると、ログイン成功後に外部サイトへリダイレクトされる（CWE-601、OWASP A01）。middleware が生成する `next` は `request.nextUrl.pathname`（サーバー制御）なので安全だが、ログインフォームが hidden field として送信する値はクライアント・攻撃者が改ざん可能。 | tasks.md T-07 に「`next` は `/` で始まる相対パスであることを検証し、外部 URL・`//` 始まり・データスキームは `/` へフォールバックする」旨を追記すること。spec.md に Scenario を追加: **Given** `next=https://evil.com` **When** ログイン成功 **Then** `/` へリダイレクト（外部 URL は無視）。 |
| 2 | MEDIUM | Security (Timing) | request.md スコープ外 / design.md Risks | `authenticate()` はメール不在時にパスワードハッシュ検証をスキップして即返却するため、メール存在有無をタイミング差で推測できる（user enumeration timing）。本スライスのスコープ外と明示されているが、将来スライスへの引き継ぎ記載がない。 | design.md の Risks セクションに「後続スライスで `authenticate` のタイミング均一化（ダミー `verifyPassword` 呼び出し）を追加する」旨を記録することを推奨。設計変更は不要（記述追加のみ）。ブロッカーではない。 |
| 3 | LOW | Clarity | request.md 要件 7 / design.md D6 / tasks.md T-09 | `SessionPayload` は `{ userId, role, exp }` のみで `email` フィールドを持たない。ナビに「ユーザー識別（email）」を表示する実装方法（`getUserRepository()` で引く vs `resolveAuthConfig(process.env).adminEmail` を直接使う）がいずれの spec ファイルにも記載されていない。既存の request-review でも指摘済み。 | tasks.md T-09 に「`resolveAuthConfig(process.env).adminEmail` をユーザー識別表示に使用する」または「`getUserRepository()` で userId から User を引いて email を取得する」いずれかの実装方針を注記として追加する。 |

## Review Notes

### セキュリティ評価サマリー

| OWASP カテゴリ | 評価 | 備考 |
|---|---|---|
| A01 Broken Access Control | ⚠️ 要修正 | `next` パラメータ open redirect（Finding #1） |
| A02 Cryptographic Failures | ✅ 問題なし | HMAC-SHA256、httpOnly、secure in production |
| A03 Injection | ✅ 問題なし | zod による入力検証、SQL レイヤー非該当 |
| A04 Insecure Design | ✅ 許容範囲 | レート制限・ロックアウト欠如はスコープ外と明示 |
| A05 Security Misconfiguration | ✅ 問題なし | Cookie 属性（httpOnly / sameSite=lax / path=/ / secure 本番のみ）適切 |
| A07 Identification & Auth Failures | ✅/⚠️ | エラーメッセージ単一化 ✅、タイミング均一化は後続スコープ（Finding #2） |

### 仕様整合性確認

- `verifySession`（HMAC-SHA256, Web Crypto）は edge runtime で動作可能 ✅
- middleware は `request.cookies`（edge 互換）、`session-cookie.ts` は `next/headers`（Server Component / Server Action 専用）と役割分離できている ✅
- `config.matcher` による静的アセット除外と `isPublicPath()` による公開パス判定の二層構造（D7）は設計として一貫 ✅
- `setSessionCookie(payload: Omit<SessionPayload, 'exp'>)` のシグネチャと T-07 の呼び出し `{ userId: user.id, role: user.role }` は整合 ✅
- `logoutAction(): Promise<void>` は `useActionState` 形式でなくてよい（`<form action={logoutAction}>` として使用するため） ✅
- `isPublicPath('/login/reset') === false`（完全一致）の追加ケースが tasks.md T-01 に含まれており、将来のパスワードリセット UI 追加時の安全性を確保している ✅
- spec.md は rules.md の記法規律（`### Requirement:` / `#### Scenario:` / `SHALL` / Given-When-Then）に準拠 ✅

### Finding #1 修正例（参考）

tasks.md T-07 への追記案:

```
- `next` パラメータは `/` で始まる相対パスのみ許容する。`next` が falsy・`/` で始まらない・`//` で始まる場合はフォールバック先を `/` にする（外部 URL へのオープンリダイレクト防止）
- 例: `const safeNext = next && /^\/(?!\/)/.test(next) ? next : '/';`
```

spec.md への追加 Scenario 案:

```
#### Scenario: External URL in next parameter falls back to root

**Given** the login action is invoked with valid credentials and `next=https://evil.com`
**When** authentication succeeds
**Then** the response redirects to `/` (not the external URL)
```
