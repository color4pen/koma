# Request Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approve | needs-discussion | reject
  - approve:          No blocking findings (no HIGH, no decision-needed). Request is ready for pipeline execution.
  - needs-discussion: One or more blocking findings (HIGH or decision-needed) resolvable through discussion.
  - reject:           Multiple blocking findings AND requirement contradictions or structural breakdown.
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | Location | Description | Recommendation
- Valid Severity values (uppercase): HIGH | MEDIUM | LOW
  - HIGH:   Request-level defect — goal unclear, acceptance criteria absent/untestable, or critical external constraint unspecified
  - MEDIUM: Scope ambiguity, recommended additions
  - LOW:    Clarity improvements, expression refinements
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approve

## Findings

| # | Severity | Category | Location | Description | Recommendation |
|---|----------|----------|----------|-------------|----------------|
| 1 | MEDIUM | Spec ambiguity | req 3 `resolveAuthConfig(env)` | `NODE_ENV` の取得元が明示されていない。`env` パラメータに含めるか `process.env.NODE_ENV` を直接読むかで、関数の純粋性とテスト方法が変わる。acceptance criteria の「`NODE_ENV=production` で env 欠落時に throw」は process 環境変数を直接設定するテストパターンを示唆しているが、シグネチャに含まれるかどうかが曖昧。 | `resolveAuthConfig` の `env` 型を `Record<string, string \| undefined>` として NODE_ENV も受け取れるようにする（`process.env` を丸ごと渡す形）か、シグネチャに `nodeEnv?: string` を明示的に加えるかを spec で確定させること。どちらでも実装・テストは成立するが、明示しておくと spec-fixer / implementer の判断ブレを防げる。 |
| 2 | LOW | Implementation guidance | req 4 `getUserRepository()` | `hashPassword`（非同期）を含む owner シード処理を伴う初期化は、既存の同期的 in-memory getter（`customerRepository` 等）と異なる非同期初期化パターンが必要。`drizzleInitPromise` と同様の Promise singleton 化が想定されるが、request ではその旨が言及されていない。 | 「初回初期化は Promise singleton で行う（`drizzleInitPromise` パターンに準ずる）」旨を requirements に一文添えると、implementer の設計判断が確定し実装の揺れを防げる。 |
| 3 | LOW | Clarity | req 2 `verifySession` | セッショントークン形式 `base64url(JSON).base64url(署名)` の `.` 区切りで split する際、先頭の `.` で二分割（payload / signature）することは自明だが、仕様として明記されていない。 | `verifySession` の処理記述に「`.` で最初の 1 箇所のみ split（payload 部と signature 部に二分割）」と一文添えるとよい。 |

## Rationale

### 前提条件の検証結果

以下の現状コードの前提（request.md §現状コードの前提）をすべてコードで確認済み:

- `packages/iam/src/index.ts`: `createUser` / `updateUser` / `User` / `Role` / `createInMemoryUserRepository` / `UserRepository` を export 済み ✅
- `createUser(params)`: `id?: Id<'User'>` 省略可、`email` 非空不変条件あり ✅
- `UserRepository` port: `findByEmail(email)` メソッドあり ✅（authenticate use-case の前提を満たす）
- `apps/web/lib/composition-root.ts`: getter パターン（`getCustomerRepository` 等）確立済み、`@koma/iam` 未依存 ✅
- `apps/web/lib/persistence-mode.ts`: `selectPersistenceMode({ DATABASE_URL })` 実装済み ✅
- `apps/web/package.json`: `@koma/iam` 未依存 ✅

### アーキテクチャ整合性

- パスワードハッシュ・検証を delivery（`apps/web`）に置く設計は `docs/アーキテクチャ/domain-model.md` の「`User.passwordHash` はドメインが不透明に保持するのみ」と整合 ✅
- `apps/web` が composition root として `@koma/iam` を参照することは `model.md` §3 の許可された依存（delivery → domain ✓）に合致 ✅
- `node:crypto` / Web Crypto のみ使用し外部ランタイム依存なし → B-1/B-2 に違反しない ✅
- `User ≠ Resource` 方針は `domain-model.md` の宣言と整合 ✅

### ブロッキング判定

HIGH 所見なし。MEDIUM 1 件は「`NODE_ENV` の取得元」という実装時に解決可能な曖昧さであり、要件の意図・acceptance criteria・スコープはいずれも明確。spec 生成時に resolveAuthConfig の env 型定義を確定させることで吸収できる。
