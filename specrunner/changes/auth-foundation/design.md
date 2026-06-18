# Design: auth-foundation

## Context

`packages/iam` は `User`（`id`, `email`, `passwordHash`, `role`）・`Role`・`Permission`・`can`・`UserRepository`（in-memory）を export 済み。しかし配信層 `apps/web` には `@koma/iam` への依存がなく、全ルートが無認証で開いている。

本変更は配信境界に閉じた認証の土台——パスワードのハッシュ化・検証、署名付きセッショントークンの発行・検証、`UserRepository` の composition-root 配線と owner ユーザーの env ブートストラップ、認証 use-case——を確立する。

制約:
- `apps/web` の既存 composition-root パターン（`globalForApp` シングルトン + `get*Repository` async getter）に従う。
- `User.passwordHash` はドメインでは不透明な文字列。ハッシュ化・検証は配信の責務（`domain-model.md`）。
- 本変更は Next ランタイム（`next/headers` の `cookies()` 等）に依存しない純粋関数群に閉じる。Cookie I/O・ログイン UI・ミドルウェアは後続スライス。
- 新規ランタイム依存（bcrypt / jose / iron-session 等）を追加しない。

## Goals / Non-Goals

**Goals**:

- パスワードのハッシュ化・検証関数を `node:crypto` scrypt で提供する
- セッショントークンの署名・検証関数を Web Crypto HMAC-SHA256 で提供する
- 認証 env（`SESSION_SECRET` / `ADMIN_EMAIL` / `ADMIN_PASSWORD`）の解決関数を本番必須・dev fallback のポリシーで提供する
- composition-root に `getUserRepository` を配線し、owner ユーザーを固定 ID で env ブートストラップする
- email + password → User を返す認証 use-case を提供する
- 全関数に vitest テストを伴い、既存テスト・ビルドを壊さない

**Non-Goals**:

- ログイン画面 UI・ログイン/ログアウト server action（後続 `auth-login-ui`）
- セッション Cookie の set/read/clear（`next/headers` 依存、後続）
- ミドルウェアによるルート保護（後続）
- `User` の Drizzle 永続化（本変更は in-memory + env シード）
- パスワードリセット・ユーザー登録 UI・複数ユーザー管理 UI
- レート制限・ロックアウト・監査ログ

## Decisions

### D1: パスワードハッシュに `node:crypto` の scrypt + ランダム salt + 定数時間比較

`hashPassword` は `crypto.scrypt`（非同期）でハッシュごとにランダム 16-byte salt を生成する。返却文字列は `salt:hash`（hex エンコード）の自己完結形式で、salt を内包する。`verifyPassword` は `crypto.timingSafeEqual` で定数時間比較する。

- **Rationale**: scrypt は Node 標準ライブラリのメモリハード KDF。依存ゼロでプロジェクトの小型維持方針と合致する。
- **却下**: bcrypt / argon2 — ネイティブ依存・パッケージサイズ増。ポートフォリオプロジェクトとして依存の最小化を優先。

### D2: セッショントークンに Web Crypto HMAC-SHA256 署名（暗号化なし）

`signSession` は JSON ペイロード（`{ userId, role, exp }`）を base64url エンコードし、`crypto.subtle` の HMAC-SHA256 で署名する。形式は `base64url(JSON).base64url(signature)`。`verifySession` は署名検証 + 有効期限チェックを行い、不正なら `null` を返す。署名比較は `crypto.subtle.verify` に委ね、定数時間相当とする。

- **Rationale**: Web Crypto は Node / edge 双方で利用可能。後続スライスの edge ミドルウェアでも同じ検証コードが使える。ペイロードは非秘匿（userId + role）なので署名で改竄防止すれば十分、暗号化は不要。
- **却下**: jose / iron-session — 依存追加。`node:crypto` の HMAC — edge ミドルウェアで使えない。

### D3: 認証 env の解決を純関数 `resolveAuthConfig` に集約

`resolveAuthConfig(env)` が `SESSION_SECRET` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` を env から読み取る。`NODE_ENV === 'production'` では 3 つ全て必須（欠落時 throw）。dev/test では文書化された fallback（`SESSION_SECRET` = 固定 dev 値、`ADMIN_EMAIL` = `admin@example.com`、`ADMIN_PASSWORD` = `password`）で起動可能にする。

- **Rationale**: 本番で資格情報ハードコードを防ぎつつ、dev で環境変数なしで開発できる。純関数のため単体テスト可能。
- **却下**: dotenv / 設定ライブラリ — 既存コードベースに設定ライブラリがなく、追加は過剰。

### D4: owner ユーザーは固定 ID で env ブートストラップ（冪等シード）

composition-root の `getUserRepository` 初回初期化時に、`resolveAuthConfig` の `adminEmail` / `adminPassword` から owner ユーザーを 1 件シードする。`id` は `parseId` で検証可能な固定 UUID 文字列を `createUser({ id })` に渡す。`findByEmail` で既存チェックし、冪等にする。

- **Rationale**: 固定 ID により in-memory モードで再起動後もセッションが有効に保てる。冪等シードにより初回以降の再実行でも安全。
- **却下**: 初回サインアップで owner 作成 — UI・状態分岐が増える。デフォルト資格情報ハードコード — 本番で危険。

### D5: 全モジュールを Next ランタイム非依存の純粋関数に閉じる

`password.ts` / `session.ts` / `auth-config.ts` / `authenticate.ts` はすべて `next/headers` や React に依存しない。Cookie I/O との分離により単体テストが容易で、後続スライスで Cookie 層を上に乗せるだけで済む。

- **Rationale**: テスタビリティと関心分離。配信境界の中でも「認証ロジック」と「HTTP I/O」を分ける。
- **却下**: Cookie I/O と一体化した認証関数 — テストに Next ランタイムのモックが必要になり、複雑化する。

## Risks / Trade-offs

- **[Risk] in-memory repo は再起動でデータ消失** → 本変更のスコープでは許容（Drizzle 永続化は後続）。owner は固定 ID で再シードされるためセッション互換性は維持。
- **[Risk] dev fallback の固定資格情報が本番に漏れる** → `resolveAuthConfig` が `NODE_ENV=production` で fallback を返さない（throw する）ことで防止。テストで固定する。
- **[Risk] scrypt パラメータの将来変更** → ハッシュ形式に salt を内包するため、将来パラメータ変更時は `verifyPassword` で旧形式と新形式の両方を試す移行パスが取れる。現時点では YAGNI。
- **[Trade-off] 署名のみ・暗号化なし** → ペイロード（userId + role）は URL エンコードすれば読めるが、秘匿情報ではない。改竄は署名で防ぐ。秘匿が必要になれば暗号化層を追加できる。

## Open Questions

なし。architect 評価済みの設計判断で主要な選択は確定している。
