# Tasks: web-persistence

## T-01: DrizzleClient 型を PgDatabase 基底に一般化

- [x] `packages/db/src/client.ts` の `DrizzleClient` 型を `PgDatabase<any>` に変更する。import は `import { type PgDatabase } from 'drizzle-orm/pg-core'`
- [x] `export type DrizzleClient = PgDatabase<any>;` とする
- [x] `createDrizzleClient(pglite)` 関数はそのまま残す。返り値は `PgliteDatabase extends PgDatabase` なので `DrizzleClient` に代入可能
- [x] 各 repo（`drizzle-customer-repository.ts`, `drizzle-resource-repository.ts`, `drizzle-service-repository.ts`, `drizzle-booking-repository.ts`）の `import { type DrizzleClient }` はパスが変わらないため変更不要。ただし型チェックを通すこと

**Acceptance Criteria**:
- `pnpm -F db run check-types` が green
- `pnpm -F db run test` が green（既存テスト 4 ファイルがすべてパス）
- `DrizzleClient` が `import { type PgDatabase } from 'drizzle-orm/pg-core'` 由来の型である

## T-02: ensureSchema 関数を追加

- [x] `packages/db/src/ensure-schema.ts` を新規作成
- [x] `export async function ensureSchema(db: DrizzleClient): Promise<void>` を定義
- [x] `import { sql } from 'drizzle-orm'` の `sql` テンプレートタグと `db.execute()` で `CREATE TABLE IF NOT EXISTS` を 4 テーブル分（customers, resources, services, bookings）逐次実行する
- [x] DDL は既存テストの以下を正典とする:
  - `customers`: `id TEXT PK, name TEXT NOT NULL, phone TEXT, email TEXT, tags JSONB NOT NULL DEFAULT '[]'::jsonb, notes TEXT NOT NULL DEFAULT ''::text, custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb`
  - `resources`: `id TEXT PK, name TEXT NOT NULL, kind TEXT NOT NULL, capacity INTEGER NOT NULL`
  - `services`: `id TEXT PK, name TEXT NOT NULL, duration_ms INTEGER NOT NULL, price_amount INTEGER NOT NULL, price_currency TEXT NOT NULL, resource_kinds JSONB NOT NULL DEFAULT '[]'::jsonb`
  - `bookings`: `id TEXT PK, customer_id TEXT NOT NULL, service_id TEXT NOT NULL, resource_id TEXT NOT NULL, start_millis BIGINT NOT NULL, end_millis BIGINT NOT NULL, status TEXT NOT NULL, custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb`
- [x] 関数に「DDL は schema/*.ts と同期を保つこと。drizzle-kit 導入後に廃止予定」のコメントを残す
- [x] `packages/db/src/index.ts` に `export { ensureSchema } from './ensure-schema.js'` を追加

**Acceptance Criteria**:
- `pnpm -F db run check-types` が green
- `ensureSchema` が `@koma/db` から import 可能

## T-03: ensureSchema のテストを追加

- [x] `packages/db/src/ensure-schema.test.ts` を新規作成
- [x] テスト 1: 空 pglite に対して `ensureSchema(db)` を実行すると 4 テーブル（customers, resources, services, bookings）が存在すること。`db.execute(sql\`SELECT tablename FROM pg_tables WHERE schemaname = 'public'\`)` 等で検証
- [x] テスト 2: `ensureSchema(db)` を 2 回実行してもエラーが発生しないこと（冪等）
- [x] テスト 3: `ensureSchema` 後に各 Drizzle repo が正常に動作すること（少なくとも 1 repo で save → findById を検証）

**Acceptance Criteria**:
- `pnpm -F db run test` が green（新規テスト含む）
- 冪等性テストが存在する

## T-04: createPostgresClient を追加

- [x] `packages/db/package.json` の `dependencies` に `"postgres": "^3.4.5"` を追加（バージョンは `pnpm add` で解決される最新を使用）
- [x] `pnpm install` を実行
- [x] `packages/db/src/postgres-client.ts` を新規作成
- [x] `import postgres from 'postgres'` と `import { drizzle } from 'drizzle-orm/postgres-js'` を使い、`export function createPostgresClient(connectionString: string): DrizzleClient` を定義。内部で `const client = postgres(connectionString)` → `return drizzle(client)` とする
- [x] `packages/db/src/index.ts` に `export { createPostgresClient } from './postgres-client.js'` を追加

**Acceptance Criteria**:
- `pnpm -F db run check-types` が green
- `createPostgresClient` が `@koma/db` から import 可能
- `postgres` が `@koma/db` の `dependencies` に存在する
- 返り値型が `DrizzleClient`（= `PgDatabase<any>`）に適合する（型チェックで確認）

## T-05: selectPersistenceMode 関数を追加（apps/web）

- [x] `apps/web/lib/persistence-mode.ts` を新規作成
- [x] `export function selectPersistenceMode(env: { DATABASE_URL?: string }): 'drizzle' | 'memory'` を定義。`env.DATABASE_URL` が truthy なら `'drizzle'`、それ以外は `'memory'`
- [x] `apps/web/lib/persistence-mode.test.ts` を新規作成
- [x] テスト 1: `{ DATABASE_URL: 'postgresql://...' }` → `'drizzle'`
- [x] テスト 2: `{}` → `'memory'`
- [x] テスト 3: `{ DATABASE_URL: '' }` → `'memory'`
- [x] テスト 4: `{ DATABASE_URL: undefined }` → `'memory'`

**Acceptance Criteria**:
- `pnpm -F web run check-types` が green
- `pnpm -F web run test` が green（新規テスト含む）
- `selectPersistenceMode` が純関数である（`process.env` を直接参照しない）

## T-06: apps/web に @koma/db 依存を追加し composition root を拡張

- [x] `apps/web/package.json` の `dependencies` に `"@koma/db": "workspace:*"` を追加
- [x] `pnpm install` を実行
- [x] `apps/web/lib/composition-root.ts` を以下のように拡張:
  - `selectPersistenceMode(process.env)` を呼び、結果を `globalThis` にキャッシュ
  - `'drizzle'` の場合: `@koma/db` から `createPostgresClient`, `ensureSchema`, 各 `createDrizzle*Repository` を import。`globalThis` に db client と repo をキャッシュ。初回 `get*Repository()` 呼び出し時に `createPostgresClient(process.env.DATABASE_URL!)` + `await ensureSchema(db)` を一度だけ実行し、Drizzle repo 群を生成
  - `'memory'` の場合: 現行の in-memory repo を返す（既存コードそのまま）
  - client 生成を遅延にするため、`get*Repository()` 内で初期化する（モジュールトップレベルで DB 接続しない）
  - `ensureSchema` は async なので、初回呼び出しの初期化が `Promise` を含む点に注意。初期化 Promise を `globalThis` にキャッシュし、後続呼び出しは await で待つ形にする
- [x] 既存の `get*Repository()` 関数のシグネチャが変わらないことを確認（呼び出し元の page / action は変更不要）。ただし `ensureSchema` が async のため、`get*Repository()` を `async` にする必要がある場合は、呼び出し元も `await` を追加する

**Acceptance Criteria**:
- `pnpm -F web run check-types` が green
- `apps/web/package.json` に `"@koma/db": "workspace:*"` がある
- `DATABASE_URL` 未設定で `pnpm -F web run build` が成功する（in-memory 経路、DB 接続なし）
- composition root の adapter 選択が `selectPersistenceMode` に閉じている

## T-07: 全体検証

- [x] `pnpm -r --if-present run check-types` が green
- [x] `pnpm -r --if-present run test` が green
- [x] `pnpm -r --if-present run build` が green
- [x] `DATABASE_URL` 未設定で上記 3 コマンドすべてが通ること

**Acceptance Criteria**:
- `pnpm -r --if-present run check-types && pnpm -r --if-present run test && pnpm -r --if-present run build` が exit code 0 で完了する
