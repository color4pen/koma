# Tasks: crm

## T-01: packages/crm パッケージ scaffold

- [ ] `packages/crm/` ディレクトリを作成する
- [ ] `packages/crm/package.json` を作成する:
  - `name`: `"@koma/crm"`
  - `private`: `true`
  - `type`: `"module"`
  - `exports`: `{ ".": "./src/index.ts" }`
  - `scripts`: `check-types`（`tsc --noEmit`）、`test`（`vitest run`）、`lint`（`eslint .`）
  - `dependencies`: `{ "@koma/shared": "workspace:*" }`
  - `devDependencies`: `typescript`, `vitest`, `eslint`, `@eslint/js`, `typescript-eslint`（バージョンは `@koma/shared` に合わせる）
  - `next` / `react` / `drizzle-orm` / `zod` を含めないこと
- [ ] `packages/crm/tsconfig.json` を作成する:
  - `target`: `"ES2022"`、`module`: `"ES2022"`
  - `moduleResolution`: `"bundler"`
  - `strict`: `true`、`noEmit`: `true`、`skipLibCheck`: `true`
  - `include`: `["src"]`
- [ ] `packages/crm/vitest.config.ts` を作成する（`include` は `src/**/*.test.ts`）
- [ ] `packages/crm/eslint.config.js` を作成する（`@eslint/js` + `typescript-eslint` の推奨構成、`@koma/shared` と同一）
- [ ] `packages/crm/src/index.ts` を空ファイルとして作成する（後続タスクで re-export を追加）
- [ ] `pnpm install` を実行して workspace にパッケージを認識させる

**Acceptance Criteria**:
- `pnpm -F @koma/crm run check-types` が成功する
- `pnpm -F @koma/crm run test` が成功する（テスト 0 件で pass）
- `pnpm -F @koma/crm run lint` が成功する
- `grep -E '"(next|react|drizzle-orm|zod)"' packages/crm/package.json` が 0 件
- `@koma/shared` が `dependencies` に `"workspace:*"` で存在する

## T-02: ContactInfo 値オブジェクト

- [ ] `packages/crm/src/contact-info.ts` を作成する:
  - `ContactInfo` 型エイリアス: `{ readonly phone: string | null; readonly email: string | null }`
  - `createContactInfo(params: { phone?: string | null; email?: string | null }): ContactInfo` ファクトリ関数:
    - `phone` と `email` が両方 null / undefined / 空文字の場合はエラーを投げる（「少なくとも 1 つ」不変条件）
    - 空文字は null として扱う（正規化）
    - `Object.freeze` して返す
- [ ] `packages/crm/src/contact-info.test.ts` を作成する:
  - 電話のみで構築できることを検証
  - メールのみで構築できることを検証
  - 電話 + メールの両方で構築できることを検証
  - 両方 null で構築するとエラーになることを検証
  - 両方 undefined で構築するとエラーになることを検証
  - 両方空文字で構築するとエラーになることを検証（空文字は null 扱い）
  - ContactInfo が frozen（プロパティ書き換え不可）であることを検証

**Acceptance Criteria**:
- `pnpm -F @koma/crm run test` で ContactInfo 関連テストが全て pass
- 「両方無い」ケースがエラーになることをテストで固定している
- ContactInfo が frozen であることをテストで固定している

## T-03: Customer 集約

- [ ] `packages/crm/src/customer.ts` を作成する:
  - `CustomFieldValue` 型エイリアス: `string | number | boolean`
  - `Customer` 型エイリアス:
    ```
    {
      readonly id: Id<'Customer'>;
      readonly name: string;
      readonly contact: ContactInfo;
      readonly tags: readonly string[];
      readonly notes: string;
      readonly customFields: Readonly<Record<string, CustomFieldValue>>;
    }
    ```
  - `createCustomer(params: { id?: Id<'Customer'>; name: string; contact: ContactInfo; tags?: readonly string[]; notes?: string; customFields?: Record<string, CustomFieldValue> }): Customer` ファクトリ関数:
    - `id` 省略時は `createId<'Customer'>()` で自動生成
    - `tags` / `notes` / `customFields` はデフォルト値（空配列 / 空文字 / 空オブジェクト）
    - `tags` は呼び出し元から渡された配列を必ず新しい配列にコピー（`[...(params.tags ?? [])]`）してから `Object.freeze` する。`customFields` も同様にスプレッドコピー（`{ ...(params.customFields ?? {}) }`）してから `Object.freeze` する。コピーを行わずに freeze すると呼び出し元が保持するオリジナルのオブジェクトも凍結される副作用が生じるため、必ずコピー後に freeze すること。Customer 全体も `Object.freeze` して返す
  - `updateCustomer(customer: Customer, patch: Partial<Pick<Customer, 'name' | 'contact' | 'tags' | 'notes' | 'customFields'>>): Customer` 更新関数:
    - 元の `customer` は変更しない
    - patch のフィールドを上書きした新しい `Customer` を `createCustomer` 経由（または同等の freeze 処理）で返す
    - `contact` が patch に含まれる場合、不変条件（少なくとも 1 つ）は ContactInfo 側の検証に委ねる（ContactInfo を直接受け取る）
- [ ] `packages/crm/src/customer.test.ts` を作成する:
  - 必須フィールド（name, contact）のみで構築できることを検証
  - id 省略時に自動生成されることを検証
  - tags / notes / customFields のデフォルト値を検証
  - customFields に string / number / boolean を設定・取得できることを検証
  - **immutable テスト**: `updateCustomer` が新しい Customer を返し、元の Customer が変更されていないことを検証
  - **immutable テスト**: `updateCustomer` で name を変更し、元の name が保持されていることを検証
  - **immutable テスト**: `updateCustomer` で tags を変更し、元の tags が保持されていることを検証
  - Customer が frozen（プロパティ書き換え不可）であることを検証
  - tags が frozen であることを検証（`push` 等が失敗する）

**Acceptance Criteria**:
- `pnpm -F @koma/crm run test` で Customer 関連テストが全て pass
- immutable 更新（元インスタンス不変）がテストで固定されている
- customFields が値の容れ物として機能することをテストで固定している
- Customer / tags が frozen であることをテストで固定している

## T-04: CustomerRepository port（interface）

- [ ] `packages/crm/src/port/` ディレクトリを作成する
- [ ] `packages/crm/src/port/customer-repository.ts` を作成する:
  - `CustomerRepository` 型エイリアス:
    ```
    {
      save(customer: Customer): Promise<void>;
      findById(id: Id<'Customer'>): Promise<Customer | null>;
      list(): Promise<Customer[]>;
    }
    ```
  - すべてのメソッドは `Promise<T>` を返す（後続の Drizzle アダプタが非同期のため、port を非同期シグネチャで定義することで adapter 実装時の破壊的変更を回避する）
  - `Customer` 型と `Id` 型を import する（`@koma/shared` から Id、同パッケージ内から Customer）

**Acceptance Criteria**:
- `pnpm -F @koma/crm run check-types` が pass
- `CustomerRepository` 型が `save` / `findById` / `list` の 3 メソッドを持ち、全メソッドが `Promise<T>` を返す

## T-05: in-memory CustomerRepository 実装

- [ ] `packages/crm/src/in-memory-customer-repository.ts` を作成する:
  - `createInMemoryCustomerRepository(): CustomerRepository` ファクトリ関数をエクスポート
  - 内部に `Map<string, Customer>` を保持するクロージャ
  - `save`: `customer.id` をキーに `Map.set`（upsert セマンティクス）後に `Promise.resolve()` を返す
  - `findById`: `Promise.resolve(map.get(id) ?? null)` を返す
  - `list`: `Promise.resolve([...map.values()])` を返す
  - すべてのメソッドは非同期 port 契約を `Promise.resolve()` でラップして満たす
- [ ] `packages/crm/src/in-memory-customer-repository.test.ts` を作成する:
  - `save` した Customer を `findById` で取得できることを検証（`await` を使用）
  - 未保存の id で `findById` すると `null` が返ることを検証（`await` を使用）
  - `save` → `list` で保存分が全て返ることを検証（`await` を使用）
  - 空の状態で `list` が空配列を返すことを検証（`await` を使用）
  - 同一 id で `save` を 2 回呼ぶと上書き（upsert）されることを検証（`await` を使用）
  - 複数の Customer を save し、`list` が全件返すことを検証（`await` を使用）

**Acceptance Criteria**:
- `pnpm -F @koma/crm run test` で in-memory 実装関連テストが全て pass
- save → findById の往復テストが存在する
- 未保存 id の null テストが存在する
- list の全件返却テストが存在する
- upsert セマンティクスのテストが存在する

## T-06: 公開 API re-export と最終 verification

- [ ] `packages/crm/src/index.ts` に以下の re-export を追加する:
  - `customer.ts` から: `type { Customer }`, `type { CustomFieldValue }`, `{ createCustomer }`, `{ updateCustomer }`
  - `contact-info.ts` から: `type { ContactInfo }`, `{ createContactInfo }`
  - `port/customer-repository.ts` から: `type { CustomerRepository }`
  - `in-memory-customer-repository.ts` から: `{ createInMemoryCustomerRepository }`
- [ ] `pnpm -F @koma/crm run check-types` が成功することを確認する
- [ ] `pnpm -F @koma/crm run test` が全テスト pass することを確認する
- [ ] `pnpm -F @koma/crm run lint` が成功することを確認する
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green であることを確認する（既存 `packages/shared` を含めた全体 verification）
- [ ] `grep -E '"(next|react|drizzle-orm|zod)"' packages/crm/package.json` が 0 件であることを確認する

**Acceptance Criteria**:
- 全受け入れ基準が green:
  - `@koma/crm` の check-types / test / lint が pass
  - 禁止依存が 0 件
  - `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green
- `src/index.ts` から `Customer`, `ContactInfo`, `CustomerRepository`, `createCustomer`, `updateCustomer`, `createContactInfo`, `createInMemoryCustomerRepository` が import 可能
