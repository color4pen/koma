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
| 1 | HIGH | Test Design | tasks.md | T-06 のテストセットアップが「`beforeAll` または `beforeEach`」を許容し、クリーンアップは「`afterAll` で pglite を close する」のみ記載されている。`beforeAll` + 共有状態で実装した場合、テスト 1・3 が事前に行を挿入するため、テスト 4（upsert）で spec.md Scenario 4 の「list の件数は 1 件のままである」アサーションが失敗する。既存の `in-memory-customer-repository.test.ts` は `beforeEach` で毎テスト fresh リポジトリを生成する（確立済みプロジェクトパターン）。 | tasks.md T-06 のセットアップを「`beforeEach` で pglite インスタンスを作成し、CREATE TABLE を発行する」・クリーンアップを「`afterEach` で pglite を close する」に統一する。`beforeAll` の選択肢を削除し、established パターン（`in-memory-customer-repository.test.ts` と同様の `beforeEach` 隔離）を明示する。 |
| 2 | MEDIUM | Consistency | tasks.md / spec.md | spec.md Scenario 4（upsert）には「findById で更新後の name が取得できること」に加えて「list の件数は 1 件のままである」検証が含まれているが、tasks.md T-06 テスト 4 の記述では findById の検証のみ記載されており、list count の検証が省略されている。実装者が tasks.md に従うと acceptance criteria を満たせないリスクがある。 | tasks.md T-06 テスト 4 に「upsert 後 list の件数が増えていないこと（`toHaveLength(1)`）を検証する」を明示的に追加し、spec.md Scenario 4 との整合を取る。 |
| 3 | LOW | Architecture | design.md | D3 / D4 で `DrizzleCustomerRepository` が受ける DB ハンドルの型が「`PgliteDatabase` 型もしくは汎用 `NodePgDatabase` 相当」と OR 表記されており選択が曖昧。`PgliteDatabase` に固定すると後続の本番 PostgreSQL 接続時に型変更が必要になる。本番接続は現スコープ外であるが、設計の意図が不明確。 | design.md D3 に「現フェーズでは `PgliteDatabase` 型を使用し、本番 PostgreSQL 対応は後続 request で汎用型に変更する」か「Drizzle の共通 DB 型（スキーマ付き）を使い pglite / PostgreSQL 両対応にする」のいずれかを選択して明記する。 |

## Summary

**コードベース照合済み確認事項:**

- `CustomerRepository` port の async シグネチャ（`save(customer): Promise<void>` / `findById(id): Promise<Customer | null>` / `list(): Promise<Customer[]>`）が request.md / spec.md の記述と一致。
- `createContactInfo`（≥1 連絡先の不変条件）・`createCustomer` のエクスポートが `packages/crm/src/index.ts` から確認済み。`parseId` も `@koma/shared` から利用可能。
- `model.md` footnote ⁴ の更新（集約ファクトリ import の許容）は T-07 として tasks.md に明示されており、設計・tasks・model.md 更新の整合が取れている。
- `@electric-sql/pglite` は devDependencies への配置が design.md D1 で決定済み（request-review LOW #2 が反映済み）。
- spec.md の 3 要件（port 実装・集約ファクトリ経由再構成・禁止依存）はいずれも Given/When/Then 形式・SHALL/MUST の normative keyword を満たしている。

**セキュリティ評価（OWASP Top 10）:**

- **SQL インジェクション**: Drizzle ORM のパラメータバインドで緩和済み（programmatic スキーマ作成の CREATE TABLE は実行時にユーザー入力を含まない）。
- **入力検証**: 書き込み経路は `Customer` 型（`createCustomer` / `createContactInfo` 経由で構築済みオブジェクト）のみ受け取り、追加検証は不要。
- **読み出し経路**: `createContactInfo` → `createCustomer` の再構成で DB 不正データ（phone/email 両 null 等）を即時例外として検出する anti-corruption が機能する。
- 本コンポーネントは HTTP 境界を持たないため XSS / CSRF / 認証バイパス の直接攻撃面はない。

**needs-fix 理由:** HIGH #1（テスト分離の曖昧さにより spec.md Scenario 4 が実装次第で必ず失敗する経路がある）を解消してから implementation ステップへ進む必要がある。
