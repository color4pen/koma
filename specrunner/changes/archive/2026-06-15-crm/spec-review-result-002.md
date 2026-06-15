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
| 1 | LOW | ドキュメント整合性 | design.md (Risks) | spec-review-result-001.md の MEDIUM 所見「copy-before-freeze を明示する」に対し、tasks.md T-03 は正しく修正済み（スプレッドコピー後 freeze の明示的指示あり）だが、design.md の Risks/Mitigation 節（Object.freeze の shallow 性）は「ファクトリ関数内で tags を `Object.freeze` し」と記述したまま、コピー前提が明記されていない。実装に使うのは tasks.md であり実害はないが、design.md 単体を読んだ際にパターンが不完全に見える。 | design.md の Risks 節 Mitigation を「`Object.freeze([...(params.tags ?? [])])` のようにスプレッドコピー後に freeze する（コピーしないと呼び出し元オブジェクトを凍結する副作用が生じる）」に更新する。tasks.md はすでに正しいため変更不要。 |

## 整合性評価サマリ

### spec-review-result-001.md の指摘事項への対応確認

| 所見 | 前回重大度 | 対応状況 |
|------|-----------|----------|
| Repository port が同期 → Drizzle 実装時に破壊的変更確定 | HIGH | **解消済み** — design.md D5 / tasks.md T-04 / T-05 がすべて `Promise<T>` 返り + `Promise.resolve()` ラップに更新された |
| createCustomer で freeze 前コピーが未明示 | MEDIUM | **実装指示は解消済み** — tasks.md T-03 にスプレッドコピー後 freeze の明示指示が追加された。design.md Risk 節が未更新（LOW #1 として記録） |

### 構造不変条件（B-1 〜 B-6）

| 不変条件 | 評価 |
|---------|------|
| B-1: domain は `next`/`react` を import しない | ✓ — package.json の `dependencies` / `devDependencies` にいずれも含まない（T-01 受け入れ基準で機械検証） |
| B-2: domain は `drizzle-orm` を import しない。永続化は port 越し | ✓ — `CustomerRepository` は interface のみ（`src/port/customer-repository.ts`）。実装は後続 `packages/db` が担う（D5） |
| B-3: domain は `zod` を import しない。入力検証は delivery 境界 | ✓ — フォーマット検証をドメイン外とする方針が D3 に明記されている。`ContactInfo` は「存在するか」のみを守る |
| B-4: shared は他パッケージを import しない | ✓ — 本 request の変更対象外。`@koma/crm` は shared を import するが逆ではない |
| B-5: 兄弟 domain は相互 import しない | ✓ — `@koma/crm` の dependencies は `@koma/shared` のみ（model.md §3 dependency table で crm → shared ✓、crm → scheduling/notification ✗） |
| B-6: 業種固有語彙を domain/shared に持ち込まない | ✓ — `customFields: Record<string, CustomFieldValue>` は値の容れ物のみ。スキーマ・業種語彙は domain 外（D4、拡張点 1） |

### domain-model.md との整合

- `Customer` 集約が `Id<'Customer'>` で識別され、連絡先最低 1 つの不変条件を持つ — `domain-model.md` の定義と一致 ✓
- `CustomerRepository` が `src/port/` に配置される — `model.md` §2 mapping（ports = 各 domain パッケージ内の `src/port/`）に準拠 ✓
- `customFields` が値の容れ物のみ（拡張点 1）— `domain-model.md` 拡張点テーブルと一致 ✓
- `ContactInfo` を値オブジェクト（電話/メールいずれか必須）として設計 — `domain-model.md` の「連絡先のいずれかを最低 1 つ持つ」を具体化したものとして整合 ✓

### spec.md シナリオカバレッジ

| 受け入れ基準 | 対応シナリオ |
|------------|------------|
| 電話・メール両方無いと構築できない | 「電話もメールも無い場合はエラーになる」「空文字は連絡先として認めない」 ✓ |
| customFields が値の容れ物として機能する | string / number / boolean 各格納シナリオ ✓ |
| Customer は immutable（新インスタンス返し）| name 更新・tags 更新・id 保持の各シナリオ ✓ |
| CustomerRepository が save / findById / list を持つ | 往復・null・upsert・空リスト・全件返却シナリオ ✓ |
| in-memory 実装の動作 | save→findById・null・list・upsert シナリオで固定 ✓ |

### セキュリティレビュー

純粋 TS ドメインモデルとして外部 I/O を持たず、OWASP Top 10 の直接該当項目なし。

- **入力検証**: delivery 境界（`zod/mini`）に委ねる設計（D3）は B-3 に準拠。`ContactInfo` のフォーマット検証（電話番号形式・メール形式）はドメイン外として正しく除外されており、業種・地域差異がドメインに漏れない。
- **ID 生成**: `createId` が `crypto.randomUUID()` を使用（`@koma/shared/id.ts`）。予測不可能な UUID v4 — 適切。
- **customFields**: `CustomFieldValue = string | number | boolean` の union（D4）は JSON 直列化可能プリミティブに限定し、`unknown` より型安全。ただし runtime での `as any` 経由の不正値混入は delivery の検証に委ねる設計であり、意図通り。
- **immutable 設計**: `Object.freeze` によるランタイム不変性と `readonly` 型保護の組み合わせ — 共有参照経由の不変条件破壊を防ぐ。
- **認証・認可**: `iam` は別コンテキストとして正しくスコープ外。`tenantId` を持たない単一テナント設計 — 将来の移行経路（Organization 上流追加）も記録済み（request.md）。

### パッケージ設計の先例効果評価

本 request は後続ドメインパッケージ（scheduling / notification）の踏襲テンプレートとなる。以下の点で先例として適切：

- パッケージ scaffold が `@koma/shared` と同一パターン（`private` / `type:module` / `exports: "./src/index.ts"` / scripts）→ 後続で迷わない
- port interface の非同期シグネチャ（`Promise<T>`）→ Drizzle adapter 実装時に破壊的変更不要
- ファクトリ関数 + クロージャの in-memory 実装 → `createInMemoryEventBus` と同一パターン
- sibling テスト配置（`src/foo.ts` → `src/foo.test.ts`）→ プロジェクト規約に準拠
