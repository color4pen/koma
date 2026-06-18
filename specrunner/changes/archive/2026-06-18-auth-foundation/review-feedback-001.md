# Code Review Feedback — iteration 001

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- iteration line format (exact): `- **iteration**: NNN` (3-digit zero-padded integer)
- Findings table MUST have exactly 7 columns in this order:
  # | Severity | Category | File | Description | How to Fix | Fix
  - Fix column: yes = fixer should address this finding; no = skip (pre-existing / out-of-scope)
- Scores table columns: Category | Score | Weight
  - Valid Category values: correctness | security | architecture | performance | maintainability | testing
  - Score: integer 1-10
  - Weight: decimal as defined below
- total line format (exact): `- **total**: <decimal>`
- Default weights: correctness=0.30, security=0.25, architecture=0.15, performance=0.10, maintainability=0.10, testing=0.10
- Scores table is optional but recommended.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | LOW | testing | apps/web/lib/composition-root.test.ts | TC-019（should 優先度）が未カバー。`getUserRepository()` で取得した owner の `passwordHash` が `verifyPassword(adminPassword, owner.passwordHash)` で `true` を返すことを検証するテストが存在しない。シード時の `hashPassword` 呼び出しは正しく実装されているが、composition-root 統合テストとして end-to-end の検証が欠けている。 | `composition-root.test.ts` に「owner の passwordHash が adminPassword で検証できる」ケースを追加する。`verifyPassword(DEV_ADMIN_PASSWORD, owner.passwordHash)` → `true` を expect する。`DEV_ADMIN_PASSWORD = 'password'` は auth-config の fallback 値を利用。 | yes |
| 2 | LOW | security | apps/web/lib/auth-config.ts | `SESSION_SECRET` の最小長バリデーションが存在しない。`resolveAuthConfig` は production モードで値の存在のみを検証し、空文字列や 1 文字の secret を有効値として受け入れる。HMAC-SHA256 の署名強度は secret エントロピーに直結するため、意図せず弱い secret を設定した場合に silent failure となる。 | production ブランチに `if (env['SESSION_SECRET'].length < 32)` のような最小長チェック（例: 32 バイト）と明示的なエラーメッセージを追加することを推奨。本リクエストの spec に記載されていないため必須ではなく、後続スライスか個別タスクとして対応可。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 10 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 8 | 0.10 |

- **total**: 9.1

## Summary

### 全体評価

受け入れ基準をすべて満たす実装。14 件の must テストケース全てが通過し、verification-result.md のとおり typecheck / test / lint / build の全フェーズが green。外部ランタイム依存（bcrypt / jose / iron-session）は追加されておらず、`node:crypto` / Web Crypto のみで要件が充足されている。

### 正確性

- **password.ts**: `hashPassword` は 16-byte random salt + scrypt（KEY_LENGTH=64）の `salt:hash` hex 形式を正しく実装。`verifyPassword` は colonIndex ベースの分割 → 同 salt での再導出 → `timingSafeEqual` の定数時間比較を適切に実施。形式不正・空文字いずれも `false` を返す防御実装が機能している。
- **session.ts**: `signSession` は JSON payload を base64url エンコード後 HMAC-SHA256 で署名し `payload.signature` 形式を返す。`verifySession` は `indexOf('.')` による分割 → `crypto.subtle.verify`（定数時間相当）→ expiry チェックの順序が正しい。署名検証前にペイロードをデコードしない実装順序は安全。複数ドット含む不正トークン（`a.b.c`）は `base64urlDecode` が `.` を不正文字として扱い catch → null が保証される。
- **auth-config.ts**: production / dev の分岐は `env['NODE_ENV'] === 'production'` の純粋なオブジェクト参照で動作し、`process.env` に直接依存しない設計でテスト可能性を保つ。欠落変数名を列挙したエラーメッセージは診断しやすい。
- **composition-root.ts**: `findByEmail` による冪等チェックが `initUserRepository` の冒頭で実施されており、再初期化時のシード重複がない。`OWNER_USER_ID` の固定値は `parseId<'User'>` を通した UUID v4 検証済み文字列で安全。
- **authenticate.ts**: `findByEmail` 失敗と `verifyPassword` 失敗の両方で等しく `null` を返す設計により、ユーザー列挙攻撃（user enumeration）を防止している。

### セキュリティ

- **A02 Cryptographic Failures**: scrypt（Node デフォルト N=16384, r=8, p=1）はインタラクティブ認証の最低ラインを満たすメモリハード KDF。`timingSafeEqual` / `crypto.subtle.verify` による定数時間比較が適切に実施されている。
- **A05 Security Misconfiguration**: production では SESSION_SECRET / ADMIN_EMAIL / ADMIN_PASSWORD が全て必須（欠落で throw）。dev fallback が本番に漏洩する経路を構造的に遮断している。dev fallback の固定 SESSION_SECRET 文字列はコードに存在するが、production guard が正しく機能している限り問題なし。
- **Finding #2 (LOW)** として SESSION_SECRET の最小長バリデーションの欠如を指摘するが、本リクエストのスコープ外のため fix=no。

### アーキテクチャ

- 5 モジュール全てが `next/headers` / React に依存しない純粋関数群として実装されており、design.md D5 の「Next ランタイム非依存」方針に完全準拠。
- `composition-root.ts` は既存の `globalForApp` シングルトン + async getter パターンに倣い、`userRepoInitPromise` で初期化を Promise 単位で管理。Drizzle 分岐を持たない（in-memory のみ）設計は要件通りで、将来の Drizzle 対応追加時の拡張箇所が自明。
- `User ≠ Resource` 方針（`domain-model.md` 踏襲）が `@koma/iam` からの import で正しく実現されている。
- 依存方向: `apps/web`（配信） → `@koma/iam`（ドメイン）は `model.md §4` の許可された依存。

### テスト

- must 14 件 / should 9 件中 8 件 / could 2 件中 0 件がカバーされている。
- **Finding #1 (LOW)**: TC-019（should）— composition-root の owner passwordHash 検証が未カバー。他の should ケースは全て対応済み。
- テストの独立性: `password.test.ts` / `session.test.ts` / `auth-config.test.ts` / `authenticate.test.ts` は全て純粋関数テストで副作用なし。`composition-root.test.ts` はモジュールレベルシングルトンを利用するが、同一ファイル内テストが同一インスタンスを共有することがシングルトンテストの意図と一致しており問題なし。
- verification-result.md: apps/web 17 ファイル 124 テストが全て green。既存テスト（`persistence-mode.test.ts` / `create-booking-use-case.test.ts` 等）に影響なし。
