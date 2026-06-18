# Design: auth-login-ui

## Context

`auth-foundation` により認証の土台（`signSession`/`verifySession`/`authenticate`/`resolveAuthConfig`/`getUserRepository`＋owner シード）は確立済み。これらはすべて Next ランタイム非依存の純関数・非同期関数として実装されている。

本スライスはこれらを **Next.js ランタイム**（`next/headers` の async `cookies()`・middleware edge runtime・Server Actions・page/layout）に結線し、「未認証では業務画面に到達できない」状態を完成させる。

制約:
- `next ^15.1.0` — `cookies()` は async（`await cookies()`）
- `verifySession` は Web Crypto（`crypto.subtle`）ベースのため edge runtime で動作可能
- 既存 server action は `useActionState` 形式（`(_prevState, formData) => Promise<ActionState>`）
- 入力検証は `zod/v4/mini` で純関数化する既存パターン
- 新規外部ランタイム依存（jose / iron-session / next-auth 等）を追加しない

## Goals / Non-Goals

**Goals**:

- セッション Cookie の set/read/clear を `next/headers` の薄いラッパーとして提供する
- ルート保護判定ロジックを純関数として切り出し、テスト可能にする
- Next middleware（edge runtime）で全保護ルートへのゲート検証を実現する
- ログイン/ログアウト Server Actions を既存パターンに倣って実装する
- ログイン画面 UI とナビのログアウト導線を配線する
- 純粋ロジック（`parse-login-input`・`route-protection`）に vitest テストを付ける

**Non-Goals**:

- レート制限・ログイン試行ロックアウト・タイミング均一化
- パスワードリセット・ユーザー登録 UI
- Remember me・スライディング有効期限
- 明示的 CSRF トークン機構
- ロール別 UI 出し分け（`can()` の UI 適用）
- E2E テスト基盤

## Decisions

### D1: セッション Cookie 属性と TTL

Cookie 名 `koma_session`。属性: `httpOnly`・`sameSite=lax`・`secure`（`NODE_ENV==='production'` のみ）・`path=/`。TTL は定数 `SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000`（7 日）。`maxAge` は秒単位（TTL / 1000）、ペイロードの `exp = Date.now() + TTL_MS`。

- **Rationale**: dev 環境（`http://localhost`）で `secure` を付けると Cookie が落ちないため本番限定。`sameSite=lax` は CSRF の第一防衛線として機能し、Server Actions の同一オリジン POST と合わせて十分。
- **Alternative rejected**: `sameSite=strict` — OAuth callback や外部リンクからの遷移で Cookie が送られず UX が劣化する。

### D2: ルート保護方式 — middleware ゲート

Next middleware（edge runtime）で全リクエストを横断的にゲートする。middleware は `verifySession`（Web Crypto）で署名と有効期限のみを検証し、DB アクセスは行わない。検証失敗時は `/login?next=<元パス>` へ redirect。

- **Rationale**: 横断的保護を 1 箇所で担保でき、個別 page/layout でのガード漏れを防ぐ。`verifySession` が Web Crypto ベースなので edge runtime 制約を満たす。
- **Alternative rejected**: 各 page/layout で `readSession()` を呼ぶガード方式 — 保護漏れが起きやすく横断性がない。

### D3: CSRF 防御 — 暗黙的防御で十分

`sameSite=lax` Cookie ＋ Next Server Actions（同一オリジン POST のみ受理）を防御とし、明示的 CSRF トークンは持たない。

- **Rationale**: Server Actions は `POST` + 同一オリジンが前提であり、`sameSite=lax` がクロスサイト送信を抑止する。明示的トークンは複雑化に見合わない（将来の拡張余地として残す）。
- **Alternative rejected**: 独自ダブルサブミット Cookie パターン — 実装・テストコストに対して追加防御が薄い。

### D4: Next ランタイム依存と純関数の分離

| レイヤー | ファイル | 性質 | テスト |
|---------|---------|------|--------|
| 純関数 | `route-protection.ts` | Next 非依存 | vitest 単体 |
| 純関数 | `parse-login-input.ts` | Next 非依存 | vitest 単体 |
| 薄ラッパー | `session-cookie.ts` | `next/headers` 依存 | テスト対象外（E2E で検証） |
| 配線 | `middleware.ts` | edge runtime | テスト対象外 |
| 配線 | `app/login/actions.ts` | Server Action | テスト対象外 |
| 配線 | `app/login/page.tsx` | React | テスト対象外 |

- **Rationale**: Next ランタイム模擬（`next/headers` の mock）は脆い。テスト価値のあるロジックを純関数に切り出し、配線層は最小限にして信頼する。
- **Alternative rejected**: middleware / server action を vitest でモック込み統合テスト — mock が実装詳細に結合し保守コストが高い。

### D5: エラーメッセージ — 種別非開示

ログイン失敗は「メールアドレスまたはパスワードが正しくありません」の単一メッセージ。メール不在／パスワード誤り／アカウント無効を区別しない。

- **Rationale**: user enumeration をUI で助長しない。タイミング均一化・レート制限は後続スコープ。
- **Alternative rejected**: 「メールアドレスが見つかりません」等の親切メッセージ — アカウント存在の推測に利用される。

### D6: ナビのセッション依存表示

`layout.tsx` を async Server Component 化し、`readSession()` で認証状態を取得。認証時は業務ナビ＋ログアウトボタン（form による Server Action 呼び出し）、未認証時（`/login` ページ）はナビ業務リンクを非表示にする。

- **Rationale**: middleware が保護するため未認証で layout に到達するのは `/login` のみ。`readSession()` は layout 内で安全に呼べる。
- **Alternative rejected**: Client Component でセッション API を fetch — 不要な往復が発生し、SSR の利点を失う。

### D7: `config.matcher` と `isPublicPath` の役割分担

middleware の `config.matcher` は Next.js 内部の静的アセット（`_next/static`・`_next/image`・`favicon.ico`）を**呼び出し自体から除外**する（パフォーマンス最適化）。`isPublicPath` はアプリケーションレベルの public 判定（`/login` 等）を担う。

- **Rationale**: matcher は Next.js フレームワーク機能で静的アセットの最適化、`isPublicPath` はビジネスロジック。関心を分離し、`isPublicPath` は純関数として単体テスト可能に保つ。

## Risks / Trade-offs

- **[Risk] セッション TTL 固定で Remember me なし** → 7 日経過で強制ログアウト。単一オーナー利用なので現時点で許容。スライディング有効期限は後続で対応可能。
- **[Risk] middleware で DB を引かないため revocation が即時反映されない** → パスワード変更・アカウント無効化は `exp` まで既存セッションが有効。短 TTL（7 日）で緩和。即時 revocation が必要になった場合は deny-list を検討。
- **[Trade-off] E2E テストなし** → middleware・cookie I/O・redirect の統合動作は手動確認に依存。本スライスのスコープ外として割り切り、後続で Playwright 基盤を追加する。

## Open Questions

（なし — architect 評価済みの設計判断により未決事項は解消済み）
