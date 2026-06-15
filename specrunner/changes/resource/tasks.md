# Tasks: packages/resource

## T-01: パッケージスキャフォールド

- [ ] `packages/resource/package.json` を作成する。`@koma/crm` の `package.json` をベースに以下を変更:
  - `name`: `@koma/resource`
  - `dependencies`: `@koma/shared: "workspace:*"` のみ
  - `devDependencies`: `@koma/crm` と同一（`@eslint/js`, `eslint`, `typescript`, `typescript-eslint`, `vitest`、同バージョン）
  - `scripts`: `check-types`, `test`, `lint`（crm と同一）
  - `private: true`, `type: "module"`, `exports: { ".": "./src/index.ts" }`
- [ ] `packages/resource/tsconfig.json` を作成する（crm と同一内容）
- [ ] `packages/resource/vitest.config.ts` を作成する（crm と同一内容）
- [ ] `packages/resource/eslint.config.js` を作成する（crm と同一内容）
- [ ] `packages/resource/src/index.ts` を空のバレルファイルとして作成する
- [ ] `pnpm install` を実行してワークスペースリンクを確立する

**Acceptance Criteria**:
- `packages/resource/package.json` の `name` が `@koma/resource`
- `grep -E '"(next|react|drizzle-orm|zod)"' packages/resource/package.json` が 0 件
- `@koma/shared` に `workspace:*` で依存している
- `pnpm -F @koma/resource run check-types` が成功する

## T-02: Resource 集約（`src/resource.ts`）

- [ ] `Resource` 型を定義する: `id: Id<'Resource'>`, `name: string`, `kind: string`, `capacity: number`（全フィールド `readonly`）
- [ ] `createResource` ファクトリ関数を実装する:
  - 引数: `{ id?: Id<'Resource'>; name: string; kind: string; capacity?: number }`
  - `id` 省略時は `createId<'Resource'>()` で自動生成
  - `capacity` 省略時は既定値 `1`
  - `capacity` が 1 以上の整数でない場合（`!Number.isInteger(capacity) || capacity < 1`）に `throw Error`
  - 返却オブジェクトを `Object.freeze` する
- [ ] `updateResource` 関数を実装する:
  - 引数: `(resource: Resource, patch: Partial<Pick<Resource, 'name' | 'kind' | 'capacity'>>)`
  - 内部で `createResource` を呼び出し、新インスタンスを返す（不変条件の再検証を保証）
- [ ] `src/index.ts` から `Resource` 型と `createResource`, `updateResource` を export する

**Acceptance Criteria**:
- `capacity` 省略時に `1` が設定される
- `capacity` が 0 / 負 / 小数で `throw` する
- `createResource` の返却値が `Object.isFrozen === true`
- `updateResource` が新インスタンスを返し、元を破壊しない

## T-03: Resource 集約のテスト（`src/resource.test.ts`）

- [ ] `createResource` のテストを記述する:
  - 必須フィールド（`name`, `kind`）のみで構築できる
  - `id` 省略時に自動生成される
  - `capacity` 省略時に既定値 `1` が設定される
  - `capacity` に正整数を指定して構築できる
  - `capacity: 0` で throw
  - `capacity: -1` で throw
  - `capacity: 1.5` で throw
  - 返却値が frozen である
- [ ] `updateResource` のテストを記述する:
  - 新しい `Resource` を返し、元は変更されない
  - `id` を保持する
  - `capacity` を不正値に更新しようとすると throw

**Acceptance Criteria**:
- `pnpm -F @koma/resource run test` で resource.test.ts の全テストが green

## T-04: ResourceRepository port（`src/port/resource-repository.ts`）

- [ ] `ResourceRepository` 型（interface）を定義する:
  - `save(resource: Resource): Promise<void>`
  - `findById(id: Id<'Resource'>): Promise<Resource | null>`
  - `list(): Promise<Resource[]>`
- [ ] `src/index.ts` から `ResourceRepository` 型を export する

**Acceptance Criteria**:
- `ResourceRepository` が `save` / `findById` / `list` の 3 メソッドを持つ
- `pnpm -F @koma/resource run check-types` が成功する

## T-05: in-memory ResourceRepository 実装（`src/in-memory-resource-repository.ts`）

- [ ] `createInMemoryResourceRepository` ファクトリ関数を実装する:
  - 内部に `Map<string, Resource>` を保持
  - `save`: `store.set(resource.id, resource)` → `Promise.resolve()`
  - `findById`: `store.get(id) ?? null` → `Promise.resolve()`
  - `list`: `[...store.values()]` → `Promise.resolve()`
- [ ] `src/index.ts` から `createInMemoryResourceRepository` を export する

**Acceptance Criteria**:
- `createInMemoryResourceRepository()` が `ResourceRepository` 型を満たす
- `pnpm -F @koma/resource run check-types` が成功する

## T-06: in-memory ResourceRepository のテスト（`src/in-memory-resource-repository.test.ts`）

- [ ] テストを記述する:
  - `save` した `Resource` を `findById` で取得できる
  - 未保存の id で `findById` すると `null` が返る
  - `save` → `list` で保存分が全て返る
  - 空の状態で `list` が空配列を返る
  - 同一 id で `save` を 2 回呼ぶと上書き（upsert）される
  - 複数の `Resource` を `save` し、`list` が全件返す

**Acceptance Criteria**:
- `pnpm -F @koma/resource run test` で in-memory-resource-repository.test.ts の全テストが green

## T-07: 全体検証

- [ ] `pnpm -F @koma/resource run check-types` が成功する
- [ ] `pnpm -F @koma/resource run test` が成功する
- [ ] `pnpm -F @koma/resource run lint` が成功する
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green（他パッケージへの影響がない）

**Acceptance Criteria**:
- 上記 4 コマンドすべてが exit code 0
