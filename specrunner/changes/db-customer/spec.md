# Spec: db-customer

## Requirements

### Requirement: DrizzleCustomerRepository SHALL implement CustomerRepository port with upsert semantics

`DrizzleCustomerRepository` SHALL implement the `CustomerRepository` port（`save` / `findById` / `list`）defined by `@koma/crm`, using Drizzle ORM. `save` は id ベースの upsert（同一 id なら全フィールド更新、新規なら挿入）を行う。

#### Scenario: save した Customer を findById で同値取得する

**Given** DrizzleCustomerRepository が pglite 上の customers テーブルに接続している
**When** Customer（id / name / contact / tags / notes / customFields を含む）を save し、同じ id で findById を呼ぶ
**Then** 取得した Customer の全フィールド（id / name / contact.phone / contact.email / tags / notes / customFields）が save した Customer と一致する

#### Scenario: 未保存の id で findById すると null を返す

**Given** DrizzleCustomerRepository が空の customers テーブルに接続している
**When** 存在しない id で findById を呼ぶ
**Then** `null` が返る

#### Scenario: list が保存済みの全 Customer を返す

**Given** DrizzleCustomerRepository に複数の Customer が save されている
**When** list を呼ぶ
**Then** 保存した全 Customer が結果に含まれる

#### Scenario: 同一 id で再 save すると既存データが更新される（upsert）

**Given** Customer A（id=X, name="Alice"）が save されている
**When** 同じ id=X で name="Alice Updated" に変更した Customer を save する
**Then** findById(X) で取得した Customer の name が "Alice Updated" であり、list の件数は 1 件のままである

### Requirement: 行から Customer への再構成は集約ファクトリ経由で行い、集約の不変条件を保つ SHALL

DB 行 → ドメイン `Customer` の再構成は `createContactInfo` + `createCustomer`（crm の集約ファクトリ）を経由しなければならない（SHALL）。これにより ContactInfo の「≥1 連絡先」等の集約不変条件が再構成時にも検証される（anti-corruption layer）。

#### Scenario: phone のみの Customer を save → findById で再構成すると ContactInfo が不変条件を満たす

**Given** phone="090-1234-5678", email=null の ContactInfo を持つ Customer が save されている
**When** findById で取得する
**Then** 取得した Customer の contact.phone が "090-1234-5678"、contact.email が null であり、ContactInfo の不変条件（≥1 連絡先）を満たしている

#### Scenario: email のみの Customer を save → findById で再構成すると ContactInfo が不変条件を満たす

**Given** phone=null, email="test@example.com" の ContactInfo を持つ Customer が save されている
**When** findById で取得する
**Then** 取得した Customer の contact.phone が null、contact.email が "test@example.com" であり、ContactInfo の不変条件（≥1 連絡先）を満たしている

#### Scenario: phone と email の両方を持つ Customer を save → findById で再構成すると ContactInfo が不変条件を満たす

**Given** phone="090-1234-5678", email="test@example.com" の ContactInfo を持つ Customer が save されている
**When** findById で取得する
**Then** 取得した Customer の contact.phone が "090-1234-5678"、contact.email が "test@example.com" であり、ContactInfo の不変条件を満たしている

### Requirement: packages/db は drizzle-orm を import する唯一の層であり、禁止依存を持たない SHALL

`@koma/db` の package.json SHALL have `drizzle-orm` in its dependencies. `next` / `react` / `zod` MUST NOT appear in either dependencies or devDependencies.

#### Scenario: package.json の依存構成が制約を満たす

**Given** `packages/db/package.json` が存在する
**When** dependencies / devDependencies を確認する
**Then** `drizzle-orm` が dependencies に存在し、`@koma/crm` / `@koma/shared` が dependencies に存在し、`next` / `react` / `zod` が dependencies にも devDependencies にも存在しない
