# Tasks: DrizzleResourceRepository / DrizzleServiceRepository

## T-01: packages/db に @koma/resource と @koma/catalog の依存を追加する

- [ ] `packages/db/package.json` の `dependencies` に `"@koma/resource": "workspace:*"` を追加する
- [ ] `packages/db/package.json` の `dependencies` に `"@koma/catalog": "workspace:*"` を追加する
- [ ] `pnpm install` を実行して lockfile を更新する

**Acceptance Criteria**:
- `packages/db/package.json` の dependencies に `@koma/resource` と `@koma/catalog` が `workspace:*` で含まれる
- `grep -E '"(next|react|zod)"' packages/db/package.json` が 0 件
- `pnpm -F @koma/db run check-types` がエラーなく完了する

## T-02: Resource 用の Drizzle schema を定義する

- [ ] `packages/db/src/schema/resource.ts` を作成する
- [ ] `pgTable('resources', ...)` で以下のカラムを定義する:
  - `id`: `text('id').primaryKey()`
  - `name`: `text('name').notNull()`
  - `kind`: `text('kind').notNull()`
  - `capacity`: `integer('capacity').notNull()`
- [ ] `ResourceRow` 型（`typeof resources.$inferSelect`）を export する

**Acceptance Criteria**:
- `packages/db/src/schema/resource.ts` が存在し、`resources` テーブルと `ResourceRow` 型を export する
- `pnpm -F @koma/db run check-types` が成功する

## T-03: Service 用の Drizzle schema を定義する

- [ ] `packages/db/src/schema/service.ts` を作成する
- [ ] `pgTable('services', ...)` で以下のカラムを定義する:
  - `id`: `text('id').primaryKey()`
  - `name`: `text('name').notNull()`
  - `duration_ms`: `integer('duration_ms').notNull()`
  - `price_amount`: `integer('price_amount').notNull()`
  - `price_currency`: `text('price_currency').notNull()`
  - `resource_kinds`: `jsonb('resource_kinds').notNull()`
- [ ] `ServiceRow` 型（`typeof services.$inferSelect`）を export する

**Acceptance Criteria**:
- `packages/db/src/schema/service.ts` が存在し、`services` テーブルと `ServiceRow` 型を export する
- `pnpm -F @koma/db run check-types` が成功する

## T-04: DrizzleResourceRepository を実装する

- [ ] `packages/db/src/drizzle-resource-repository.ts` を作成する
- [ ] `rowToResource` 関数を実装する: `resources.$inferSelect` の行を受け取り、`parseId` で id をパースし、`createResource({ id, name, kind, capacity })` で `Resource` を再構成する
- [ ] `createDrizzleResourceRepository(db: DrizzleClient): ResourceRepository` ファクトリ関数を実装する:
  - `save`: `db.insert(resources).values(...).onConflictDoUpdate({ target: resources.id, set: { name, kind, capacity } })` で upsert
  - `findById`: `db.select().from(resources).where(eq(resources.id, id))` で取得し、結果を `rowToResource` で再構成。なければ `null`
  - `list`: `db.select().from(resources)` で全件取得し、`rows.map(rowToResource)` で再構成
- [ ] import: `eq` from `drizzle-orm`、`type ResourceRepository` / `type Resource` / `createResource` from `@koma/resource`、`parseId` from `@koma/shared`、`resources` from `./schema/resource.js`、`type DrizzleClient` from `./client.js`

**Acceptance Criteria**:
- `createDrizzleResourceRepository` が `ResourceRepository` 型を返す（型チェック通過）
- `pnpm -F @koma/db run check-types` が成功する

## T-05: DrizzleServiceRepository を実装する

- [ ] `packages/db/src/drizzle-service-repository.ts` を作成する
- [ ] `rowToService` 関数を実装する: `services.$inferSelect` の行を受け取り、`parseId` で id をパースし、`ofMilliseconds(row.duration_ms)` で Duration を、`createMoney(row.price_amount, row.price_currency as Currency)` で Money を再構成し、`createService({ id, name, duration, price, resourceKinds: row.resource_kinds as string[] })` で `Service` を再構成する
- [ ] `createDrizzleServiceRepository(db: DrizzleClient): ServiceRepository` ファクトリ関数を実装する:
  - `save`: `db.insert(services).values({ id, name, duration_ms: service.duration.milliseconds, price_amount: service.price.amount, price_currency: service.price.currency, resource_kinds: [...service.resourceKinds] }).onConflictDoUpdate(...)` で upsert
  - `findById`: `db.select().from(services).where(eq(services.id, id))` で取得し、`rowToService` で再構成。なければ `null`
  - `list`: `db.select().from(services)` で全件取得し、`rows.map(rowToService)` で再構成
- [ ] import: `eq` from `drizzle-orm`、`type ServiceRepository` / `type Service` / `createService` from `@koma/catalog`、`parseId` / `ofMilliseconds` / `createMoney` / `type Currency` from `@koma/shared`、`services` from `./schema/service.js`、`type DrizzleClient` from `./client.js`

**Acceptance Criteria**:
- `createDrizzleServiceRepository` が `ServiceRepository` 型を返す（型チェック通過）
- `pnpm -F @koma/db run check-types` が成功する

## T-06: DrizzleResourceRepository の pglite 契約テストを作成する

- [ ] `packages/db/src/drizzle-resource-repository.test.ts` を作成する
- [ ] テスト先頭に `CREATE_RESOURCES_TABLE` SQL 文字列を定義する:
  ```sql
  CREATE TABLE IF NOT EXISTS resources (
    id       TEXT PRIMARY KEY,
    name     TEXT NOT NULL,
    kind     TEXT NOT NULL,
    capacity INTEGER NOT NULL
  )
  ```
- [ ] `beforeEach` で `new PGlite()` → `exec(CREATE_RESOURCES_TABLE)` → `createDrizzleClient(pglite)` の隔離パターンを実装する
- [ ] `afterEach` で `pglite.close()` を実装する
- [ ] テストケース:
  1. `save` した Resource を `findById` で全フィールド一致で取得できる（`capacity` を非デフォルト値で検証）
  2. 未保存の id で `findById` すると `null` が返る
  3. 複数の Resource を `save` し、`list` が全件返す
  4. 同一 id で再 `save` すると既存データが更新される（upsert） — `findById` で更新後の値を検証し、`list` の件数が 1
  5. 行 → Resource の再構成が `capacity >= 1` の不変条件を `createResource` 経由で通すことを確認（`capacity: 5` 等の非デフォルト値で save → findById し capacity が保たれることを検証）

**Acceptance Criteria**:
- `pnpm -F @koma/db run test` で全テストが pass する
- `beforeEach` / `afterEach` の隔離パターンが db-customer テストと同一構造

## T-07: DrizzleServiceRepository の pglite 契約テストを作成する

- [ ] `packages/db/src/drizzle-service-repository.test.ts` を作成する
- [ ] テスト先頭に `CREATE_SERVICES_TABLE` SQL 文字列を定義する:
  ```sql
  CREATE TABLE IF NOT EXISTS services (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    duration_ms     INTEGER NOT NULL,
    price_amount    INTEGER NOT NULL,
    price_currency  TEXT NOT NULL,
    resource_kinds  JSONB NOT NULL DEFAULT '[]'::jsonb
  )
  ```
- [ ] `beforeEach` で `new PGlite()` → `exec(CREATE_SERVICES_TABLE)` → `createDrizzleClient(pglite)` の隔離パターンを実装する
- [ ] `afterEach` で `pglite.close()` を実装する
- [ ] テストケース:
  1. `save` した Service を `findById` で全フィールド一致で取得できる（`duration`, `price`, `resourceKinds` を含む）
  2. 未保存の id で `findById` すると `null` が返る
  3. 複数の Service を `save` し、`list` が全件返す
  4. 同一 id で再 `save` すると既存データが更新される（upsert）
  5. `duration` が往復で保たれる（`ofMilliseconds` 経由で再構成されていることを `duration.milliseconds` の一致で検証）
  6. `price` が往復で保たれる（`createMoney` 経由で再構成されていることを `amount` + `currency` の一致で検証）
  7. `resourceKinds` が往復で保たれる（非空配列 `['seat', 'stylist']` で検証）
  8. `resourceKinds` が空配列 `[]` の場合も往復する

**Acceptance Criteria**:
- `pnpm -F @koma/db run test` で全テストが pass する
- `beforeEach` / `afterEach` の隔離パターンが db-customer テストと同一構造
- duration / price / resourceKinds の往復が各テストで明示的に検証されている

## T-08: packages/db の index.ts に新しい export を追加する

- [ ] `packages/db/src/index.ts` に以下を追加する:
  - `export { createDrizzleResourceRepository } from './drizzle-resource-repository.js';`
  - `export { createDrizzleServiceRepository } from './drizzle-service-repository.js';`
  - `export { resources } from './schema/resource.js';`
  - `export { services } from './schema/service.js';`

**Acceptance Criteria**:
- `packages/db/src/index.ts` が `createDrizzleResourceRepository`, `createDrizzleServiceRepository`, `resources`, `services` を export している
- `pnpm -F @koma/db run check-types` が成功する

## T-09: 全体検証

- [ ] `pnpm -F @koma/db run check-types` が成功する
- [ ] `pnpm -F @koma/db run test` が成功する（customer / resource / service の全テスト pass）
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green

**Acceptance Criteria**:
- 上記 3 コマンドがすべてエラーなく完了する
- `grep -E '"(next|react|zod)"' packages/db/package.json` が 0 件
