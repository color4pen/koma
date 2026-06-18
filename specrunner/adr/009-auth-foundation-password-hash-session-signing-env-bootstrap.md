# ADR-009: 認証基盤 — scrypt パスワードハッシュ・Web Crypto HMAC-SHA256 セッション署名・env ブートストラップポリシー

- **status**: accepted
- **date**: 2026-06-18
- **change**: auth-foundation
- **deciders**: architect, spec-runner

## Context

`packages/iam` は `User`（`id`, `email`, `passwordHash`, `role`）・`Role`・`Permission`・`can`・`UserRepository`（in-memory）を export 済みだが、配信層 `apps/web` には `@koma/iam` への依存がなく、全ルートが無認証で開いていた。

`docs/アーキテクチャ/domain-model.md` はパスワードのハッシュ化・検証を配信の責務と規定しており、ドメイン（`User.passwordHash`）は不透明な文字列として保持するだけに留まる。

本 change は配信境界に閉じた認証の土台を確立する:

- パスワードのハッシュ化・検証（`apps/web/lib/password.ts`）
- 署名付きセッショントークンの発行・検証（`apps/web/lib/session.ts`）
- 認証 env の解決（`apps/web/lib/auth-config.ts`）
- `UserRepository` の composition-root 配線と owner ブートストラップ（`apps/web/lib/composition-root.ts`）
- email + password → User の認証 use-case（`apps/web/lib/authenticate.ts`）

Cookie I/O・ログイン UI・ミドルウェアによるルート保護は後続スライス `auth-login-ui` のスコープとし、本 change はすべて Next ランタイム（`next/headers` 等）に依存しない純粋関数群に閉じる。

制約:
- 新規ランタイム依存（bcrypt / argon2 / jose / iron-session 等）を追加しない（プロジェクトの小型維持方針）
- ADR-006 が確立した composition root パターン（`globalForApp` シングルトン + async getter）に従う
- 本変更は `node:crypto` / Web Crypto のみを使用し、外部暗号ライブラリを持ち込まない

## Decisions

### D1: パスワードハッシュに `node:crypto` の scrypt + ランダム salt + 定数時間比較

`hashPassword(plain: string): Promise<string>` は `crypto.randomBytes(16)` で per-hash のランダム 16-byte salt を生成し、`crypto.scrypt`（非同期）でハッシュを導出する。返却文字列は `salt:hash`（hex エンコード）の自己完結形式で salt を内包する。

`verifyPassword(plain: string, stored: string): Promise<boolean>` は保存文字列を `:` で分割して salt を取り出し、同一パラメータで再導出したハッシュを `crypto.timingSafeEqual` で定数時間比較する。形式不正・空文字列は `false` を返す防御的実装とする。

```
// ハッシュ形式
"<16-byte-salt-hex>:<64-byte-scrypt-hash-hex>"
```

- **採用理由**: scrypt は Node 標準ライブラリ（`node:crypto`）のメモリハード KDF であり依存ゼロ。デフォルトパラメータ（N=16384, r=8, p=1）はインタラクティブ認証の最低ラインを満たす。salt の内包により将来のパラメータ変更時に旧形式の移行パスが取れる。
- **却下**: bcrypt / argon2 — ネイティブアドオン依存・パッケージサイズ増。プロジェクトの小型維持方針に反する。

---

### D2: セッショントークンに Web Crypto HMAC-SHA256 署名（暗号化なし）

`signSession(payload, secret): Promise<string>` は JSON ペイロード（`{ userId: string; role: Role; exp: number }`）を base64url エンコードし、`crypto.subtle`（Web Crypto）の HMAC-SHA256 で署名する。トークン形式は `base64url(JSON).base64url(signature)`。

`verifySession(token, secret, now): Promise<SessionPayload | null>` は `indexOf('.')` でペイロードと署名を分割し、`crypto.subtle.verify`（定数時間相当）で署名を検証してから有効期限（`now >= exp`）を確認する。署名不一致・形式不正・期限切れはすべて `null` を返す。

ペイロードは暗号化しない。userId + role は非秘匿情報であり署名で改竄防止すれば十分。

- **採用理由**: Web Crypto（`crypto.subtle`）は Node.js と edge runtime（Cloudflare Workers 等）の双方で利用可能。後続スライスの edge ミドルウェアで同一の検証コードが再利用できる。依存ゼロ。
- **却下**:
  - jose / iron-session — 外部依存追加。プロジェクトの小型維持方針に反する。
  - `node:crypto` の HMAC — Node.js 専用 API のため edge ミドルウェアで使えない。後続スライスでコードを別実装にする必要が生じる。

---

### D3: トークン署名・検証を Cookie I/O と分離した純粋関数に閉じる

`session.ts` の `signSession` / `verifySession` は `next/headers` や React に依存しない。Cookie の set/read/clear（`next/headers`）は Next ランタイム依存のため後続スライス `auth-login-ui` に置く。

- **採用理由**: テスタビリティと関心分離。認証ロジックを vitest で単体テスト可能に保ち、後続スライスで Cookie 層を上に乗せるだけで済む。
- **却下**: Cookie I/O と一体化した認証関数 — テストに Next ランタイムのモックが必要になり複雑化する。

---

### D4: 認証 env の解決を純関数 `resolveAuthConfig` に集約（prod 必須 / dev fallback ポリシー）

`resolveAuthConfig(env): { sessionSecret; adminEmail; adminPassword }` が `SESSION_SECRET` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` を env オブジェクトから読み取る。

- `NODE_ENV === 'production'` では 3 変数すべて必須。欠落時は欠落変数名を列挙して throw する
- dev / test では文書化された fallback で起動可能にする（`SESSION_SECRET` = 固定 dev 文字列、`ADMIN_EMAIL` = `admin@example.com`、`ADMIN_PASSWORD` = `password`）。fallback は「dev 専用」とコメントで明示する

引数に `env` を受け取り `process.env` を直参照しない純関数とすることで単体テスト可能にする。

- **採用理由**: 本番で資格情報ハードコードを防ぎつつ、dev 環境変数なしでの起動を可能にする。純関数のためテストが容易。
- **却下**:
  - デフォルト資格情報をコードにハードコード（分岐なし）— 本番で危険
  - dotenv / 設定ライブラリ — 既存コードベースに設定ライブラリがなく追加は過剰

---

### D5: owner ユーザーを固定 ID で env ブートストラップ（冪等シード）

`getUserRepository()` 初回初期化時に、`resolveAuthConfig` の `adminEmail` / `adminPassword` から owner ユーザーを 1 件シードする。

- `id` は `parseId<'User'>` で検証済みの固定 UUID 文字列を `createUser({ id })` に渡す。固定 ID により in-memory モードでプロセス再起動後もセッション（userId が一致する）が有効に保たれる
- `findByEmail` で既存チェックし、冪等にする（2 回目以降はスキップ）
- `passwordHash` は `hashPassword(adminPassword)` で生成する

```typescript
const OWNER_USER_ID = 'xxxxxxxx-xxxx-...' as Id<'User'>; // 固定値
```

- **採用理由**: 固定 ID で再起動後のセッション互換性を維持。冪等シードにより安全に再実行可能。本番は env で上書きされるため、デフォルト資格情報が本番に漏洩しない。
- **却下**:
  - 初回サインアップで owner 作成 — UI・状態分岐が増える
  - デフォルト資格情報をコードにハードコード — 本番で危険。D4 の prod 必須ポリシーで防止している

---

### D6: `apps/web` に `@koma/iam` を追加（外部暗号ライブラリは追加しない）

`apps/web/package.json` に `"@koma/iam": "workspace:*"` を追加する。`@koma/iam` は `next.config.ts` の `transpilePackages` に追加する（ADR-006 D6 パターンの踏襲）。

bcrypt / argon2 / jose / iron-session 等の外部ランタイム依存は一切追加しない。パスワードハッシュ・セッション署名はすべて `node:crypto` / Web Crypto で実装する。

- **採用理由**: プロジェクトの小型維持方針。ドメインパッケージ（`@koma/iam`）への依存追加は設計上の意図（delivery → domain の許可された依存）に合致する。

---

### D7: `authenticate` use-case のユーザー列挙攻撃対策

`authenticate(repo, email, password): Promise<User | null>` は「メール未登録」と「パスワード誤り」の両方で等しく `null` を返す。エラーメッセージでユーザーの存在を漏洩しない。

- **採用理由**: OWASP A07 Identification and Authentication Failures 対策。ユーザー列挙攻撃（user enumeration）の防止。

## Alternatives Considered

### Alternative 1: bcrypt / argon2 によるパスワードハッシュ

**Pros**: 業界標準・広く使われている。ライブラリが扱いやすい。

**Cons**: ネイティブアドオン依存でビルド環境に C++ ツールチェーンが必要。パッケージサイズが増大する。

**Why not**: ポートフォリオプロジェクトとして依存の最小化を優先。scrypt は Node 標準ライブラリで同等のメモリハード KDF を提供する。

---

### Alternative 2: jose / iron-session によるセッション管理

**Pros**: JWT / JWE の標準規格に準拠。機能が豊富。

**Cons**: 外部依存追加。プロジェクトの小型維持方針に反する。

**Why not**: ペイロードが非秘匿（userId + role）な本ユースケースでは HMAC 署名で十分。依存ゼロで同等の改竄防止が実現できる。

---

### Alternative 3: 初回サインアップで owner ユーザーを作成する

**Pros**: コードに初期資格情報が存在しない。

**Cons**: UI と状態管理（「owner 未作成」状態）の分岐が増える。デプロイ直後の状態管理が複雑になる。

**Why not**: env ブートストラップは本番 env 必須により同等のセキュリティが得られ、実装がシンプル。

---

### Alternative 4: `node:crypto` の HMAC によるセッション署名

`crypto.createHmac('sha256', secret)` を使い、Node.js 標準ライブラリで HMAC-SHA256 署名を実装する案。

**Pros**: Node.js 標準ライブラリで同期 API が使えるため実装がシンプル。`crypto.timingSafeEqual` で比較も容易。

**Cons**: `node:crypto` は Node.js 専用 API であり edge runtime（Cloudflare Workers / Vercel Edge Functions 等）で利用できない。後続スライスで edge ミドルウェア（`verifySession`）を実装する際にコードを別実装に置き換える必要が生じる。

**Why not**: 後続スライスの edge ミドルウェアで同一の検証コードを再利用できることを優先し、Node / edge 双方で利用可能な Web Crypto（`crypto.subtle`）を採用した。セッション検証ロジックを 2 系統に分岐させないための先行投資である。

## Consequences

### Positive

- `node:crypto` / Web Crypto のみで認証基盤が確立される。外部依存ゼロのまま bcrypt/jose 相当の機能を実現
- Web Crypto の採用により、後続スライスで edge ミドルウェア（`verifySession`）が同一コードで動作する
- `resolveAuthConfig` の prod 必須 / dev fallback ポリシーにより、本番での資格情報漏洩リスクを構造的に排除しつつ dev の環境変数レス起動を維持
- 固定 ID owner シードにより in-memory モードで再起動後もセッションが有効に保たれる
- 全モジュールが純粋関数で実装されており、vitest 単体テストで完全に検証可能
- ADR-006 の composition root パターンを踏襲し、後続の Drizzle 永続化（`UserRepository`）への移行が 1 ファイルの差し替えで完結する構造を維持

### Negative / Trade-offs

- in-memory `UserRepository` は再起動でデータ消失（owner は固定 ID で再シードされるため互換性維持）。Drizzle 永続化は後続 change のスコープ
- scrypt のデフォルトパラメータは将来変更の可能性があるが、ハッシュ形式に salt を内包するため旧形式との移行パスは取れる（現時点では YAGNI）
- `SESSION_SECRET` の最小長バリデーションが存在しない（空文字列や短い secret を誤設定した場合 silent failure）。後続スライスで対応する
- dev fallback の固定 SESSION_SECRET がコードに存在するが、`resolveAuthConfig` の production guard が正しく機能している限り本番には漏洩しない

## References

- `docs/アーキテクチャ/domain-model.md` — パスワードハッシュ化・検証は配信の責務
- `specrunner/adr/006-web-delivery-layer-composition-root-server-action-zod-mini-boundary.md` — composition root globalThis singleton パターン
- `specrunner/adr/008-web-persistence-driver-agnostic-drizzle-client-and-env-driven-adapter-selection.md` — env 駆動 adapter 選択パターン
- `specrunner/changes/auth-foundation/design.md` — 詳細設計判断（D1〜D5）
- `apps/web/lib/password.ts` — `hashPassword` / `verifyPassword` 実装
- `apps/web/lib/session.ts` — `signSession` / `verifySession` 実装
- `apps/web/lib/auth-config.ts` — `resolveAuthConfig` 実装
- `apps/web/lib/composition-root.ts` — `getUserRepository` + owner ブートストラップ
- `apps/web/lib/authenticate.ts` — `authenticate` use-case 実装
