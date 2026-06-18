# apps/web に認証の土台（パスワードハッシュ・署名付きセッショントークン・User リポジトリ配線 ＋ owner ブートストラップ・認証 use-case）を確立する

## Meta

- **type**: new-feature
- **slug**: auth-foundation
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 新しい port/adapter 追加、既存パターンと異なる設計選択、振る舞い/契約を変える修正、構造的リファクタリング → true。いずれにも該当しない → false -->
<!-- adr=true の理由: パスワードハッシュ方式・セッション署名方式・認証情報のブートストラップ方針という、セキュリティに関わる新しい設計選択を導入するため。 -->

## 背景

`packages/iam` で `User` / `Role` / `Permission` / `can` / `UserRepository`（in-memory）を確立済みだが、配信層（`apps/web`）には一切配線されておらず、全ルートが無認証で開いている。本リクエストは認証の**土台**——配信境界に閉じたパスワードのハッシュ化・検証、署名付きセッショントークンの発行・検証、`UserRepository` の composition-root 配線と owner ユーザーの env ブートストラップ、認証 use-case——を確立する。

**ログイン画面・セッション Cookie の読み書き・ミドルウェアによるルート保護・ナビの表示は本リクエストのスコープ外**（後続スライス `auth-login-ui`）。本リクエストは Next ランタイム（`next/headers` の `cookies()` 等）に依存しない**純粋に単体テスト可能な関数群**に閉じる。`docs/アーキテクチャ/domain-model.md` の通り、パスワードのハッシュ化・検証は配信の責務であり、ドメイン（`User.passwordHash`）は不透明に保持するのみ。

## 現状コードの前提

- `packages/iam/src/index.ts` が `createUser` / `updateUser` / `User` / `Role` / `createInMemoryUserRepository` / `UserRepository` を export 済み（`packages/iam/src/index.ts:1`）。
- `createUser(params)` は `id?: Id<'User'>` を受け付ける（省略時 `createId` でランダム生成）。`email` 非空が不変条件（`packages/iam/src/user.ts:12`）。
- `apps/web/lib/composition-root.ts` は `getCustomerRepository` 等を `mode === 'drizzle' ? Drizzle : in-memory` で返す getter パターンを確立済み。`@koma/iam` には未依存（`apps/web/lib/composition-root.ts:1`）。
- `apps/web/lib/persistence-mode.ts` の `selectPersistenceMode({ DATABASE_URL })` が `'drizzle' | 'memory'` を返す（`apps/web/lib/persistence-mode.ts:1`）。
- `apps/web/package.json` は `@koma/iam` に未依存。

## 要件

<!-- 最重量部: (a) パスワードハッシュとセッション署名を依存ライブラリなしで Node 標準 crypto / Web Crypto に閉じること、(b) 本番では認証情報 env を必須にしつつ dev では起動可能にする env ポリシー。 -->

1. **パスワードのハッシュ化・検証**（`apps/web/lib/password.ts`）。`node:crypto` の `scrypt`（非同期）＋ ハッシュごとのランダム 16 byte salt を使い、依存ライブラリを追加しない。`hashPassword(plain: string): Promise<string>`（salt 込みの自己完結文字列を返す。形式は実装裁量だが salt を内包すること）／ `verifyPassword(plain: string, stored: string): Promise<boolean>`（比較は `crypto.timingSafeEqual` で定数時間）。

2. **署名付きセッショントークン**（`apps/web/lib/session.ts`）。**Web Crypto（`crypto.subtle`、Node / edge 双方で利用可）** の HMAC-SHA256 で署名し、依存ライブラリを追加しない。ペイロードは `{ userId: string; role: Role; exp: number }`（`exp` は epoch ミリ秒）。`signSession(payload, secret): Promise<string>`（`base64url(JSON).base64url(署名)` 形式）／ `verifySession(token, secret, now): Promise<SessionPayload | null>`（署名不一致・形式不正・`now >= exp` は `null`。署名比較は定数時間相当）。**Cookie の読み書きはスコープ外**（純粋なトークン署名・検証のみ）。署名のみで暗号化しない理由はペイロードが非秘匿（userId ＋ role）だから。改竄（role 昇格等）は署名検証で弾く。

3. **認証 env の解決**（`apps/web/lib/auth-config.ts`）。`SESSION_SECRET` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` を env から解決する純関数 `resolveAuthConfig(env): { sessionSecret; adminEmail; adminPassword }`。**本番（`NODE_ENV === 'production'`）では 3 つ全て必須**（欠落時は明示的に throw）。**dev / test では文書化された fallback**（`SESSION_SECRET` = 固定 dev 値・`ADMIN_EMAIL` = `admin@example.com`・`ADMIN_PASSWORD` = `password`）で起動可能にする。fallback はコメントで「dev 専用」と明示する。

4. **`UserRepository` の配線 ＋ owner ブートストラップ**（`apps/web/lib/composition-root.ts`）。既存 getter に倣い `getUserRepository(): Promise<UserRepository>` を追加する（in-memory 実装。**Drizzle 永続化はスコープ外**で `iam` と整合）。初回初期化時に、`resolveAuthConfig` の `adminEmail` / `adminPassword` から **owner ユーザー 1 件をシードする**（`role: 'owner'`、`passwordHash` は `hashPassword(adminPassword)`、`id` は**安定した固定値**を `createUser({ id })` に渡してプロセス再起動後もセッションが失効しないようにする）。シードは初回 1 回のみ・冪等。

5. **認証 use-case**（`apps/web/lib/authenticate.ts`）。`authenticate(repo: UserRepository, email: string, password: string): Promise<User | null>` ＝ `repo.findByEmail(email)` → 見つからなければ `null` → `verifyPassword` 成功なら `User`・失敗なら `null`。

6. **依存追加**。`apps/web/package.json` に `@koma/iam`（`workspace:*`）を追加する。`next` / `react` 以外の新規ランタイム依存（bcrypt / jose / iron-session 等）は**追加しない**。

7. すべて vitest テストを伴い、`apps/web` の既存テスト・ビルドを壊さない。

## スコープ外

- ログイン画面 UI・ログイン/ログアウト server action・セッション Cookie の set/read/clear（`next/headers`）・ミドルウェアによるルート保護・ナビのユーザー表示 — 後続スライス `auth-login-ui`
- `User` の Drizzle 永続化（後続。本リクエストは in-memory ＋ env シード）
- パスワードリセット・ユーザー登録 UI・複数ユーザー管理 UI
- レート制限・ロックアウト・監査ログ
- メール検証フォーマットの厳密化

## 受け入れ基準

<!-- 機械検証できる文にする。 -->

- [ ] `apps/web/package.json` が `@koma/iam` に依存し、`grep -E '"(bcrypt|argon2|jose|iron-session)"' apps/web/package.json` が 0 件
- [ ] `password`: `hashPassword` → `verifyPassword` が正しいパスワードで `true`・誤りで `false`、同一パスワードでも 2 回のハッシュが異なる（salt 効果）、をテストで固定する
- [ ] `session`: `signSession` → `verifySession` のラウンドトリップが元ペイロードを復元、改竄トークンは `null`、`now >= exp` は `null`、をテストで固定する
- [ ] `auth-config`: `NODE_ENV=production` で env 欠落時に throw、dev で fallback を返す、をテストで固定する
- [ ] `authenticate`: 未登録メールで `null`、誤パスワードで `null`、正しい資格情報で当該 `User`、をテストで固定する（in-memory repo にシードしたユーザーで）
- [ ] owner ブートストラップ: シード後 `getUserRepository().findByEmail(adminEmail)` が `role: 'owner'` の `User` を返し、`id` が固定値である、をテストで固定する
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test && pnpm -r --if-present run build` が green

## architect 評価済みの設計判断

<!-- 採用案 + 却下案。 -->

- **パスワードハッシュは `node:crypto` の `scrypt` ＋ ランダム salt ＋ 定数時間比較**。却下: bcrypt / argon2（ネイティブ依存・パッケージサイズ増。本プロジェクトは小型維持方針）。scrypt は標準ライブラリのメモリハード KDF で依存ゼロ。
- **セッションは HMAC-SHA256 署名付き Cookie トークン（Web Crypto・依存ゼロ）。暗号化はしない**。却下: jose / iron-session（依存追加）。ペイロードは非秘匿（userId ＋ role）なので署名で改竄防止すれば十分。Web Crypto を選ぶのは後続スライスの edge ミドルウェアでも同じ検証コードが使えるため（Node 専用の `node:crypto` HMAC を避ける）。
- **トークン署名・検証は Cookie I/O と分離した純関数**。Cookie の set/read/clear（`next/headers`）は Next ランタイム依存のため後続スライスに置き、土台は単体テスト可能に保つ。
- **owner は env からブートストラップ（固定 id でシード）**。却下: 初回サインアップで owner 作成（UI・状態分岐が増える）／ デフォルト資格情報をハードコード（本番で危険）。本番は env 必須・dev のみ fallback で、起動可能性とセキュリティを両立。固定 id は in-memory モードで再起動後もセッションを有効に保つため。
- **`User` ≠ `Resource`**（ログイン identity と予約資源は別。`iam` の決定を踏襲）。
- **adr: true** の理由: パスワードハッシュ方式・セッション署名方式・認証情報ブートストラップというセキュリティ設計選択を記録する。
