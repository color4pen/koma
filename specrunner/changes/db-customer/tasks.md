# Tasks: db-customer

## T-01: packages/db パッケージの scaffold 作成

- [x] `packages/db/package.json` を作成する。name `@koma/db` / `private: true` / `type: module` / `exports: { ".": "./src/index.ts" }`
- [x] scripts: `"check-types": "tsc --noEmit"` / `"test": "vitest run"` / `"lint": "eslint ."`
- [x] dependencies: `drizzle-orm` / `@koma/crm: workspace:*` / `@koma/shared: workspace:*`
- [x] devDependencies: `@electric-sql/pglite` / `vitest` / `typescript` / `@eslint/js` / `eslint` / `typescript-eslint`
- [x] 禁止依存（`next` / `react` / `zod`）が含まれていないことを確認する
- [x] `packages/db/tsconfig.json` を作成する（`packages/crm/tsconfig.json` を踏襲: `target: ES2022` / `module: ES2022` / `moduleResolution: bundler` / `strict: true` / `noEmit: true` / `skipLibCheck: true` / `include: ["src"]`）
- [x] `packages/db/vitest.config.ts` を作成する（`packages/crm/vitest.config.ts` を踏襲: `test.include: ['src/**/*.test.ts']`）
- [x] `packages/db/eslint.config.js` を作成する（`packages/crm/eslint.config.js` を踏襲）
- [x] `pnpm install` を実行し、ワークスペースの依存を解決する

**Acceptance Criteria**:
- `packages/db/package.json` の name が `@koma/db`
- `drizzle-orm` が dependencies に存在する
- `@koma/crm` / `@koma/shared` が dependencies に存在する（`workspace:*`）
- `@electric-sql/pglite` が devDependencies に存在する
- `grep -E '"(next|react|zod)"' packages/db/package.json` が 0 件
- `packages/db/tsconfig.json` / `vitest.config.ts` / `eslint.config.js` が存在する

## T-02: Drizzle スキーマ定義（customers テーブル）

- [x] `packages/db/src/schema/customer.ts` を作成する
- [x] `drizzle-orm/pg-core` から `pgTable` / `text` / `jsonb` を import する
- [x] `customers` テーブルを定義する: `id`(text, PK) / `name`(text, NOT NULL) / `phone`(text, nullable) / `email`(text, nullable) / `tags`(jsonb, NOT NULL) / `notes`(text, NOT NULL) / `custom_fields`(jsonb, NOT NULL)
- [x] テーブル定義を export する（`DrizzleCustomerRepository` 及びテストから参照するため）

**Acceptance Criteria**:
- `customers` テーブルが `pgTable` で定義されている
- 全カラムの型・nullable が Customer 型のフィールドと対応している
- `tags` / `custom_fields` が jsonb 型である

## T-03: DB ハンドル生成ヘルパ（client.ts）

- [x] `packages/db/src/client.ts` を作成する
- [x] pglite インスタンスを受け取り Drizzle DB ハンドルを返す `createDrizzleClient` 関数を export する
- [x] `drizzle-orm/pglite` の `drizzle` ラッパーを使用する（pglite 用の Drizzle アダプタ）

**Acceptance Criteria**:
- `createDrizzleClient` が pglite インスタンスを引数に取り、Drizzle DB ハンドルを返す
- 返された DB ハンドルが `DrizzleCustomerRepository` で使用可能な型である

## T-04: DrizzleCustomerRepository の実装

- [x] `packages/db/src/drizzle-customer-repository.ts` を作成する
- [x] `createDrizzleCustomerRepository(db)` ファクトリ関数を実装する。引数は Drizzle DB ハンドル
- [x] **save**: `Customer` → DB 行へマッピングし、`onConflictDoUpdate`（id ターゲット）で upsert する。`tags` は `string[]` として、`customFields` は JSON オブジェクトとして jsonb に格納する
- [x] **findById**: `where(eq(customers.id, id))` で 1 行取得。行なしなら `null` を返す。行ありなら行 → Customer の再構成を行う
- [x] **list**: 全行取得し、各行を Customer に再構成する
- [x] **行 → Customer の再構成**: `createContactInfo({ phone: row.phone, email: row.email })` → `createCustomer({ id: parseId(row.id), name: row.name, contact, tags: row.tags, notes: row.notes, customFields: row.custom_fields })` の順で呼ぶ（集約ファクトリ経由の anti-corruption）
- [x] `@koma/crm` から `CustomerRepository` 型 / `createContactInfo` / `createCustomer` を import する
- [x] `@koma/shared` から `parseId` / `Id` を import する
- [x] 返り値の型が `CustomerRepository` を満たすことを確認する（型アノテーションまたは `satisfies`）

**Acceptance Criteria**:
- `DrizzleCustomerRepository` が `CustomerRepository` 型を満たす（`pnpm -F @koma/db run check-types` が成功）
- `save` が upsert（同一 id で insert or update）を行う
- 行 → Customer の再構成が `createContactInfo` + `createCustomer` 経由である
- `findById` が行なしの場合 `null` を返す

## T-05: 公開 API（index.ts）

- [x] `packages/db/src/index.ts` を作成する
- [x] `createDrizzleCustomerRepository` を re-export する
- [x] `createDrizzleClient` を re-export する
- [x] 必要に応じてスキーマ定義（`customers` テーブル）を re-export する（テストセットアップやマイグレーションで外部から参照する可能性があるため）

**Acceptance Criteria**:
- `@koma/db` から `createDrizzleCustomerRepository` / `createDrizzleClient` が import 可能
- `pnpm -F @koma/db run check-types` が成功

## T-06: pglite 契約テスト

- [x] `packages/db/src/drizzle-customer-repository.test.ts` を作成する
- [x] テストセットアップ: `beforeEach` で pglite インスタンスを新規作成し、`sql` ヘルパ（Drizzle の `sql` テンプレートリテラル、または pglite の `exec`）で `customers` テーブルの CREATE TABLE を発行する（毎テスト fresh な状態で実行する＝`in-memory-customer-repository.test.ts` と同じ隔離パターン）
- [x] テスト終了時のクリーンアップ: `afterEach` で pglite インスタンスを close する
- [x] **テスト 1: save → findById で同値取得** — Customer を save し、findById で取得した Customer の全フィールド（id / name / contact.phone / contact.email / tags / notes / customFields）が元と一致することを検証する
- [x] **テスト 2: 未保存 id は null** — 存在しない id で findById を呼び、`null` が返ることを検証する
- [x] **テスト 3: list が保存分を返す** — 複数の Customer を save し、list の結果に全件含まれることを検証する
- [x] **テスト 4: 同一 id 再 save で更新（upsert）** — Customer を save した後、同一 id で name 等を変更して再 save し、findById で更新後の値が取得できること、かつ list の件数が 1 件のままであること（`toHaveLength(1)`）を検証する
- [x] **テスト 5: 行 → Customer が集約不変条件を満たす** — phone と email の両方を持つ Customer、phone のみの Customer、email のみの Customer を save → findById し、再構成された Customer の contact が不変条件（≥1 連絡先）を満たすことを検証する

**Acceptance Criteria**:
- `pnpm -F @koma/db run test` が green
- save → findById で同値取得のテストが存在する
- 未保存 id → null のテストが存在する
- list が保存分を返すテストが存在する
- upsert テストが存在する
- 集約不変条件（ContactInfo ≥1）の再構成テストが存在する

## T-07: model.md footnote ⁴ の更新

- [x] `docs/アーキテクチャ/model.md` §3 の footnote ⁴ を更新する
- [x] 現在: 「db → domain は **port interface / 型のみ**参照可（Repository port を実装するため）。domain の実装・ユースケースは import しない。」
- [x] 更新後: db → domain は **port interface / 型 / 集約ファクトリ（anti-corruption 用の行 → 集約再構成）**を参照可とする。domain のユースケース・ビジネスロジックは import しない。
- [x] 同ファイル §4 の B-2 説明、または §3 の依存グラフ注記にも、必要に応じて整合的な記述を追加する

**Acceptance Criteria**:
- model.md footnote ⁴ が「集約ファクトリ（anti-corruption 用）」を許容する記述に更新されている
- 更新内容が model.md の他のセクション（B-2 等）と矛盾しない

## T-08: 全体検証

- [x] `pnpm -F @koma/db run check-types` が成功する
- [x] `pnpm -F @koma/db run test` が成功する
- [x] `pnpm -F @koma/db run lint` が成功する
- [x] `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green（既存パッケージへの影響なし）

**Acceptance Criteria**:
- 上記 4 コマンドがすべて成功する
- 既存パッケージ（`@koma/crm` / `@koma/shared` 等）のテスト・型チェックに影響がない
