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

- **verdict**: needs-fix

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | HIGH | 前方互換性 / 設計 | design.md (D5), tasks.md (T-04), spec.md | `CustomerRepository` port の全メソッドが同期シグネチャで定義されている（`save(): void` / `findById(): Customer \| null` / `list(): Customer[]`）。後続 request で実装される Drizzle アダプタ（`packages/db`）は本質的に非同期であり、port を `Promise<T>` 返りに変更せざるを得ない。port は hexagonal の安定した契約であるべきだが、この設計は packages/db 実装時に破壊的変更が確定する。また本 request は後続ドメインパッケージ（scheduling / notification）の踏襲テンプレートとなるため、誤ったパターンがドメイン全体に波及する。Design の Open Questions は「なし」と宣言しており、この問題が設計上考慮されていないことが問題。 | port メソッドをすべて `Promise` 返りに変更する: `save(customer: Customer): Promise<void>` / `findById(id: Id<'Customer'>): Promise<Customer \| null>` / `list(): Promise<Customer[]>`。in-memory 実装はそれぞれ `Promise.resolve(...)` でラップすれば容易に満たせる。spec.md のシナリオも `async/await` を用いた記述に更新する。これにより packages/db が port を実装する際に破壊的変更が不要になる。|
| 2 | MEDIUM | 正確性 / 実装定義 | tasks.md (T-03) | `createCustomer` ファクトリのタスク記述が「`tags` と `customFields` を `Object.freeze` する」と指示しているが、呼び出し元から渡された配列・オブジェクトをコピーせずに `Object.freeze` すると、呼び出し元が保持するオリジナルの配列・オブジェクトも凍結されてしまう。これは設計意図とずれた副作用で、実装者が見落とした場合に難解なバグを生む。Design の Risk 節は shallow freeze の問題を指摘しているが、「コピー前 freeze」の必要性には言及していない。 | tasks.md T-03 の指示にスプレッドコピーを明示する: `const frozenTags = Object.freeze([...(params.tags ?? [])])` / `const frozenFields = Object.freeze({ ...(params.customFields ?? {}) })`。コピー後に freeze することで元オブジェクトを変更しない。design.md D2 の Mitigation 節にも同様に追記する。 |

## 根拠サマリ

### 整合性確認（問題なし）

- **構造整合 (B-1〜B-6)**: `@koma/crm` は `@koma/shared` のみに依存し、`next` / `react` / `drizzle-orm` / `zod` を含まない。`model.md` §3 の依存表（crm → shared ✓）に完全準拠。`src/port/` 配置も §2 mapping に従っている。
- **ドメインモデル整合**: `domain-model.md` の Customer 集約・不変条件・customFields 拡張点と spec の内容が一致している。`ContactInfo` の「電話/メールいずれか必須」は domain-model.md の「連絡先のいずれか…最低 1 つ持つ」を具体化したものとして整合する。
- **immutable 更新**: `updateCustomer` が `id` を Pick の対象外とし、新インスタンスを返すパターンは正しい。spec.md シナリオ「updateCustomer は id を保持する」でこれを固定している。
- **customFields**: `Record<string, string | number | boolean>` の選択（JSON 直列化可能プリミティブ限定）は D4 rationale に説明されており、B-6 に準拠。`Map` を避けた判断は合理的。
- **in-memory 実装パターン**: `@koma/shared/createInMemoryEventBus` と同一のファクトリ関数+クロージャパターンを踏襲している。一貫性あり。
- **テストカバレッジ**: spec.md の BDD シナリオが受け入れ基準の全項目を網羅している。ContactInfo 不変条件・Customer immutability・upsert セマンティクス・空リストがすべて固定されている。
- **セキュリティ**: 純粋 TS ドメインモデルとして外部 I/O を持たない。OWASP Top 10 の該当項目なし。customFields の入力検証は delivery 境界（`zod/mini`）に委ねる方針は B-3 に準拠しており適切。`createId` が `crypto.randomUUID()` を使用する点も問題なし。IAM / 認証はスコープ外として正しく除外されている。

### ブロッキング所見サマリ

| 所見 | 重大度 | 影響範囲 |
|------|--------|---------|
| Repository port が同期 → packages/db 実装時に破壊的変更確定 | HIGH | port interface, tasks.md T-04, spec.md シナリオ, 後続ドメインパッケージのテンプレート |
| createCustomer で freeze 前のコピーが未明示 | MEDIUM | tasks.md T-03 実装指示, design.md D2 Mitigation |
