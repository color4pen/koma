# Tasks: packages/catalog — Service 集約と ServiceRepository port

## T-01: packages/catalog パッケージの scaffold を作成する

- [x] `packages/catalog/package.json` を作成する。name `@koma/catalog`、`private: true`、`type: "module"`、exports `".": "./src/index.ts"`、scripts に `check-types` / `test` / `lint`、dependencies に `@koma/shared: "workspace:*"`、devDependencies に `@eslint/js` / `eslint` / `typescript` / `typescript-eslint` / `vitest`（バージョンは `packages/resource/package.json` に合わせる）
- [x] `packages/catalog/tsconfig.json` を作成する（`packages/resource/tsconfig.json` と同一内容）
- [x] `packages/catalog/eslint.config.js` を作成する（`packages/resource/eslint.config.js` と同一内容）
- [x] `packages/catalog/vitest.config.ts` を作成する（`packages/resource/vitest.config.ts` と同一内容）
- [x] `packages/catalog/src/index.ts` を空ファイルとして作成する（T-07 で re-export を追加）

**Acceptance Criteria**:
- `packages/catalog/package.json` の name が `@koma/catalog` である
- `grep -E '"(next|react|drizzle-orm|zod)"' packages/catalog/package.json` が 0 件
- dependencies に `@koma/shared: "workspace:*"` がある
- scripts に `check-types` / `test` / `lint` がある
- `pnpm install` がエラーなく完了する

## T-02: Service 集約を実装する（service.ts）

- [x] `packages/catalog/src/service.ts` を作成する
- [x] `Service` 型を定義する: `id: Id<'Service'>` / `name: string` / `duration: Duration` / `price: Money` / `resourceKinds: readonly string[]`。全フィールド `readonly`
- [x] `createService` ファクトリ関数を実装する。引数: `{ id?: Id<'Service'>; name: string; duration: Duration; price: Money; resourceKinds?: readonly string[] }`
  - `id` 省略時は `createId<'Service'>()` で自動生成
  - `resourceKinds` 省略時は空配列 `[]`
  - ガード: `duration.milliseconds <= 0` で throw（「duration must be positive」）
  - ガード: `price.amount < 0` で throw（「price must be non-negative」）
  - 返却値を `Object.freeze` する
- [x] `updateService` 関数を実装する。引数: `(service: Service, patch: Partial<Pick<Service, 'name' | 'duration' | 'price' | 'resourceKinds'>>)`。`createService` に委譲して全不変条件を再検証し、新インスタンスを返す

**Acceptance Criteria**:
- `Service` 型が 5 フィールド（id / name / duration / price / resourceKinds）を持つ
- `createService` / `updateService` が export されている
- `createService` は `duration.milliseconds <= 0` で throw する
- `createService` は `price.amount < 0` で throw する
- 返却値が `Object.freeze` されている
- `updateService` は id を保持したまま新インスタンスを返す

## T-03: Service のテストを作成する（service.test.ts）

- [x] `packages/catalog/src/service.test.ts` を作成する
- [x] `createService` のテスト:
  - 必須フィールド（name / duration / price）のみで構築できる
  - id 省略時に自動生成される
  - resourceKinds 省略時に空配列が設定される
  - duration が正のとき構築に成功する
  - duration が 0（`ofMinutes(0)`）で throw する
  - price が非負のとき構築に成功する（0 円含む）
  - price が負（`createMoney(-100, 'JPY')`）で throw する
  - 返却値が frozen である
- [x] `updateService` のテスト:
  - 新しい Service を返し、元は変更されない（immutability）
  - id を保持する
  - duration / price を不正値に更新しようとすると throw する

**Acceptance Criteria**:
- duration 正の不変条件（0 / 正）がテストで固定されている
- price 非負の不変条件がテストで固定されている
- immutable 更新がテストで固定されている（元インスタンス不変 + 参照が異なる + id 一致）
- 全テストが `vitest run` で pass する

## T-04: ServiceRepository port interface を定義する

- [x] `packages/catalog/src/port/service-repository.ts` を作成する
- [x] `ServiceRepository` 型を定義する: `save(service: Service): Promise<void>` / `findById(id: Id<'Service'>): Promise<Service | null>` / `list(): Promise<Service[]>`
- [x] `@koma/shared` から `Id` を、`../service.js` から `Service` を import する

**Acceptance Criteria**:
- `ServiceRepository` が `save` / `findById` / `list` の 3 メソッドを持つ
- 全メソッドが async（Promise 返却）
- findById の戻り値が `Service | null`

## T-05: InMemoryServiceRepository を実装する

- [x] `packages/catalog/src/in-memory-service-repository.ts` を作成する
- [x] `createInMemoryServiceRepository` ファクトリ関数を実装する
- [x] 内部ストアは `Map<string, Service>`
- [x] `save`: `store.set(service.id, service)` → `Promise.resolve()`
- [x] `findById`: `store.get(id) ?? null` → `Promise.resolve()`
- [x] `list`: `[...store.values()]` → `Promise.resolve()`

**Acceptance Criteria**:
- `ServiceRepository` interface を満たす
- save は upsert セマンティクス（同一 id で上書き）
- `packages/resource/src/in-memory-resource-repository.ts` と同構造

## T-06: InMemoryServiceRepository のテストを作成する

- [x] `packages/catalog/src/in-memory-service-repository.test.ts` を作成する
- [x] テストケース:
  - save した Service を findById で取得できる
  - 未保存の id で findById すると null が返る
  - save → list で保存分が全て返る
  - 空の状態で list が空配列を返す
  - 同一 id で save を 2 回呼ぶと上書き（upsert）される
  - 複数の Service を save し、list が全件返す

**Acceptance Criteria**:
- Repository 契約（save / findById / list）がテストで固定されている
- 全テストが `vitest run` で pass する

## T-07: src/index.ts に barrel export を追加する

- [x] `packages/catalog/src/index.ts` に re-export を追加する:
  - `export type { Service } from './service.js'`
  - `export { createService, updateService } from './service.js'`
  - `export type { ServiceRepository } from './port/service-repository.js'`
  - `export { createInMemoryServiceRepository } from './in-memory-service-repository.js'`

**Acceptance Criteria**:
- `Service` / `ServiceRepository`（type export）と `createService` / `updateService` / `createInMemoryServiceRepository`（value export）が `@koma/catalog` から import 可能
- `packages/resource/src/index.ts` と同じ export パターン

## T-08: workspace 全体のビルド・テスト検証

- [x] `pnpm install` を実行して workspace に catalog を認識させる
- [x] `pnpm -F @koma/catalog run check-types` が成功する
- [x] `pnpm -F @koma/catalog run test` が成功する
- [x] `pnpm -F @koma/catalog run lint` が成功する
- [x] `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green

**Acceptance Criteria**:
- 上記全コマンドが exit code 0 で完了する
- 既存パッケージ（shared / resource / crm）のビルド・テストに影響がない
