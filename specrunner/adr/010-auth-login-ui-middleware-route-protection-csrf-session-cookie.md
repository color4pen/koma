# ADR-010: 認証 UI 層 — Next middleware ルート保護・sameSite=lax CSRF 防御・セッション Cookie 属性・Next ランタイム依存と純関数の分離

- **status**: accepted
- **date**: 2026-06-18
- **change**: auth-login-ui
- **deciders**: architect, spec-runner

## Context

ADR-009 で認証の土台（`signSession` / `verifySession` / `authenticate` / `resolveAuthConfig` / `getUserRepository` + owner シード）を確立した。これらはすべて Next ランタイム非依存の純粋関数・非同期関数として実装されている。

本 change はこれらの土台を **Next.js ランタイム**（`next/headers` の async `cookies()` · middleware edge runtime · Server Actions · page/layout）に結線し、「未認証では業務画面に到達できない」状態を完成させる。

以下のコンポーネントを新たに追加する:

- セッション Cookie の set/read/clear（`apps/web/lib/session-cookie.ts`）
- ルート保護判定の純関数（`apps/web/lib/route-protection.ts`）
- Next middleware によるゲート検証（`apps/web/middleware.ts`）
- ログイン入力検証の純関数（`apps/web/lib/parse-login-input.ts`）
- ログイン/ログアウト Server Actions（`apps/web/app/login/actions.ts`）
- ログイン画面 UI（`apps/web/app/login/page.tsx` + `login-form.tsx`）
- ナビのログアウト導線（`apps/web/app/layout.tsx` の async Server Component 化）

制約:

- `next ^15.1.0` — `cookies()` は async（`await cookies()`）
- `verifySession` は Web Crypto（`crypto.subtle`）ベースのため edge runtime で動作可能
- 既存 Server Actions は `useActionState` 形式（`(_prevState, formData) => Promise<ActionState>`）
- 入力検証は `zod/v4/mini` で純関数化する既存パターン
- 新規外部ランタイム依存（jose / iron-session / next-auth 等）を追加しない

## Decisions

### D1: セッション Cookie 属性と TTL

Cookie 名 `koma_session`。属性: `httpOnly`・`sameSite=lax`・`secure`（`NODE_ENV==='production'` のみ）・`path=/`。TTL は定数 `SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000`（7 日）。`maxAge` は秒単位（TTL / 1000）、ペイロードの `exp = Date.now() + TTL_MS`。`setSessionCookie(payload)` が `exp` を内部計算するため呼び出し元に TTL 計算を漏らさない。

- **採用理由**: `secure` を本番限定にするのは dev 環境（`http://localhost`）で `secure` 属性付き Cookie が送信されないため。`sameSite=lax` は CSRF の第一防衛線として機能し、Server Actions の同一オリジン POST と組み合わせることで外部フォームからのクロスサイト送信を抑止する。
- **却下**: `sameSite=strict` — OAuth callback や外部リンクからの遷移でセッション Cookie が送られず UX が劣化する。

---

### D2: ルート保護方式 — Next middleware（edge runtime）ゲート

Next middleware（edge runtime）で全リクエストを横断的にゲートする。middleware は `verifySession`（Web Crypto、ADR-009 D2）で署名と有効期限のみを検証し、DB アクセスを行わない。検証失敗時は `/login?next=<元パス>` へ redirect する。

middleware は「門番」に徹し、ユーザー実体の取得（`getUserRepository`）は page 側が行う。

- **採用理由**: 横断的な保護を 1 箇所で担保でき、個別 page/layout でのガード漏れを防ぐ。`verifySession` が Web Crypto ベースであるため edge runtime 制約を満たす。DB を引かないため middleware の実行コストが低い。
- **却下**: 各 page/layout で `readSession()` を呼ぶガード方式 — 新規ページを追加した際に保護漏れが生じやすく、横断性がない。

---

### D3: CSRF 防御 — `sameSite=lax` + Server Actions 暗黙的防御（明示的トークンなし）

`sameSite=lax` Cookie と Next Server Actions（同一オリジン POST のみ受理）の組み合わせを CSRF 防御とし、独自の明示的 CSRF トークン機構は持たない。

- **採用理由**: Server Actions は `POST` + 同一オリジンが前提であり、`sameSite=lax` がクロスサイトからのフォーム送信を抑止する。明示的トークン機構は複雑化に見合う追加防御が薄く、将来の拡張余地として残す。
- **却下**: 独自ダブルサブミット Cookie パターン — 実装・テストコストに対して追加防御が薄い。本スコープでは `sameSite=lax` + Server Actions の暗黙的防御で十分と判断した。

---

### D4: Next ランタイム依存と純関数の分離

| レイヤー | ファイル | 性質 | テスト |
|---------|---------|------|--------|
| 純関数 | `lib/route-protection.ts` | Next 非依存 | vitest 単体 |
| 純関数 | `lib/parse-login-input.ts` | Next 非依存 | vitest 単体 |
| 薄ラッパー | `lib/session-cookie.ts` | `next/headers` 依存 | テスト対象外 |
| 配線 | `middleware.ts` | edge runtime | テスト対象外 |
| 配線 | `app/login/actions.ts` | Server Action | テスト対象外 |
| 配線 | `app/login/page.tsx` | React page | テスト対象外 |

テスト価値のある判定ロジックを Next 非依存の純関数に切り出し、Next ランタイム依存のコードは配線に留める。`next/headers` の mock は実装詳細に結合し脆いため採用しない。

- **採用理由**: `route-protection` と `parse-login-input` は入出力が明確な純関数であり vitest 単体テストが容易。middleware / server action / cookie I/O はランタイム依存が深く、モック込みテストの保守コストが高い割に信頼性が低い。
- **却下**: middleware / server action を vitest でモック込み統合テスト — `next/headers` や `redirect` の mock が Next.js 実装詳細に結合するため脆く、保守コストが高い。

---

### D5: ログイン失敗エラーメッセージ — 資格情報種別を非開示

ログイン失敗（メールアドレス不在・パスワード誤り）は「メールアドレスまたはパスワードが正しくありません」の単一メッセージを返す。メール不在とパスワード誤りを区別しない。

- **採用理由**: アカウント存在の推測（user enumeration）を UI で助長しない（OWASP A07 対策）。タイミング均一化・レート制限は後続スコープとして分離する。
- **却下**: 「メールアドレスが見つかりません」等の親切メッセージ — アカウント存在の推測に利用される。

---

### D6: ナビの認証状態依存表示 — async Server Component 化

`apps/web/app/layout.tsx` を async Server Component に昇格し、`readSession()` で認証状態を取得する。認証時は業務ナビリンク＋ログアウトボタン（`<form action={logoutAction}>` による Server Action 直呼び出し）を表示する。未認証時（`/login` ページ）は業務ナビリンクを非表示にする。

セッションペイロードに email フィールドがないため、ユーザー識別表示は `resolveAuthConfig(process.env).adminEmail` で補う（単一オーナー前提）。

- **採用理由**: middleware が全保護ルートをゲートするため、未認証で layout に到達するのは `/login` のみ。`readSession()` は layout 内で安全に呼べる。Server Component で完結するため client-side fetch の往復が不要。
- **却下**: Client Component でセッション API を fetch — 不要な往復が発生し、SSR の利点を失う。

---

### D7: `config.matcher` と `isPublicPath` の役割分担

middleware の `config.matcher` は Next.js 内部の静的アセット（`_next/static` · `_next/image` · `favicon.ico`）を**呼び出し自体から除外**する（パフォーマンス最適化・フレームワーク機能）。`isPublicPath` はアプリケーションレベルの public パス判定（`/login` 等）を担う純関数として独立する。

`isPublicPath` は完全一致（`/login`・`/favicon.ico`）と前方一致（`/_next/` で始まる）で判定する。`/login/reset` 等の `login` サブパスは保護対象とするため前方一致ではなく完全一致とする。

- **採用理由**: matcher はフレームワーク最適化、`isPublicPath` はビジネスロジック。関心を分離することで `isPublicPath` を純関数として vitest で単体テスト可能に保つ。

---

### D8: open redirect 防止

ログイン成功後の redirect 先（`next` クエリパラメータ）は `typeof next === 'string' && next.startsWith('/') && !next.startsWith('//')` で検証し、外部 URL への open redirect を防ぐ。検証を通過しない場合はデフォルト `/` へ redirect する。

- **採用理由**: CWE-601（URL Redirection to Untrusted Site）への対処。`/customers` 等の相対パスのみを受け付ける。

## Alternatives Considered

### Alternative 1: 各 page/layout での個別 `readSession` ガード

各 page が `readSession()` を呼び出し、セッション不在時に `/login` へ redirect する方式。

**Pros**: ページごとに保護要件を細かく制御できる。middleware の edge runtime 制約を回避できる。

**Cons**: 新規ページ追加時に保護実装を忘れると未認証アクセスが通ってしまう（保護漏れリスク）。横断的な保護が 1 箇所に集約されない。

**Why not**: middleware によるゲートは保護漏れを構造的に防ぐ。`verifySession` が Web Crypto ベースであるため edge runtime 制約を満たせる。

---

### Alternative 2: 独自 CSRF トークン機構

double-submit cookie パターン等で独自 CSRF トークンを実装する方式。

**Pros**: より明示的な CSRF 防御。将来の要件変化に対して堅牢。

**Cons**: 実装・テストコストが高い。Server Actions の同一オリジン前提と `sameSite=lax` でカバーされる脅威に対して過剰な防御となる。

**Why not**: Server Actions は同一オリジン POST 前提であり、`sameSite=lax` がクロスサイト送信を抑止するため本スコープでは十分。

---

### Alternative 3: jose / iron-session によるセッション Cookie 管理

`jose`（JWE）や `iron-session`（暗号化 Cookie）等の外部ライブラリを使用してセッション管理を行う方式。

**Pros**: 暗号化 Cookie で payload を隠蔽できる。ライブラリの API が扱いやすい。

**Cons**: 外部依存追加。ADR-009 で確立した依存ゼロ方針に反する。`verifySession` を edge ランタイムで再利用できなくなる可能性がある。

**Why not**: `userId` + `role` は非秘匿情報であり HMAC 署名で改竄防止すれば十分（ADR-009 D2）。外部ライブラリを追加しなくても同等の機能を実現できる。

---

### Alternative 4: `sameSite=strict` によるより厳格な CSRF 防御

Cookie に `sameSite=strict` を設定し、クロスサイト遷移でのセッション Cookie 送信を完全に禁止する方式。

**Pros**: より厳格なクロスサイトリクエスト制御。

**Cons**: 外部サイトのリンクからアプリに遷移した際にセッション Cookie が送信されず、認証済みユーザーが `login` にリダイレクトされる UX の劣化が生じる。

**Why not**: `sameSite=lax` は GET ナビゲーション（リンク遷移）でセッション Cookie を送信しつつ、POST フォームのクロスサイト送信を抑止する。本スコープの CSRF 脅威モデルでは `lax` で十分。

## Consequences

### Positive

- middleware による横断的ルート保護が確立され、新規ページを追加しても保護漏れが発生しない構造になる
- `verifySession`（Web Crypto）を edge runtime で直接利用できるため、ライブラリ追加なしにゲート検証が完結する
- 純関数（`route-protection` / `parse-login-input`）を vitest で完全に単体テスト可能に保ちながら、Next ランタイム依存コードは最薄の配線層に閉じられる
- `sameSite=lax` + Server Actions の組み合わせにより、明示的トークン機構なしで CSRF 防御が実現される
- `httpOnly` Cookie により XSS 経由のセッション Cookie 窃取を防ぐ
- 資格情報エラーの単一メッセージにより、UI 層での user enumeration 助長を排除する

### Negative / Trade-offs

- middleware は DB を引かないため、パスワード変更やアカウント無効化が即時反映されない（既存セッションは `exp` まで有効）。7 日 TTL で緩和しているが、即時 revocation が必要になった場合は deny-list の導入が必要
- タイミング差による user enumeration（`authenticate()` がメール不在時にパスワードハッシュ検証をスキップするため応答時間が異なる）は本スライスのスコープ外。後続スライスでダミーハッシュ値への常時 `scrypt` 実行によるタイミング均一化が必要
- `sameSite=lax` は `strict` より緩い。より厳格な CSRF 防御が要件になった場合は明示的トークン機構の追加が必要
- E2E テスト（middleware redirect・Cookie set/clear の統合動作）は本スライスのスコープ外。手動確認に依存しており、後続で Playwright 基盤を追加する必要がある
- セッション TTL 固定（7 日）で Remember me・スライディング有効期限なし。単一オーナー利用では現時点で許容

## References

- `specrunner/adr/009-auth-foundation-password-hash-session-signing-env-bootstrap.md` — 認証土台の設計判断
- `specrunner/adr/006-web-delivery-layer-composition-root-server-action-zod-mini-boundary.md` — Server Action パターン・composition root
- `specrunner/changes/auth-login-ui/design.md` — 詳細設計判断（D1〜D7）
- `apps/web/middleware.ts` — middleware ゲート実装
- `apps/web/lib/session-cookie.ts` — Cookie I/O 薄ラッパー実装
- `apps/web/lib/route-protection.ts` — `isPublicPath` 純関数実装
- `apps/web/lib/parse-login-input.ts` — ログイン入力検証純関数実装
- `apps/web/app/login/actions.ts` — ログイン/ログアウト Server Actions 実装
- `apps/web/app/layout.tsx` — async Server Component ナビ・ログアウト導線実装
