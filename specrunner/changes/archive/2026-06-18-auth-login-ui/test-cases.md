# Test Cases: auth-login-ui

## Summary

- **Total**: 30 cases
- **Automated** (unit/integration): 10
- **Manual**: 20
- **Priority**: must: 29, should: 1, could: 0

---

## isPublicPath — ルート保護判定純関数

### TC-001: /login は public パスと判定される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: isPublicPath SHALL correctly classify paths > Scenario: /login is public

---

### TC-002: Next.js 静的アセットパスは public と判定される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: isPublicPath SHALL correctly classify paths > Scenario: Next.js static asset is public

---

### TC-003: 業務パスは保護対象と判定される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: isPublicPath SHALL correctly classify paths > Scenario: Business path is protected

---

### TC-004: ルートパスは保護対象と判定される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: isPublicPath SHALL correctly classify paths > Scenario: Root path is protected

---

### TC-005: /favicon.ico は public パスと判定される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01 Acceptance Criteria

**GIVEN** pathname `/favicon.ico`
**WHEN** `isPublicPath` を呼ぶ
**THEN** `true` を返す

---

### TC-006: /login/reset は public パスと判定されない（前方一致ではなく完全一致）

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01 Acceptance Criteria

**GIVEN** pathname `/login/reset`
**WHEN** `isPublicPath` を呼ぶ
**THEN** `false` を返す（`/login` は完全一致のみ public）

---

## parseLoginInput — ログイン入力検証純関数

### TC-007: email・password ともに非空の場合は成功を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseLoginInput SHALL validate email and password presence > Scenario: Both fields non-empty returns success

---

### TC-008: email が空の場合は失敗を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseLoginInput SHALL validate email and password presence > Scenario: Empty email returns failure

---

### TC-009: password が空の場合は失敗を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseLoginInput SHALL validate email and password presence > Scenario: Empty password returns failure

---

### TC-010: フィールドが両方欠落している場合は失敗を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseLoginInput SHALL validate email and password presence > Scenario: Missing fields returns failure

---

## Middleware — ルート保護（Edge Runtime）

### TC-011: 未認証リクエストが保護パスへアクセスすると /login?next= へリダイレクト

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Route protection SHALL redirect unauthenticated requests to login > Scenario: Unauthenticated request to protected path redirects to login

---

### TC-012: 期限切れセッションは /login?next= へリダイレクト

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Route protection SHALL redirect unauthenticated requests to login > Scenario: Expired session redirects to login

---

### TC-013: 有効なセッションは保護パスを通過する

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Route protection SHALL redirect unauthenticated requests to login > Scenario: Valid session passes through to protected path

---

### TC-014: public パスは認証なしで通過する

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Route protection SHALL redirect unauthenticated requests to login > Scenario: Public path does not require authentication

---

### TC-015: middleware.ts の config.matcher が静的アセットを除外している

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-06 Acceptance Criteria / request.md 受け入れ基準

**GIVEN** `apps/web/middleware.ts` が存在する
**WHEN** `config.matcher` の定義を確認する
**THEN** `_next/static`・`_next/image`・`favicon.ico` がマッチャーから除外されている

---

## Login Action — ログイン Server Action

### TC-016: 正しい資格情報でセッション Cookie が設定され redirect する

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Login action SHALL authenticate and set session cookie on success > Scenario: Valid credentials set cookie and redirect

---

### TC-017: 誤った資格情報でメール/パスワード種別を区別しない汎用エラーを返す

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Login action SHALL authenticate and set session cookie on success > Scenario: Invalid credentials return generic error

---

### TC-018: 入力検証エラー時はフィールドレベルのエラーを返す

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Login action SHALL authenticate and set session cookie on success > Scenario: Invalid input returns validation errors

---

### TC-019: next パラメータが / で始まらない場合は / にフォールバックする（オープンリダイレクト防止）

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-07 Acceptance Criteria（open redirect 防止 — CWE-601）

**GIVEN** 正しい資格情報でログイン操作を行い、`next=https://evil.com` を渡す
**WHEN** ログイン action が実行される
**THEN** リダイレクト先は `https://evil.com` ではなく `/` になる

---

### TC-020: next パラメータが // で始まる場合は / にフォールバックする（オープンリダイレクト防止）

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-07 Acceptance Criteria（open redirect 防止 — CWE-601）

**GIVEN** 正しい資格情報でログイン操作を行い、`next=//evil.com` を渡す
**WHEN** ログイン action が実行される
**THEN** リダイレクト先は `//evil.com` ではなく `/` になる

---

## Logout Action — ログアウト Server Action

### TC-021: ログアウト action が koma_session Cookie を削除し /login へリダイレクト

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Logout action SHALL clear session cookie and redirect to login > Scenario: Logout clears cookie

---

## Session Cookie I/O

### TC-022: 本番環境では secure 属性付きで Cookie が設定される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Session cookie SHALL use secure attributes > Scenario: Cookie attributes in production

---

### TC-023: 開発環境では secure 属性なしで Cookie が設定される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Session cookie SHALL use secure attributes > Scenario: Cookie attributes in development

---

## Navigation — ナビ・ログアウト導線

### TC-024: 認証済みユーザーには業務ナビとログアウトボタンが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Navigation SHALL show logout affordance when authenticated > Scenario: Authenticated user sees nav and logout

---

### TC-025: ログインページでは業務ナビが表示されない

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: Navigation SHALL show logout affordance when authenticated > Scenario: Login page hides business nav

---

### TC-026: 認証済み時にナビへ adminEmail が表示される

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-09 Acceptance Criteria

**GIVEN** `ADMIN_EMAIL=admin@example.com` が設定され、有効なセッションが存在する
**WHEN** 保護された業務ページをレンダリングする
**THEN** ナビのヘッダーに `admin@example.com` が表示される

---

## パッケージ制約・ビルド検証

### TC-027: 外部認証ライブラリが package.json に含まれていない

**Category**: manual
**Priority**: must
**Source**: request.md 受け入れ基準 / tasks.md > T-10

**GIVEN** `apps/web/package.json`
**WHEN** `grep -E '"(jose|iron-session|next-auth|@auth/)"' apps/web/package.json` を実行する
**THEN** マッチが 0 件（終了コード 1）になる

---

### TC-028: check-types が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-10 Acceptance Criteria

**GIVEN** 全新規ファイルが実装済み
**WHEN** `pnpm -r --if-present run check-types` を実行する
**THEN** 終了コード 0 で成功する

---

### TC-029: vitest テストが green（既存テスト含む）

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-10 Acceptance Criteria

**GIVEN** `route-protection.test.ts` と `parse-login-input.test.ts` が実装済み
**WHEN** `pnpm -r --if-present run test` を実行する
**THEN** 全テスト（新規・既存）が green で終了コード 0

---

### TC-030: build が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-10 Acceptance Criteria

**GIVEN** 全新規ファイルが実装済み
**WHEN** `pnpm -r --if-present run build` を実行する
**THEN** 終了コード 0 で成功する

---

## Result

```yaml
result: completed
total: 30
automated: 10
manual: 20
must: 29
should: 1
could: 0
blocked_reasons: []
```
