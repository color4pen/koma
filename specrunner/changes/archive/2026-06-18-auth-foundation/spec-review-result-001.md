# Spec Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:    specification is complete, consistent, and ready for implementation
  - needs-fix:   specification has issues that must be resolved before implementation
  - escalation:  unresolvable conflicts, missing context, or requires human judgment
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
  - CRITICAL: production outage, data loss, security breach
  - HIGH:     functional failure, clear bug, no workaround — blocks approval
  - MEDIUM:   quality degradation, maintainability issue, future risk
  - LOW:      informational, style, minor improvement
- If no findings, write a table row with "None" or omit the table body.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | MEDIUM | Security / Spec completeness | design.md D1, tasks.md T-02 | `hashPassword` の scrypt コストパラメータ（N, r, p）が spec/design に明記されていない。tasks.md は `keyLength: 64` のみ言及するが N/r/p が定義されていないため、実装者がデフォルト以外の値を選んだ場合に `verifyPassword` の互換性が壊れるリスクがある。またセキュリティ水準（N=16384 は対話認証の最低ライン）が仕様として保証されない。 | design.md D1 に「Node デフォルト（N=16384, r=8, p=1）を採用」と明記し、spec.md の当該 Requirement に `scrypt のコストパラメータは N=16384, r=8, p=1, keyLen=64 を固定する` を一文追記すること。実装定数として同一ファイル内で管理する旨も tasks.md T-02 に補足すると実装ブレを防げる。 |
| 2 | LOW | Spec coverage | spec.md | `verifySession` の malformed token シナリオは「`.` を含まない」ケース（`等` と記述）のみを明示し、`.` が 2 つ以上ある形式（例: `a.b.c`）が未定義。実装者は自然に split した結果が 2 要素以外なら `null` を返す実装をするが、仕様として保証されていない。 | spec.md の該当 Scenario の Given を「`.` で正確に 2 部分に分割できない不正形式の文字列（例: `.` なし、または `.` が 2 つ以上）」に広げるか、`verifySession` の SHALL 文に「`.` による分割が 2 要素以外の場合も `null`」を明記すること。 |
| 3 | LOW | Task completeness | tasks.md T-05 | T-05 の import 一覧（`@koma/iam` から `createUser`, `createInMemoryUserRepository`, `UserRepository`）に `parseId` が含まれていない。`parseId<'User'>` で OWNER_ID を生成するとあるが、`@koma/shared` からの import が必要な点が未記載。`@koma/shared` は `apps/web/package.json` に既存依存として存在するためビルドはブロックしないが、タスクの記述として不完全。 | T-05 の import 一覧に「`parseId` を `@koma/shared` から import する」旨を追記するか、型アサーション（`'...' as Id<'User'>`）を代替として明示すること。 |

## Rationale

### 前提条件の検証結果

以下の現状コードの前提を実コードで確認済み:

- `packages/iam/src/index.ts`: `createUser` / `updateUser` / `User` / `Role` / `createInMemoryUserRepository` / `UserRepository` を export 済み ✅
- `createUser(params)`: `id?: Id<'User'>` 省略可、`email` 非空不変条件あり ✅
- `UserRepository` port: `findByEmail(email: string): Promise<User | null>` メソッドあり ✅
- `apps/web/lib/composition-root.ts`: `globalForApp` シングルトン + `get*Repository` async getter パターン確立済み、`@koma/iam` 未依存 ✅
- `apps/web/lib/persistence-mode.ts`: `selectPersistenceMode({ DATABASE_URL })` 実装済み ✅
- `apps/web/package.json`: `@koma/iam` 未依存、`@koma/shared` は既存依存として存在 ✅
- `packages/shared/src/id.ts`: `parseId<B>(raw)` は UUID v4 正規表現で検証、`Id<B>` は string の branded type ✅
- tasks.md T-05 で例示する固定 UUID `00000000-0000-4000-8000-000000000001` は UUID v4 正規表現（`/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`）を満たす ✅

### アーキテクチャ整合性

- パスワードハッシュ・検証を delivery（`apps/web/lib/`）に置く設計は `domain-model.md`「`User.passwordHash` はドメインが不透明に保持するのみ」と整合 ✅
- `apps/web` が composition root として `@koma/iam` を参照することは `model.md` §4 の許可された依存（delivery → domain）に合致 ✅
- `node:crypto` / Web Crypto のみ使用し外部ランタイム依存なし ✅
- `User ≠ Resource` 方針は `domain-model.md` の宣言と整合 ✅
- セッション署名コードを Cookie I/O と分離した純関数に閉じる設計（D5）は後続スライスの edge ミドルウェア再利用と一致 ✅

### セキュリティ評価（OWASP Top 10 関連）

- **A02 (Cryptographic Failures)**: scrypt はメモリハード KDF として適切。`crypto.timingSafeEqual` / `crypto.subtle.verify` による定数時間比較で timing attack を防止 ✅。ペイロードを暗号化しない設計は userId+role が非秘匿情報である根拠が明示されており、署名による改竄防止として十分 ✅
- **A05 (Security Misconfiguration)**: `NODE_ENV=production` 時の env 必須化（欠落で throw）により本番への dev fallback 漏洩を防止 ✅。`SESSION_SECRET` dev fallback 文字列はコードに固定されるが production guard が有効に機能する ✅
- **A07 (Identification and Authentication Failures)**: レート制限・ロックアウトはスコープ外と明示されており、後続スライスへの委譲が文書化されている ✅。owner 固定 ID の採用根拠（in-memory 再起動後のセッション互換性）が design.md D4 に記録済み ✅
- **情報漏洩防止**: `authenticate` は「メール未登録」と「パスワード不正」で等しく `null` を返す設計であり、ユーザー列挙を防止 ✅（spec.md シナリオで固定）

### request-review 所見との照合

request-review Finding #1（MEDIUM: NODE_ENV の取得元が曖昧）は、design.md D3 の `env.NODE_ENV === 'production'` という記述と tasks.md T-04 の `env: Record<string, string | undefined>` 型定義、spec.md の Given 形式（`NODE_ENV=production` を env に含める前提）で一貫して解決済み ✅

### ブロッキング判定

CRITICAL / HIGH 所見なし。MEDIUM 1 件（Finding #1）は scrypt コストパラメータの文書化欠落であり、Node デフォルト（N=16384, r=8, p=1）を使用する限り正常動作するため実装段階でのブロックはないが、仕様の監査証跡として明記を推奨する。LOW 2 件は実装者が自然に対処できる範囲の記述補完であり承認をブロックしない。
