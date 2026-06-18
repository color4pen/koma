# apps/web に認証の上物（ログイン画面・ログイン/ログアウト server action・セッション Cookie I/O・ミドルウェアによるルート保護・ナビのログアウト導線）を確立する

## Meta

- **type**: new-feature
- **slug**: auth-login-ui
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 新しい port/adapter 追加、既存パターンと異なる設計選択、振る舞い/契約を変える修正、構造的リファクタリング → true。いずれにも該当しない → false -->
<!-- adr=true の理由: ルート保護方式（ミドルウェア）・CSRF 防御方針・セッション Cookie 属性という、セキュリティに関わる新しい設計選択を導入するため。 -->

## 背景

`auth-foundation` で認証の土台（`lib/password.ts` のハッシュ/検証、`lib/session.ts` の署名付きトークン、`lib/auth-config.ts` の env 解決、`getUserRepository` ＋ owner シード、`lib/authenticate.ts`）を確立済み。本リクエストはその**上物**——ログイン画面、ログイン/ログアウト server action、セッション Cookie の set/read/clear、ミドルウェアによる全ルート保護、ナビのログアウト導線——を配線し、**未認証では業務画面に到達できない**状態を完成させる。

土台の純関数（`signSession` / `verifySession` / `authenticate` / `resolveAuthConfig`）を Next ランタイム（`next/headers` の `cookies()`・middleware・server action・page）に結線するのが本スライスの責務。Next ランタイム依存で単体テストしにくい薄いラッパーと、テスト可能な純粋ロジック（入力検証・ルート保護判定）を分離する。

## 現状コードの前提

- `apps/web/lib/session.ts` が `signSession(payload, secret): Promise<string>` / `verifySession(token, secret, now?): Promise<SessionPayload|null>` / 型 `SessionPayload = { userId: string; role: Role; exp: number }`（`exp` は epoch ミリ秒）を export（`apps/web/lib/session.ts:1`）。
- `apps/web/lib/auth-config.ts` の `resolveAuthConfig(env): { sessionSecret; adminEmail; adminPassword }` は `env` を引数で受ける純関数で、本番（`NODE_ENV==='production'`）は 3 env 必須・dev は fallback（`apps/web/lib/auth-config.ts:19`）。
- `apps/web/lib/composition-root.ts` が `getUserRepository(): Promise<UserRepository>`（owner を固定 ID `OWNER_USER_ID` でシード）と `OWNER_USER_ID` を export（`apps/web/lib/composition-root.ts:18`,`:142`）。
- `apps/web/lib/authenticate.ts` の `authenticate(repo, email, password): Promise<User|null>`（`apps/web/lib/authenticate.ts:9`）。
- `next` は `^15.1.0` のため `cookies()`（`next/headers`）は **async**（`await cookies()`）。
- 既存 server action は `'use server'` ＋ `useActionState` 形式（`(_prevState, formData) => Promise<ActionState>`）、入力検証は `zod/v4/mini`（`apps/web/lib/parse-customer-input.ts:1`, `apps/web/app/customers/actions.ts:1`）。
- `apps/web/app/layout.tsx` は固定ナビ（ホーム/顧客/リソース/サービス/予約）でセッション非依存（`apps/web/app/layout.tsx`）。
- `apps/web/middleware.ts` は未作成。`apps/web/app/login/` は未作成。

## 要件

<!-- 最重量部: (a) middleware（edge runtime）で Web Crypto ベースの verifySession を使い全ルートを保護、(b) Next ランタイム依存を薄いラッパーに閉じ、判定ロジックを純関数に切り出してテスト可能にする。 -->

1. **セッション Cookie I/O**（`apps/web/lib/session-cookie.ts`）。`next/headers` の `cookies()`（async）を使い、Cookie 名 `koma_session`・属性 `httpOnly` / `sameSite=lax` / `secure`（本番のみ）/ `path=/` / `maxAge`（セッション TTL と整合）で set/read/clear する薄いラッパー。`setSessionCookie(payload)` / `readSession(): Promise<SessionPayload|null>`（無効/不在は `null`）/ `clearSessionCookie()`。secret は `resolveAuthConfig(process.env)` から。セッション TTL は定数（例 7 日）で `exp = now + TTL`。

2. **ルート保護判定（純関数）**（`apps/web/lib/route-protection.ts`）。`isPublicPath(pathname): boolean` を提供する。`/login` と Next 静的アセット（`/_next/...`・`/favicon.ico` 等）を public、それ以外を保護対象と判定する。middleware はこれを用いる。

3. **ミドルウェア**（`apps/web/middleware.ts`）。リクエスト Cookie から `koma_session` を読み、`verifySession` で検証。`isPublicPath` でない経路で検証が `null`（不在/無効/期限切れ）の場合 `/login?next=<元パス>` へ redirect。secret は `resolveAuthConfig(process.env)`。`config.matcher` で `_next/static`・`_next/image`・`favicon.ico` を除外。edge runtime で動くこと（`verifySession` は Web Crypto なので可）。

4. **ログイン入力検証（純関数）**（`apps/web/lib/parse-login-input.ts`）。既存 `parse-*-input.ts` に倣い `zod/v4/mini` で `email`（非空）・`password`（非空）を検証する `parseLoginInput(raw): { ok: true; email; password } | { ok: false; errors }`。

5. **ログイン/ログアウト server action**（`apps/web/app/login/actions.ts`）。`useActionState` 形式。ログイン: `parseLoginInput` → `authenticate(await getUserRepository(), email, password)` → 成功で `setSessionCookie({ userId, role, exp })` ＋ `next`（無ければ `/`）へ redirect、失敗は **資格情報の種別を漏らさない単一メッセージ**（例「メールアドレスまたはパスワードが正しくありません」）を返す。ログアウト: `clearSessionCookie()` ＋ `/login` へ redirect。

6. **ログイン画面**（`apps/web/app/login/page.tsx` ＋ クライアントフォーム）。email / password 入力、`next` クエリパラメータを引き継ぐ、エラーメッセージ表示。

7. **ナビのログアウト導線**（`apps/web/app/layout.tsx`）。`readSession()` でログイン中ユーザーを取得し、認証時はユーザー識別（email）＋ログアウトボタンを表示する。`/login`（未認証）ではナビ業務リンクを出さない。

8. 純粋ロジック（`parse-login-input` / `route-protection`）に vitest テストを伴う。Next ランタイム依存（middleware / server action / cookie I/O / page）は薄いラッパーに留め、E2E は本スライス対象外。新規ランタイム依存（jose / iron-session 等）を追加しない。既存テスト・ビルドを壊さない。

## スコープ外

- レート制限・ログイン試行ロックアウト・`authenticate` のタイミング均一化（user enumeration timing 対策）
- パスワードリセット・ユーザー登録 UI・複数ユーザー管理 UI
- Remember me・スライディング有効期限（アクセス毎のセッション更新）
- 明示的 CSRF トークン（後述の設計判断で `sameSite=lax` ＋ Server Actions の同一オリジン POST を防御とする）
- ロールに応じた画面/操作の出し分け（`can()` を用いた認可の UI 適用は後続）
- E2E（Playwright 等）テスト基盤の追加

## 受け入れ基準

<!-- 機械検証できる文にする。 -->

- [ ] `apps/web/middleware.ts` が存在し、`config.matcher` で `_next/static` / `_next/image` / `favicon.ico` を除外している
- [ ] `route-protection`: `isPublicPath('/login')` と `isPublicPath('/_next/static/x.js')` が `true`、`isPublicPath('/customers')` と `isPublicPath('/')` が `false`、をテストで固定する
- [ ] `parse-login-input`: `email` 空・`password` 空で `ok:false`、両方非空で `ok:true` ＋ 値を返す、をテストで固定する
- [ ] `apps/web/app/login/page.tsx` と `apps/web/app/login/actions.ts`（ログイン/ログアウト）が存在する
- [ ] `apps/web/app/layout.tsx` にログアウトの導線（ログアウト server action 呼び出し）が含まれる
- [ ] `grep -E '"(jose|iron-session|next-auth|@auth/)"' apps/web/package.json` が 0 件
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test && pnpm -r --if-present run build` が green（既存テストは無変更で green）

## architect 評価済みの設計判断

<!-- 採用案 + 却下案。 -->

- **ルート保護は Next middleware（edge runtime）で署名付き Cookie をゲート検証**。却下: 各 page / layout で個別に `readSession` ガード（保護漏れが起きやすい・横断性が無い）。middleware は DB を引かず、土台の `verifySession`（Web Crypto なので edge 可）で署名・有効期限のみ検証する“ゲート”に徹し、ユーザー実体の取得は page 側が行う。
- **CSRF は `sameSite=lax` Cookie ＋ Next Server Actions の同一オリジン POST を防御とし、明示的トークンは持たない**。却下: 独自 CSRF トークン機構（複雑化）。Server Actions は同一オリジン POST 前提で、`sameSite=lax` がクロスサイト送信を抑止するため、本スコープでは十分と判断（明示的トークンは将来の拡張余地）。
- **資格情報エラーは種別を漏らさない単一メッセージ**（メール不在もパスワード誤りも同一文言）。アカウント存在の推測（user enumeration）を UI で助長しない。タイミング均一化・レート制限はスコープ外として別途。
- **Next ランタイム依存は薄いラッパー、判定ロジックは純関数に分離**（`route-protection` / `parse-login-input` をテスト対象に、middleware / server action / cookie I/O / page は配線に留める）。却下: middleware / server action を丸ごと統合テスト（Next ランタイム模擬が重く脆い）。
- **セッション Cookie は `httpOnly` / `sameSite=lax` / `secure`（本番のみ）/ `path=/`**、TTL は定数で `exp` と整合。`secure` を本番限定にするのは dev の `http://localhost` で Cookie が落ちないため。
- **owner の固定 `OWNER_USER_ID` 前提でセッションは再起動耐性**（土台の決定を踏襲。in-memory モードでも再起動後にセッションが有効）。
- **adr: true** の理由: ルート保護方式・CSRF 防御方針・セッション Cookie 属性というセキュリティ設計選択を記録する。
