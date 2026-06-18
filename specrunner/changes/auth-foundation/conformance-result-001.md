# Conformance Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:   implementation conforms to tasks.md, design.md, spec.md, and request.md
  - needs-fix:  one or more upstream artifacts are not satisfied by the implementation
  - escalation: conformance cannot be determined (missing artifacts, unresolvable ambiguity)
- The Findings table records the per-artifact judgment.
-->

- **verdict**: approved

## Conformance Findings

| Artifact | Conforms | Notes |
|----------|----------|-------|
| tasks.md | ✅ | T-01〜T-07 全チェックボックス [x] 済み |
| design.md | ✅ | D1〜D5 全設計判断が実装に反映されている |
| spec.md | ✅ | 全 Requirements (SHALL/MUST) と全 Scenarios のテストが通過 |
| request.md | ✅ | 全受け入れ基準を満たす。check-types/test/lint/build 全フェーズ green |

---

## 詳細

### Tasks 完了確認

`tasks.md` T-01〜T-07 の全サブタスクが `[x]` でマーク済み。

---

### Design Decisions 適合

| ID | 判断 | 実装 | 適合 |
|----|------|------|------|
| D1 | `node:crypto` scrypt + random 16-byte salt + `timingSafeEqual` | `password.ts`: `randomBytes(16)` / `promisify(scrypt)` / `timingSafeEqual` — 形式 `saltHex:hashHex` | ✅ |
| D2 | Web Crypto HMAC-SHA256 署名、暗号化なし、依存ゼロ | `session.ts`: `crypto.subtle.importKey` / `.sign` / `.verify` — Node/edge 双方で動作 | ✅ |
| D3 | `resolveAuthConfig` 純関数、production 必須・dev fallback | `auth-config.ts`: `NODE_ENV=production` で missing 変数名入り throw、それ以外は fallback | ✅ |
| D4 | 固定 UUID で owner シード、冪等 | `composition-root.ts`: `OWNER_USER_ID = parseId<'User'>('00000000-0000-4000-8000-000000000001')`、`findByEmail` で冪等チェック | ✅ |
| D5 | Next ランタイム非依存の純粋関数 | `password.ts` / `session.ts` / `auth-config.ts` / `authenticate.ts` に `next/headers` / React import なし | ✅ |

---

### Spec Requirements / Scenarios 適合

**パスワードハッシュ化**

| Scenario | テスト | 適合 |
|----------|--------|------|
| 正しいパスワードで検証が成功する | `password.test.ts` | ✅ |
| 誤ったパスワードで検証が失敗する | `password.test.ts` | ✅ |
| 同一パスワードでもハッシュが異なる（salt 効果） | `password.test.ts` | ✅ |

SHALL: `hashPassword` は salt 内包の自己完結文字列を返す / `verifyPassword` は `timingSafeEqual` で定数時間比較 → ✅

**セッショントークン署名・検証**

| Scenario | テスト | 適合 |
|----------|--------|------|
| ラウンドトリップでペイロードを復元する | `session.test.ts` | ✅ |
| 改竄されたトークンは null を返す | `session.test.ts` | ✅ |
| 有効期限切れトークンは null を返す（`now === exp` / `now > exp` 境界値両方） | `session.test.ts` | ✅ |
| 不正形式のトークンは null を返す | `session.test.ts` | ✅ |

SHALL: `base64url(JSON).base64url(signature)` 形式 / `crypto.subtle.verify` による定数時間相当比較 / Cookie I/O を含まない → ✅

**認証 env 解決**

| Scenario | テスト | 適合 |
|----------|--------|------|
| production で全 env 指定時に正常返却 | `auth-config.test.ts` | ✅ |
| production で SESSION_SECRET 欠落時に throw | `auth-config.test.ts` | ✅ |
| production で ADMIN_EMAIL 欠落時に throw | `auth-config.test.ts` | ✅ |
| production で ADMIN_PASSWORD 欠落時に throw | `auth-config.test.ts` | ✅ |
| dev で全 env 省略時に fallback を返す | `auth-config.test.ts` | ✅ |
| dev で一部 env 指定時にその値を優先 | `auth-config.test.ts` | ✅ |

SHALL: fallback にコメント「dev 専用」明示 (`// dev 専用 fallback 値。本番環境では絶対に使用しないこと。`) / production では fallback を使わず throw → ✅

**owner ブートストラップ**

| Scenario | テスト | 適合 |
|----------|--------|------|
| 初回取得時に owner ユーザーがシードされている | `composition-root.test.ts` | ✅ |
| 2 回呼んでも同一リポジトリが返る（シングルトン） | `composition-root.test.ts` | ✅ |

SHALL: 固定 UUID で `createUser` 呼び出し / `findByEmail` による冪等チェック → ✅

**認証 use-case**

| Scenario | テスト | 適合 |
|----------|--------|------|
| 未登録メールで null を返す | `authenticate.test.ts` | ✅ |
| 誤パスワードで null を返す | `authenticate.test.ts` | ✅ |
| 正しい資格情報で User を返す | `authenticate.test.ts` | ✅ |

SHALL: `repo.findByEmail → verifyPassword → User | null` の流れ / エラー種別を漏らさない → ✅

---

### 受け入れ基準（request.md）適合

| 基準 | 適合 |
|------|------|
| `apps/web/package.json` に `@koma/iam: workspace:*` が存在 | ✅ |
| `grep -E '"(bcrypt\|argon2\|jose\|iron-session)"'` が 0 件 | ✅ |
| `password` テスト: true/false/salt 効果 | ✅ (6 tests passed) |
| `session` テスト: ラウンドトリップ/改竄 null/expiry null | ✅ (8 tests passed) |
| `auth-config` テスト: production throw/dev fallback | ✅ (10 tests passed) |
| `authenticate` テスト: null ケース×2 / 成功ケース | ✅ (4 tests passed) |
| owner ブートストラップ: `role: 'owner'` + 固定 id | ✅ (5 tests passed) |
| `check-types && test && lint && build` が green | ✅ (verification-result.md: 全フェーズ passed) |

---

### 特記事項

**テスト分離（観察）**: `composition-root.test.ts` は `globalThis` 上の `userRepoInitPromise` を通じてシングルトンをテストしており、テスト実行順序によっては前のテストの状態が残る可能性がある。verification-result で全 5 テストが安定して通過しており、現時点では実害なし。後続スライスでの強化（`beforeEach` でグローバルリセット）を検討可能だが、本リクエストのスコープ内では許容範囲。

**スコープ遵守**: `next/headers` / Cookie I/O / ミドルウェア / ログイン UI は一切実装されていない。後続スライス `auth-login-ui` への明確な境界が保たれている。
