# Spec: auth-foundation

## Requirements

### Requirement: パスワードハッシュ化はランダム salt を内包した自己完結文字列を返す

`hashPassword` SHALL produce a self-contained string that embeds a random salt. The same plaintext password hashed twice SHALL yield different output strings (salt randomness). `verifyPassword` SHALL return `true` only when the plaintext matches the stored hash, using constant-time comparison.

#### Scenario: 正しいパスワードで検証が成功する

**Given** `hashPassword('correct-password')` で生成されたハッシュ `stored`
**When** `verifyPassword('correct-password', stored)` を呼ぶ
**Then** `true` を返す

#### Scenario: 誤ったパスワードで検証が失敗する

**Given** `hashPassword('correct-password')` で生成されたハッシュ `stored`
**When** `verifyPassword('wrong-password', stored)` を呼ぶ
**Then** `false` を返す

#### Scenario: 同一パスワードでもハッシュが異なる（salt 効果）

**Given** 同一の平文パスワード `'same-password'`
**When** `hashPassword('same-password')` を 2 回呼ぶ
**Then** 2 つの返却値は異なる文字列である

### Requirement: セッショントークンの署名・検証はラウンドトリップで元ペイロードを復元する

`signSession` SHALL produce a token in `base64url(JSON).base64url(signature)` format using HMAC-SHA256. `verifySession` SHALL return the original `SessionPayload` when the token is valid and not expired. It SHALL return `null` for tampered tokens, malformed tokens, or expired tokens.

#### Scenario: 署名→検証のラウンドトリップでペイロードを復元する

**Given** ペイロード `{ userId: 'u1', role: 'owner', exp: now + 3600000 }` と secret `'test-secret'`
**When** `signSession(payload, secret)` → `verifySession(token, secret)` を呼ぶ
**Then** 返却された `SessionPayload` の `userId`, `role`, `exp` が元のペイロードと一致する

#### Scenario: 改竄されたトークンは null を返す

**Given** 正規に署名されたトークン `token`
**When** トークンの payload 部を書き換えた改竄トークンで `verifySession` を呼ぶ
**Then** `null` を返す

#### Scenario: 有効期限切れトークンは null を返す

**Given** `exp` が `now - 1000`（過去）のペイロードで署名されたトークン
**When** `verifySession(token, secret, now)` を呼ぶ（`now >= exp`）
**Then** `null` を返す

#### Scenario: 不正形式のトークンは null を返す

**Given** `.` を含まない不正形式の文字列
**When** `verifySession(malformed, secret)` を呼ぶ
**Then** `null` を返す

### Requirement: 認証 env 解決は本番で env 必須、dev で fallback を返す

`resolveAuthConfig` SHALL throw when `NODE_ENV` is `'production'` and any of `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` is missing. It SHALL return documented fallback values when `NODE_ENV` is not `'production'` and env vars are absent.

#### Scenario: production で全 env 指定時に正常返却する

**Given** `NODE_ENV=production`, `SESSION_SECRET=s`, `ADMIN_EMAIL=a@b.com`, `ADMIN_PASSWORD=p`
**When** `resolveAuthConfig(env)` を呼ぶ
**Then** `{ sessionSecret: 's', adminEmail: 'a@b.com', adminPassword: 'p' }` を返す

#### Scenario: production で SESSION_SECRET 欠落時に throw する

**Given** `NODE_ENV=production`, `SESSION_SECRET` なし, `ADMIN_EMAIL=a@b.com`, `ADMIN_PASSWORD=p`
**When** `resolveAuthConfig(env)` を呼ぶ
**Then** `SESSION_SECRET` の欠落を示すエラーを throw する

#### Scenario: production で ADMIN_EMAIL 欠落時に throw する

**Given** `NODE_ENV=production`, `SESSION_SECRET=s`, `ADMIN_EMAIL` なし, `ADMIN_PASSWORD=p`
**When** `resolveAuthConfig(env)` を呼ぶ
**Then** `ADMIN_EMAIL` の欠落を示すエラーを throw する

#### Scenario: production で ADMIN_PASSWORD 欠落時に throw する

**Given** `NODE_ENV=production`, `SESSION_SECRET=s`, `ADMIN_EMAIL=a@b.com`, `ADMIN_PASSWORD` なし
**When** `resolveAuthConfig(env)` を呼ぶ
**Then** `ADMIN_PASSWORD` の欠落を示すエラーを throw する

#### Scenario: dev で全 env 省略時に fallback を返す

**Given** `NODE_ENV` なし（または `'development'`）、`SESSION_SECRET` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` 全て未設定
**When** `resolveAuthConfig(env)` を呼ぶ
**Then** `sessionSecret` が dev 固定値、`adminEmail` が `'admin@example.com'`、`adminPassword` が `'password'` を返す

#### Scenario: dev で一部 env 指定時にその値を優先する

**Given** `NODE_ENV` なし、`ADMIN_EMAIL=custom@test.com`、他は未設定
**When** `resolveAuthConfig(env)` を呼ぶ
**Then** `adminEmail` が `'custom@test.com'`、他は fallback 値を返す

### Requirement: owner ブートストラップは固定 ID で冪等にシードする

`getUserRepository` SHALL seed an owner user with a fixed UUID on first initialization. The seeded user SHALL have `role: 'owner'` and a `passwordHash` derived from the configured `adminPassword`. The seed SHALL be idempotent — calling `getUserRepository` multiple times MUST return the same repository with the same owner user.

#### Scenario: 初回取得時に owner ユーザーがシードされている

**Given** `getUserRepository()` を初めて呼ぶ
**When** 返されたリポジトリで `findByEmail(adminEmail)` を呼ぶ
**Then** `role: 'owner'` の `User` が返り、`id` が固定 UUID と一致する

#### Scenario: 2 回呼んでも同一リポジトリが返る（シングルトン）

**Given** `getUserRepository()` を 1 回目に呼んでリポジトリ `repo1` を取得
**When** `getUserRepository()` を 2 回目に呼んでリポジトリ `repo2` を取得
**Then** `repo1` と `repo2` は同一インスタンスである

### Requirement: 認証 use-case は email + password で User を返す

`authenticate` SHALL return the `User` when email matches and password verification succeeds. It SHALL return `null` when the email is not found or the password is incorrect.

#### Scenario: 未登録メールで null を返す

**Given** in-memory リポジトリに `test@example.com` のユーザーが存在する
**When** `authenticate(repo, 'unknown@example.com', 'any')` を呼ぶ
**Then** `null` を返す

#### Scenario: 誤パスワードで null を返す

**Given** in-memory リポジトリにパスワード `'correct'` でハッシュされたユーザーが存在する
**When** `authenticate(repo, email, 'wrong')` を呼ぶ
**Then** `null` を返す

#### Scenario: 正しい資格情報で User を返す

**Given** in-memory リポジトリにメール `'test@example.com'`、パスワード `'correct'` でハッシュされたユーザーが存在する
**When** `authenticate(repo, 'test@example.com', 'correct')` を呼ぶ
**Then** 当該 `User`（`email`, `id`, `role` が一致）を返す
