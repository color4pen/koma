# Tasks: auth-foundation

## T-01: `apps/web/package.json` に `@koma/iam` 依存を追加

- [x] `apps/web/package.json` の `dependencies` に `"@koma/iam": "workspace:*"` を追加する
- [x] `pnpm install` を実行してロックファイルを更新する
- [x] bcrypt / argon2 / jose / iron-session が `dependencies` / `devDependencies` に含まれていないことを確認する

**Acceptance Criteria**:
- `apps/web/package.json` の `dependencies` に `"@koma/iam": "workspace:*"` が存在する
- `grep -E '"(bcrypt|argon2|jose|iron-session)"' apps/web/package.json` が 0 件

## T-02: パスワードハッシュ化・検証関数（`apps/web/lib/password.ts`）

- [x] `apps/web/lib/password.ts` を新規作成する
- [x] `hashPassword(plain: string): Promise<string>` を実装する
  - `crypto.randomBytes(16)` でランダム 16-byte salt を生成
  - `crypto.scrypt`（非同期、Promise 化）で plain + salt からハッシュを導出（keyLength: 64）
  - 返却形式: `salt(hex):hash(hex)`（salt を内包した自己完結文字列）
- [x] `verifyPassword(plain: string, stored: string): Promise<boolean>` を実装する
  - stored から salt と hash を分離
  - 同じ salt で plain をハッシュし、`crypto.timingSafeEqual` で定数時間比較
  - 形式不正時は `false` を返す
- [x] `apps/web/lib/password.test.ts` を新規作成する
  - 正しいパスワードで `verifyPassword` が `true` を返す
  - 誤ったパスワードで `verifyPassword` が `false` を返す
  - 同一パスワードで 2 回 `hashPassword` した結果が異なる（salt のランダム性）
  - `hashPassword` の返却値が `salt:hash` 形式であること

**Acceptance Criteria**:
- `hashPassword('test') → verifyPassword('test', hash)` が `true`
- `hashPassword('test') → verifyPassword('wrong', hash)` が `false`
- `hashPassword('test')` を 2 回呼んだ結果が不一致（salt 効果）
- テストが vitest で green

## T-03: 署名付きセッショントークン関数（`apps/web/lib/session.ts`）

- [x] `apps/web/lib/session.ts` を新規作成する
- [x] `SessionPayload` 型を定義: `{ userId: string; role: Role; exp: number }`（`Role` は `@koma/iam` から import）
- [x] `signSession(payload: SessionPayload, secret: string): Promise<string>` を実装する
  - payload を JSON 文字列化 → base64url エンコード
  - `crypto.subtle.importKey` で secret から HMAC-SHA256 鍵を生成
  - `crypto.subtle.sign` で署名を生成 → base64url エンコード
  - 返却形式: `base64url(JSON).base64url(signature)`
- [x] `verifySession(token: string, secret: string, now?: number): Promise<SessionPayload | null>` を実装する
  - token を `.` で分割し、payload 部と signature 部を取得
  - `crypto.subtle.verify` で署名を検証（定数時間相当）
  - 署名不一致・形式不正 → `null`
  - payload をデコードし `exp` を検査: `now >= exp` → `null`
  - `now` 省略時は `Date.now()` を使用
  - 正常時は `SessionPayload` を返す
- [x] `apps/web/lib/session.test.ts` を新規作成する
  - ラウンドトリップ: `signSession` → `verifySession` が元ペイロードを復元
  - 改竄トークン（payload 部を書き換え）が `null` を返す
  - 期限切れ（`now >= exp`）が `null` を返す
  - 不正形式（`.` なし等）が `null` を返す

**Acceptance Criteria**:
- `signSession(payload, secret) → verifySession(token, secret)` がペイロードを復元
- 改竄トークンで `null`
- `now >= exp` で `null`
- テストが vitest で green

## T-04: 認証 env 解決関数（`apps/web/lib/auth-config.ts`）

- [x] `apps/web/lib/auth-config.ts` を新規作成する
- [x] `AuthConfig` 型を定義: `{ sessionSecret: string; adminEmail: string; adminPassword: string }`
- [x] `resolveAuthConfig(env: Record<string, string | undefined>): AuthConfig` を実装する
  - `env.SESSION_SECRET` / `env.ADMIN_EMAIL` / `env.ADMIN_PASSWORD` を読み取る
  - `env.NODE_ENV === 'production'` の場合: 3 つ全て存在しなければ `throw`（欠落した変数名をメッセージに含める）
  - それ以外（dev / test / undefined）: 欠落した値に以下の fallback を使用
    - `SESSION_SECRET`: `'koma-dev-session-secret-do-not-use-in-production'`（コメントで dev 専用と明示）
    - `ADMIN_EMAIL`: `'admin@example.com'`
    - `ADMIN_PASSWORD`: `'password'`
- [x] `apps/web/lib/auth-config.test.ts` を新規作成する
  - production で全 env 指定時に正常返却
  - production で `SESSION_SECRET` 欠落時に throw
  - production で `ADMIN_EMAIL` 欠落時に throw
  - production で `ADMIN_PASSWORD` 欠落時に throw
  - dev で全 env 省略時に fallback を返す
  - dev で一部 env 指定時にその値を優先し、残りは fallback

**Acceptance Criteria**:
- `NODE_ENV=production` + 全 env 指定 → `AuthConfig` を返す
- `NODE_ENV=production` + いずれか欠落 → throw
- `NODE_ENV` 未指定 + env 省略 → fallback 値を含む `AuthConfig`
- テストが vitest で green

## T-05: composition-root に `getUserRepository` 配線 + owner ブートストラップ

- [x] `apps/web/lib/composition-root.ts` を編集する
  - `@koma/iam` から `createUser`, `createInMemoryUserRepository`, `UserRepository` を import
  - `globalForApp` 型に `userRepoInitPromise?: Promise<UserRepository>` を追加
  - `resolveAuthConfig` と `hashPassword` を import
  - owner の固定 ID を定数で定義（有効な UUID v4 文字列、例: `00000000-0000-4000-8000-000000000001`）。`parseId<'User'>` で生成
  - `initUserRepository(): Promise<UserRepository>` 内部関数を作成
    - `createInMemoryUserRepository()` でリポジトリ生成
    - `resolveAuthConfig(process.env)` で認証設定を取得
    - `repo.findByEmail(config.adminEmail)` で既存チェック（冪等）
    - 未存在なら `hashPassword(config.adminPassword)` → `createUser({ id: OWNER_ID, email, passwordHash, role: 'owner' })` → `repo.save(user)`
    - リポジトリを返す
  - `getUserRepository(): Promise<UserRepository>` を export
    - 既存パターンに従い `globalForApp.userRepoInitPromise` でシングルトン化
    - Drizzle 分岐は不要（in-memory のみ。将来の Drizzle 対応はスコープ外）
- [x] `apps/web/lib/composition-root.test.ts` を新規作成する
  - `getUserRepository()` が `UserRepository` を返す
  - 返されたリポジトリで `findByEmail(adminEmail)` が owner ユーザーを返す
  - owner の `role` が `'owner'`
  - owner の `id` が固定値と一致する
  - 2 回呼んでも同一インスタンスが返る（シングルトン）

**Acceptance Criteria**:
- `getUserRepository()` が `UserRepository` を返す
- `findByEmail(adminEmail)` が `role: 'owner'` の `User` を返す
- owner の `id` が固定値
- テストが vitest で green

## T-06: 認証 use-case（`apps/web/lib/authenticate.ts`）

- [x] `apps/web/lib/authenticate.ts` を新規作成する
- [x] `authenticate(repo: UserRepository, email: string, password: string): Promise<User | null>` を実装する
  - `repo.findByEmail(email)` → 見つからなければ `null`
  - `verifyPassword(password, user.passwordHash)` → `false` なら `null`
  - 成功時は `User` を返す
- [x] `apps/web/lib/authenticate.test.ts` を新規作成する
  - in-memory repo にテスト用ユーザーをシードして検証
  - 未登録メールで `null`
  - 誤パスワードで `null`
  - 正しい資格情報で当該 `User`（id / email / role が一致）

**Acceptance Criteria**:
- 未登録メール → `null`
- 登録済みメール + 誤パスワード → `null`
- 正しい資格情報 → 当該 `User`
- テストが vitest で green

## T-07: 全体検証

- [x] `pnpm -r --if-present run check-types` が green
- [x] `pnpm -r --if-present run test` が green
- [x] `pnpm -r --if-present run build` が green
- [x] 既存テスト（`persistence-mode.test.ts` / `create-booking-use-case.test.ts` 等）が壊れていない

**Acceptance Criteria**:
- `pnpm -r --if-present run check-types && pnpm -r --if-present run test && pnpm -r --if-present run build` が全て exit 0
