# Spec: web-persistence

## Requirements

### Requirement: DrizzleClient SHALL be driver-independent

`DrizzleClient` 型は `drizzle-orm/pg-core` の `PgDatabase` 基底型で定義され、pglite / postgres-js いずれの drizzle インスタンスも受け付けなければならない（MUST）。既存の `createDrizzleClient(pglite)` は引き続き `DrizzleClient` に適合する値を返さなければならない（MUST）。

#### Scenario: pglite drizzle インスタンスが DrizzleClient 型に適合する

**Given** `@electric-sql/pglite` の PGlite インスタンスが存在する
**When** `createDrizzleClient(pglite)` を呼ぶ
**Then** 返り値は `DrizzleClient`（= `PgDatabase<any>`）型に代入可能である

#### Scenario: 各 Drizzle repo が一般化型のまま pglite で動作する

**Given** pglite から生成した `DrizzleClient` インスタンスと、`ensureSchema` で 4 テーブルが作成済みのデータベース
**When** `createDrizzleCustomerRepository(db)` 等で生成した repo に対して `save` → `findById` を実行する
**Then** 保存したエンティティが正しく復元される（既存テストが green）

---

### Requirement: createPostgresClient SHALL create a production-ready Drizzle client

`@koma/db` は `createPostgresClient(connectionString: string)` を export しなければならない（MUST）。返り値は `DrizzleClient` 型に適合しなければならない（MUST）。`postgres`（postgres-js）パッケージが `@koma/db` の `dependencies` に含まれなければならない（MUST）。

#### Scenario: createPostgresClient が DrizzleClient 型を返す

**Given** 有効な PostgreSQL 接続文字列
**When** `createPostgresClient(connectionString)` を呼ぶ
**Then** 返り値は `DrizzleClient` 型に適合する（型チェック通過）

---

### Requirement: ensureSchema SHALL idempotently create all 4 tables

`ensureSchema(db: DrizzleClient)` は customers / resources / services / bookings の 4 テーブルを `CREATE TABLE IF NOT EXISTS` で作成しなければならない（MUST）。2 回以上実行してもエラーにならない（冪等）ことを保証しなければならない（MUST）。

#### Scenario: 空のデータベースに対して 4 テーブルが作成される

**Given** テーブルが存在しない pglite データベースと、そこから生成した `DrizzleClient`
**When** `ensureSchema(db)` を実行する
**Then** customers, resources, services, bookings の 4 テーブルが存在する

#### Scenario: 2 回実行してもエラーにならない（冪等）

**Given** `ensureSchema(db)` を 1 回実行済みのデータベース
**When** `ensureSchema(db)` を再度実行する
**Then** エラーが発生しない

#### Scenario: ensureSchema 後に Drizzle repo が正常に動作する

**Given** `ensureSchema(db)` で 4 テーブルが作成された pglite データベース
**When** 各 Drizzle repo で `save` → `findById` を実行する
**Then** 保存したエンティティが正しく復元される

---

### Requirement: selectPersistenceMode SHALL return mode based on DATABASE_URL

`selectPersistenceMode(env: { DATABASE_URL?: string })` は純関数であり、`DATABASE_URL` が truthy なら `'drizzle'`、falsy なら `'memory'` を返さなければならない（MUST）。

#### Scenario: DATABASE_URL が設定されている場合

**Given** `{ DATABASE_URL: 'postgresql://localhost:5432/koma' }`
**When** `selectPersistenceMode(env)` を呼ぶ
**Then** `'drizzle'` が返る

#### Scenario: DATABASE_URL が未設定の場合

**Given** `{}`（DATABASE_URL なし）
**When** `selectPersistenceMode(env)` を呼ぶ
**Then** `'memory'` が返る

#### Scenario: DATABASE_URL が空文字の場合

**Given** `{ DATABASE_URL: '' }`
**When** `selectPersistenceMode(env)` を呼ぶ
**Then** `'memory'` が返る

---

### Requirement: apps/web SHALL build without DATABASE_URL

`DATABASE_URL` 環境変数が未設定の状態で `pnpm -F web run build` が成功しなければならない（MUST）。build 時に DB 接続が発生してはならない（MUST NOT）。

#### Scenario: DATABASE_URL 無しで next build が成功する

**Given** `DATABASE_URL` 環境変数が未設定
**When** `pnpm -F web run build` を実行する
**Then** ビルドが成功する（exit code 0）

---

### Requirement: composition root SHALL use Drizzle repos when DATABASE_URL is set

`DATABASE_URL` が設定されている場合、composition root は `createPostgresClient` + `ensureSchema` を一度だけ実行し、Drizzle repo 群を返さなければならない（MUST）。client 生成は遅延（`get*Repository()` 初回呼び出し時）でなければならない（MUST）。`globalThis` による単一生成を維持しなければならない（MUST）。

#### Scenario: DATABASE_URL 設定時に Drizzle repo が返る

**Given** `DATABASE_URL` が設定されている環境
**When** `getCustomerRepository()` を初回呼び出しする
**Then** Drizzle 実装の CustomerRepository が返る（`createPostgresClient` + `ensureSchema` が 1 回実行される）

#### Scenario: DATABASE_URL 未設定時に in-memory repo が返る

**Given** `DATABASE_URL` が未設定の環境
**When** `getCustomerRepository()` を呼ぶ
**Then** in-memory 実装の CustomerRepository が返る（DB 接続は発生しない）
