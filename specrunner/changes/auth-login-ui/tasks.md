# Tasks: auth-login-ui

## T-01: ルート保護判定の純関数 (`apps/web/lib/route-protection.ts`)

- [ ] `apps/web/lib/route-protection.ts` を作成する
- [ ] `isPublicPath(pathname: string): boolean` を export する
- [ ] `/login` を public と判定する（完全一致）
- [ ] `/_next/` で始まるパスを public と判定する（前方一致）
- [ ] `/favicon.ico` を public と判定する（完全一致）
- [ ] それ以外（`/`・`/customers`・`/resources` 等）を保護対象（`false`）と判定する

**Acceptance Criteria**:
- `isPublicPath('/login')` === `true`
- `isPublicPath('/_next/static/x.js')` === `true`
- `isPublicPath('/favicon.ico')` === `true`
- `isPublicPath('/customers')` === `false`
- `isPublicPath('/')` === `false`
- `isPublicPath('/login/reset')` === `false`（`/login` 完全一致のみ）

---

## T-02: ルート保護判定テスト (`apps/web/lib/route-protection.test.ts`)

- [ ] `apps/web/lib/route-protection.test.ts` を作成する
- [ ] T-01 の Acceptance Criteria の全ケースを vitest テストとして実装する
- [ ] テストが green であることを確認する

**Acceptance Criteria**:
- `pnpm --filter @koma/web run test -- route-protection` が green
- T-01 の全判定ケースが検証されている

---

## T-03: ログイン入力検証の純関数 (`apps/web/lib/parse-login-input.ts`)

- [ ] `apps/web/lib/parse-login-input.ts` を作成する
- [ ] `zod/v4/mini` でスキーマを定義する: `email`（`z.string()` + `z.minLength(1)`）、`password`（`z.string()` + `z.minLength(1)`）
- [ ] `parseLoginInput(raw: unknown): ParseLoginInputResult` を export する
- [ ] 戻り値型: `{ ok: true; email: string; password: string } | { ok: false; errors: Record<string, string[]> }`
- [ ] エラー集約は既存 `parse-customer-input.ts` のパターンに倣う（`issue.path[0]` をキーに `errors` map を構築）

**Acceptance Criteria**:
- `parseLoginInput({ email: 'a@b.c', password: 'x' })` → `{ ok: true, email: 'a@b.c', password: 'x' }`
- `parseLoginInput({ email: '', password: 'x' })` → `{ ok: false, errors: { email: [...] } }`
- `parseLoginInput({ email: 'a@b.c', password: '' })` → `{ ok: false, errors: { password: [...] } }`
- `parseLoginInput({})` → `{ ok: false, errors }` に `email` と `password` のキーが含まれる

---

## T-04: ログイン入力検証テスト (`apps/web/lib/parse-login-input.test.ts`)

- [ ] `apps/web/lib/parse-login-input.test.ts` を作成する
- [ ] T-03 の Acceptance Criteria の全ケースを vitest テストとして実装する
- [ ] テストが green であることを確認する

**Acceptance Criteria**:
- `pnpm --filter @koma/web run test -- parse-login-input` が green
- T-03 の全判定ケースが検証されている

---

## T-05: セッション Cookie I/O (`apps/web/lib/session-cookie.ts`)

- [ ] `apps/web/lib/session-cookie.ts` を作成する
- [ ] 定数 `SESSION_COOKIE_NAME = 'koma_session'` を定義する
- [ ] 定数 `SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000` を定義する
- [ ] `setSessionCookie(payload: Omit<SessionPayload, 'exp'>): Promise<void>` を実装する
  - `exp = Date.now() + SESSION_TTL_MS` を計算する
  - `signSession({ ...payload, exp }, secret)` でトークンを生成する
  - `(await cookies()).set(SESSION_COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: SESSION_TTL_MS / 1000 })` で set する
  - `secret` は `resolveAuthConfig(process.env).sessionSecret`
- [ ] `readSession(): Promise<SessionPayload | null>` を実装する
  - `(await cookies()).get(SESSION_COOKIE_NAME)` でトークンを取得する
  - 不在時は `null`
  - `verifySession(token, secret)` で検証し結果を返す
- [ ] `clearSessionCookie(): Promise<void>` を実装する
  - `(await cookies()).delete(SESSION_COOKIE_NAME)` で削除する

**Acceptance Criteria**:
- 3 関数が export されている
- `cookies()` を `await` で呼んでいる（Next 15 の async API）
- `secure` が `process.env.NODE_ENV === 'production'` で条件分岐している
- 外部依存（jose/iron-session 等）を import していない

---

## T-06: ミドルウェア (`apps/web/middleware.ts`)

- [ ] `apps/web/middleware.ts` を作成する
- [ ] `import { NextResponse } from 'next/server'` と `import type { NextRequest } from 'next/server'` を使用する
- [ ] `config` を export する: `matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']`
- [ ] `middleware(request: NextRequest)` 関数を export default（または named export `middleware`）する
- [ ] `request.cookies.get('koma_session')` でトークンを取得する
- [ ] `isPublicPath(request.nextUrl.pathname)` が `true` なら `NextResponse.next()` で通過する
- [ ] トークン不在または `verifySession(token, secret)` が `null` の場合、`/login?next=<pathname>` へ `NextResponse.redirect` する
- [ ] 検証成功なら `NextResponse.next()` で通過する
- [ ] `secret` は `resolveAuthConfig(process.env).sessionSecret`

**Acceptance Criteria**:
- `apps/web/middleware.ts` が存在する
- `config.matcher` が `_next/static`・`_next/image`・`favicon.ico` を除外している
- `isPublicPath` を使って `/login` を通過させている
- edge runtime で動作する（`crypto.subtle` のみ使用、Node.js 固有 API なし）
- DB アクセスなし

---

## T-07: ログイン/ログアウト Server Actions (`apps/web/app/login/actions.ts`)

- [ ] `apps/web/app/login/actions.ts` を作成する（先頭に `'use server'`）
- [ ] `LoginActionState` 型を定義する: `{ ok: true } | { ok: false; message?: string; errors?: Record<string, string[]> } | null`
- [ ] `loginAction(_prevState: LoginActionState, formData: FormData): Promise<LoginActionState>` を実装する
  - `formData` から `email`・`password`・`next` を取得する
  - `parseLoginInput({ email, password })` で検証。失敗時は `{ ok: false, errors }` を返す
  - `authenticate(await getUserRepository(), email, password)` で認証する
  - 認証失敗: `{ ok: false, message: 'メールアドレスまたはパスワードが正しくありません' }` を返す
  - 認証成功: `setSessionCookie({ userId: user.id, role: user.role })` を呼び、`redirect(next || '/')` する
- [ ] `logoutAction(): Promise<void>` を実装する
  - `clearSessionCookie()` を呼び、`redirect('/login')` する

**Acceptance Criteria**:
- `'use server'` ディレクティブが先頭にある
- `useActionState` 形式のシグネチャ（`_prevState, formData`）
- 認証失敗メッセージがメール不在とパスワード誤りで同一
- `redirect` は `next/navigation` から import
- 認証成功時に `setSessionCookie` を呼んでいる
- ログアウトで `clearSessionCookie` → `redirect('/login')`

---

## T-08: ログイン画面 (`apps/web/app/login/page.tsx`)

- [ ] `apps/web/app/login/page.tsx` を作成する
- [ ] `searchParams` から `next` クエリパラメータを取得する（Next 15: `searchParams` は `Promise`）
- [ ] クライアントフォームコンポーネントを作成する（`'use client'`、同ファイルまたは別ファイル `login-form.tsx`）
- [ ] `useActionState` で `loginAction` を bind する
- [ ] `email`（type="email"）と `password`（type="password"）の input を配置する
- [ ] hidden input `name="next"` で `next` パラメータを form に含める
- [ ] `state.errors` があればフィールド横にエラー表示する
- [ ] `state.message` があればフォーム上部に汎用エラー表示する
- [ ] submit ボタンを配置する

**Acceptance Criteria**:
- `apps/web/app/login/page.tsx` が存在する
- `next` クエリパラメータを form に引き継いでいる
- `useActionState` を使用している
- エラーメッセージの表示領域がある

---

## T-09: ナビのログアウト導線 (`apps/web/app/layout.tsx` 改修)

- [ ] `layout.tsx` の `RootLayout` を `async` 関数にする
- [ ] `readSession()` を呼んでセッション情報を取得する
- [ ] `pathname` の判定のため、ログイン画面かどうかを判定する方法を検討する（`readSession` が `null` なら `/login` と推定可能 — middleware が保護しているため、認証なしで layout に到達するのは public path のみ）
- [ ] セッションが `null` の場合（`/login` ページ）: 業務ナビリンクを非表示にする（Koma ロゴのみ表示）
- [ ] セッションがある場合: 業務ナビ＋ログアウト form（`logoutAction` を呼ぶ button）を表示する
- [ ] ログアウト form は `<form action={logoutAction}>` で Server Action を直接呼ぶ

**Acceptance Criteria**:
- `layout.tsx` が async Server Component
- `readSession` を import して呼んでいる
- `logoutAction` を import して form の action に設定している
- セッション `null` 時に業務リンクが表示されない
- セッションあり時にログアウトボタンが表示される

---

## T-10: 型チェック・テスト・ビルド確認

- [ ] `pnpm -r --if-present run check-types` が green
- [ ] `pnpm -r --if-present run test` が green（既存テスト含む）
- [ ] `pnpm -r --if-present run build` が green
- [ ] `grep -E '"(jose|iron-session|next-auth|@auth/)"' apps/web/package.json` が 0 件

**Acceptance Criteria**:
- 上記 4 コマンドすべてが正常終了する
- 新規外部認証ライブラリが追加されていない
