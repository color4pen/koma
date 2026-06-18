# Test Cases: auth-foundation

## Summary

- **Total**: 25 cases
- **Automated** (unit/integration): 23
- **Manual**: 2
- **Priority**: must: 14, should: 9, could: 2

---

## password.ts

### TC-001: 正しいパスワードで verifyPassword が true を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: パスワードハッシュ化はランダム salt を内包した自己完結文字列を返す > Scenario: 正しいパスワードで検証が成功する

### TC-002: 誤ったパスワードで verifyPassword が false を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: パスワードハッシュ化はランダム salt を内包した自己完結文字列を返す > Scenario: 誤ったパスワードで検証が失敗する

### TC-003: 同一パスワードでも hashPassword の結果が異なる（salt 効果）

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: パスワードハッシュ化はランダム salt を内包した自己完結文字列を返す > Scenario: 同一パスワードでもハッシュが異なる（salt 効果）

### TC-004: hashPassword の返却値が salt:hash 形式である

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02

**GIVEN** 任意の平文パスワード `'test'`
**WHEN** `hashPassword('test')` を呼ぶ
**THEN** 返却値が `':'` を含む文字列（`salt:hash` 形式）であり、salt 部と hash 部が非空の hex 文字列である

### TC-005: verifyPassword が形式不正な stored に対して false を返す

**Category**: unit
**Priority**: should
**Source**: design.md > D1

**GIVEN** `':'` を含まない不正形式の stored 文字列 `'invalid-no-colon'`
**WHEN** `verifyPassword('any', 'invalid-no-colon')` を呼ぶ
**THEN** `false` を返す（例外を throw しない）

---

## session.ts

### TC-006: signSession → verifySession のラウンドトリップでペイロードを復元する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: セッショントークンの署名・検証はラウンドトリップで元ペイロードを復元する > Scenario: 署名→検証のラウンドトリップでペイロードを復元する

### TC-007: 改竄されたトークンは null を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: セッショントークンの署名・検証はラウンドトリップで元ペイロードを復元する > Scenario: 改竄されたトークンは null を返す

### TC-008: 有効期限切れトークンは null を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: セッショントークンの署名・検証はラウンドトリップで元ペイロードを復元する > Scenario: 有効期限切れトークンは null を返す

### TC-009: 不正形式のトークンは null を返す

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: セッショントークンの署名・検証はラウンドトリップで元ペイロードを復元する > Scenario: 不正形式のトークンは null を返す

### TC-010: verifySession の now 省略時は Date.now() を使用する

**Category**: unit
**Priority**: could
**Source**: tasks.md > T-03

**GIVEN** 現在時刻より十分先の `exp`（例: `Date.now() + 3600000`）を持つペイロードで署名されたトークン
**WHEN** `verifySession(token, secret)` を `now` 引数なしで呼ぶ
**THEN** `null` ではなく `SessionPayload` を返す（デフォルト `now = Date.now()` が適用されている）

### TC-025: signSession の返却値が `base64url(JSON).base64url(signature)` 形式である

**Category**: unit
**Priority**: could
**Source**: design.md > D2

**GIVEN** 有効なペイロード `{ userId: 'u1', role: 'owner', exp: Date.now() + 3600000 }` と secret `'test'`
**WHEN** `signSession(payload, secret)` を呼ぶ
**THEN** 返却値が `'.'` で区切られた 2 パーツの文字列であり、各パーツが base64url 文字集合（`A-Za-z0-9_-` と `=` なし）のみからなる

---

## auth-config.ts

### TC-011: production で全 env 指定時に正常な AuthConfig を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 認証 env 解決は本番で env 必須、dev で fallback を返す > Scenario: production で全 env 指定時に正常返却する

### TC-012: production で SESSION_SECRET 欠落時に throw する

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: 認証 env 解決は本番で env 必須、dev で fallback を返す > Scenario: production で SESSION_SECRET 欠落時に throw する

### TC-013: production で ADMIN_EMAIL 欠落時に throw する

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: 認証 env 解決は本番で env 必須、dev で fallback を返す > Scenario: production で ADMIN_EMAIL 欠落時に throw する

### TC-014: production で ADMIN_PASSWORD 欠落時に throw する

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: 認証 env 解決は本番で env 必須、dev で fallback を返す > Scenario: production で ADMIN_PASSWORD 欠落時に throw する

### TC-015: dev で全 env 省略時に fallback を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 認証 env 解決は本番で env 必須、dev で fallback を返す > Scenario: dev で全 env 省略時に fallback を返す

### TC-016: dev で一部 env 指定時にその値を優先し残りは fallback を返す

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: 認証 env 解決は本番で env 必須、dev で fallback を返す > Scenario: dev で一部 env 指定時にその値を優先する

---

## composition-root.ts

### TC-017: 初回取得時に owner ユーザーが固定 ID でシードされている

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: owner ブートストラップは固定 ID で冪等にシードする > Scenario: 初回取得時に owner ユーザーがシードされている

### TC-018: getUserRepository を 2 回呼んでも同一インスタンスを返す（シングルトン）

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: owner ブートストラップは固定 ID で冪等にシードする > Scenario: 2 回呼んでも同一リポジトリが返る（シングルトン）

### TC-019: owner ユーザーの passwordHash が adminPassword から生成されており verifyPassword で検証できる

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** `getUserRepository()` で取得したリポジトリから `findByEmail(adminEmail)` で owner ユーザーを取得
**WHEN** `verifyPassword(adminPassword, owner.passwordHash)` を呼ぶ
**THEN** `true` を返す（passwordHash が正しい adminPassword から生成されている）

---

## authenticate.ts

### TC-020: 未登録メールで null を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 認証 use-case は email + password で User を返す > Scenario: 未登録メールで null を返す

### TC-021: 誤パスワードで null を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 認証 use-case は email + password で User を返す > Scenario: 誤パスワードで null を返す

### TC-022: 正しい資格情報で当該 User を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: 認証 use-case は email + password で User を返す > Scenario: 正しい資格情報で User を返す

---

## 依存・ビルド検証

### TC-023: apps/web/package.json が @koma/iam に依存し禁止パッケージが含まれない

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `apps/web/package.json` が更新された状態
**WHEN** `"@koma/iam"` の存在と `grep -E '"(bcrypt|argon2|jose|iron-session)"'` の結果を確認する
**THEN** `"@koma/iam": "workspace:*"` が `dependencies` に存在し、bcrypt / argon2 / jose / iron-session がどのセクションにも含まれない

### TC-024: pnpm モノレポ全体で check-types / test / build が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** すべての実装ファイルが追加・変更された状態
**WHEN** `pnpm -r --if-present run check-types && pnpm -r --if-present run test && pnpm -r --if-present run build` を実行する
**THEN** 3 コマンドが全て exit 0 で終了し、既存テスト（`persistence-mode.test.ts` / `create-booking-use-case.test.ts` 等）が壊れていない

---

## Result

```yaml
result: completed
total: 25
automated: 23
manual: 2
must: 14
should: 9
could: 2
blocked_reasons: []
```
