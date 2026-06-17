# Test Cases: db-customer

## Summary

- **Total**: 20 cases
- **Automated** (unit/integration): 10
- **Manual**: 10
- **Priority**: must: 14, should: 5, could: 1

---

## CustomerRepository 契約テスト（pglite）

### TC-001: save した Customer を findById で同値取得する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: DrizzleCustomerRepository SHALL implement CustomerRepository port with upsert semantics > Scenario: save した Customer を findById で同値取得する

---

### TC-002: 未保存の id で findById すると null を返す

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: DrizzleCustomerRepository SHALL implement CustomerRepository port with upsert semantics > Scenario: 未保存の id で findById すると null を返す

---

### TC-003: list が保存済みの全 Customer を返す

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: DrizzleCustomerRepository SHALL implement CustomerRepository port with upsert semantics > Scenario: list が保存済みの全 Customer を返す

---

### TC-004: 同一 id で再 save すると既存データが更新される（upsert）

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: DrizzleCustomerRepository SHALL implement CustomerRepository port with upsert semantics > Scenario: 同一 id で再 save すると既存データが更新される（upsert）

---

## 集約ファクトリ経由の再構成・不変条件テスト

### TC-005: phone のみの Customer を save → findById で再構成すると ContactInfo が不変条件を満たす

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 行から Customer への再構成は集約ファクトリ経由で行い、集約の不変条件を保つ SHALL > Scenario: phone のみの Customer を save → findById で再構成すると ContactInfo が不変条件を満たす

---

### TC-006: email のみの Customer を save → findById で再構成すると ContactInfo が不変条件を満たす

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: 行から Customer への再構成は集約ファクトリ経由で行い、集約の不変条件を保つ SHALL > Scenario: email のみの Customer を save → findById で再構成すると ContactInfo が不変条件を満たす

---

### TC-007: phone と email の両方を持つ Customer を save → findById で再構成すると ContactInfo が不変条件を満たす

**Category**: integration
**Priority**: should
**Source**: spec.md > Requirement: 行から Customer への再構成は集約ファクトリ経由で行い、集約の不変条件を保つ SHALL > Scenario: phone と email の両方を持つ Customer を save → findById で再構成すると ContactInfo が不変条件を満たす

---

## 依存構成・パッケージ制約

### TC-008: package.json の依存構成が制約を満たす

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: packages/db は drizzle-orm を import する唯一の層であり、禁止依存を持たない SHALL > Scenario: package.json の依存構成が制約を満たす

---

### TC-009: package.json のメタフィールドが正しく設定されている

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** packages/db/package.json が存在する
**WHEN** name / private / type / exports フィールドを確認する
**THEN** name が `"@koma/db"` / private が `true` / type が `"module"` / exports が `{ ".": "./src/index.ts" }` である

---

### TC-010: 設定ファイル（tsconfig.json / vitest.config.ts / eslint.config.js）が存在する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** packages/db/ が作成されている
**WHEN** packages/db/ 配下のファイル一覧を確認する
**THEN** tsconfig.json / vitest.config.ts / eslint.config.js がそれぞれ存在する

---

### TC-011: @electric-sql/pglite が devDependencies に配置されている（runtime 依存でない）

**Category**: manual
**Priority**: should
**Source**: design.md > D1（request-review LOW #2 対応）

**GIVEN** packages/db/package.json が存在する
**WHEN** dependencies と devDependencies のキー一覧を確認する
**THEN** `@electric-sql/pglite` が devDependencies に存在し、dependencies には存在しない

---

## Drizzle スキーマ・スキャフォールド

### TC-012: customers テーブルが全カラム・型・nullable を正しく定義している

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-02 / design.md > D2

**GIVEN** packages/db/src/schema/customer.ts が存在する
**WHEN** pgTable 定義のカラム一覧を確認する
**THEN** 以下のカラムがすべて定義されている:
- `id`: text, PRIMARY KEY
- `name`: text, NOT NULL
- `phone`: text, nullable
- `email`: text, nullable
- `tags`: jsonb, NOT NULL
- `notes`: text, NOT NULL
- `custom_fields`: jsonb, NOT NULL

---

### TC-013: createDrizzleClient が pglite インスタンスから Drizzle DB ハンドルを生成できる

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-03 / design.md > D4

**GIVEN** `@electric-sql/pglite` の PGlite インスタンスが存在する
**WHEN** `createDrizzleClient(pglite)` を呼ぶ
**THEN** Drizzle の DB ハンドルが返され、`createDrizzleCustomerRepository(db)` に注入して SQL 操作が実行できる

---

## 公開 API・型整合

### TC-014: pnpm -F @koma/db run check-types が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-04 / T-08

**GIVEN** packages/db のソースが完成している
**WHEN** `pnpm -F @koma/db run check-types` を実行する
**THEN** TypeScript コンパイルエラーなしで成功する（`DrizzleCustomerRepository` が `CustomerRepository` 型を満たすことが型レベルで検証される）

---

### TC-015: @koma/db の公開 API から必要なシンボルが import 可能

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** packages/db/src/index.ts が存在する
**WHEN** index.ts の named export 一覧を確認する
**THEN** `createDrizzleCustomerRepository` と `createDrizzleClient` が named export されている

---

## テスト品質・分離

### TC-016: 各テストが fresh な pglite インスタンスで実行され、テスト間で状態が共有されない

**Category**: integration
**Priority**: should
**Source**: design.md > D5

**GIVEN** drizzle-customer-repository.test.ts が存在する
**WHEN** テストを複数回、順序を変えて実行する
**THEN** 各テストは beforeEach で新規作成した pglite インスタンス上で独立して実行され、他のテストの save 操作が結果に影響しない

---

## jsonb マッピング

### TC-019: tags / customFields（jsonb）が DB 保存・取得でラウンドトリップを正しく保持する

**Category**: integration
**Priority**: should
**Source**: design.md > D2 / D3（jsonb マッピング）

**GIVEN** `tags: ["vip", "new"]` / `customFields: { "score": 5, "active": true, "label": "gold" }` を持つ Customer が save されている
**WHEN** `findById` で取得する
**THEN** 取得した Customer の `tags` が元の配列と等しく、`customFields` の各エントリ（文字列・数値・真偽値）が元のオブジェクトと等しい

---

## ドキュメント整合

### TC-017: model.md footnote ⁴ が集約ファクトリ import を許容する記述に更新されている

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-07 / design.md > D6

**GIVEN** docs/アーキテクチャ/model.md が存在する
**WHEN** footnote ⁴ の記述を確認する
**THEN** `db → domain` の参照許容範囲として「port interface / 型 / 集約ファクトリ（anti-corruption 用）」が明記されており、B-2 等の他セクションと矛盾しない

---

## 全体検証

### TC-018: pnpm -r run check-types && pnpm -r run test が全パッケージで green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-08

**GIVEN** @koma/db を含む全パッケージのソースが揃っている
**WHEN** `pnpm -r --if-present run check-types && pnpm -r --if-present run test` を実行する
**THEN** @koma/db のテスト・型チェックが成功し、既存パッケージ（@koma/crm / @koma/shared 等）にも影響がなく全パッケージで green になる

---

### TC-020: pnpm -F @koma/db run lint が成功する

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-08

**GIVEN** packages/db のソースが存在する
**WHEN** `pnpm -F @koma/db run lint` を実行する
**THEN** lint エラーなしで成功する

---

## Result

```yaml
result: completed
total: 20
automated: 10
manual: 10
must: 14
should: 5
could: 1
blocked_reasons: []
```
