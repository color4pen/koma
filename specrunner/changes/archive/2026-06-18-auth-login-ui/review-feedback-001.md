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
| 1 | low | performance | `apps/web/middleware.ts` | `resolveAuthConfig(process.env)` は保護対象リクエストごとに毎回呼ばれる。純関数なので実害はないが、モジュールスコープに巻き上げると呼び出しを省略できる。 | `const { sessionSecret } = resolveAuthConfig(...)` をミドルウェア関数の外（モジュールトップレベル）に移動する。 | no |
| 2 | low | maintainability | `apps/web/lib/session-cookie.ts` | 相対 `.js` 拡張子 import（`'./auth-config.js'`、`'./session.js'`）を使用しており、同モジュール内他ファイルの `@/lib/` エイリアス規約と表記が異なる。機能的影響なし。 | `@/lib/auth-config` / `@/lib/session` エイリアス形式に統一する。 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 8 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 9 | 0.10 |

- **total**: 8.80

## Summary

### 受け入れ基準の充足状況

すべての必須受け入れ基準を満たしている。

| 基準 | 結果 |
|------|------|
| `apps/web/middleware.ts` 存在・`config.matcher` で静的アセット除外 | ✅ |
| `isPublicPath('/login')` = true、`isPublicPath('/_next/static/x.js')` = true | ✅ |
| `isPublicPath('/customers')` = false、`isPublicPath('/')` = false（テスト固定済み） | ✅ |
| `parseLoginInput` の空フィールド → `ok:false`、両方非空 → `ok:true`（テスト固定済み） | ✅ |
| `apps/web/app/login/page.tsx` と `apps/web/app/login/actions.ts` が存在する | ✅ |
| `layout.tsx` にログアウト Server Action 導線がある | ✅ |
| jose / iron-session / next-auth / @auth/ が `package.json` に含まれない | ✅ |
| check-types / test / lint / build すべて green（verification-result.md 参照） | ✅ |

### 各実装コンポーネントの評価

**`route-protection.ts` / `route-protection.test.ts`**  
純関数の実装は簡潔かつ正確。`/login`（完全一致）・`/_next/`（前方一致）・`/favicon.ico`（完全一致）の 3 パターンを網羅。`/login/reset` が false になること（前方一致ではなく完全一致）も TC-006 でテスト固定済み。

**`parse-login-input.ts` / `parse-login-input.test.ts`**  
既存 `parse-*-input.ts` のパターンに忠実に従い、`zod/v4/mini` で `issue.path[0]` をキーにエラーを集約。TC-007〜TC-010 の must ケースに加え、`null` 入力・文字列入力のガードも追加されており、テスト品質は高い。

**`session-cookie.ts`**  
Cookie 属性（`httpOnly` / `sameSite=lax` / `secure`（本番のみ）/ `path=/` / `maxAge`）が仕様と完全に一致。`setSessionCookie` は `exp = Date.now() + SESSION_TTL_MS` を内部計算してから `signSession` を呼ぶ設計により、呼び出し元に exp 計算を漏らさない。`readSession` の早期 return（Cookie 不在時は `resolveAuthConfig` を呼ばない）は適切な最適化。

**`middleware.ts`**  
`isPublicPath` チェックを Cookie 検証より先に実行する順序が正しい（public path では secret も不要）。`new URL('/login', request.url)` で絶対 URL を生成してからリダイレクトする実装は Next.js ミドルウェアの標準的な書き方に合致。`config.matcher` と `isPublicPath` の役割分担（D7）が設計通りに実現されている。

**`login/actions.ts`**  
open redirect 防止ロジック（`typeof next === 'string' && next.startsWith('/') && !next.startsWith('//')`）が仕様（CWE-601）通りに実装。認証失敗メッセージ「メールアドレスまたはパスワードが正しくありません」がメール不在・パスワード誤りで共通（D5 の user enumeration 対策）。`useActionState` 形式のシグネチャも既存パターンに合致。

**`login/page.tsx` + `login-form.tsx`**  
Next 15 の `searchParams: Promise<...>` を `await` で受け取る実装が正しい。hidden input で `next` パラメータを引き継ぎ、フィールドレベル（`errors.email` / `errors.password`）と汎用エラー（`message`）の両方を表示する設計が適切。`isPending` による送信ボタン無効化も UX として適切。

**`layout.tsx`**  
async Server Component への昇格が正しく、`readSession()` でセッション有無を判定してナビの表示/非表示を切り替える。`resolveAuthConfig(process.env).adminEmail` で email を表示する設計は、`SessionPayload` に email フィールドがない制約への合理的な対処（T-09 の設計方針と一致）。`<form action={logoutAction}>` による Server Action 直呼び出しが正しい。

### 設計判断の遵守状況

architect 評価済みの設計判断（D1〜D7）がすべて実装に反映されている。特に middleware が DB を引かずに `verifySession` のみでゲート検証する D2 の方針、純関数と Next ランタイム依存の分離を定義した D4 の方針が忠実に実現されており、アーキテクチャ品質は高い。

### 総評

全受け入れ基準充足・検証 green・設計判断遵守・テスト品質良好。critical/high 相当の指摘なし。**approved**。
