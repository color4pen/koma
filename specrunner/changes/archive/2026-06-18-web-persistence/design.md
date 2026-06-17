# Design: web-persistence

## Context

`packages/db` は Drizzle ORM で 4 つの Repository（Customer / Resource / Service / Booking）を実装済みだが、`createDrizzleClient` が `drizzle-orm/pglite` 専用で、`DrizzleClient` 型が `ReturnType<typeof createDrizzleClient>` = pglite 固定型になっている。各 Drizzle repo はこの固定型を `db` 引数で受ける。

`apps/web` の composition root は in-memory repo のみを生成し、`@koma/db` を依存に含んでいない。Drizzle repo を実行時に使う配線がない。

テストは外部 DB を持たず pglite で実施する。`next build` は `DATABASE_URL` 無しで通る必要がある。

drizzle-orm の型階層: `PgliteDatabase extends PgDatabase<PgliteQueryResultHKT>`, `PostgresJsDatabase extends PgDatabase<PostgresJsQueryResultHKT>`。両者は `PgDatabase` を共通基底にもつ。`PgDatabase` は `insert`, `select`, `execute` 等の Query API をすべて公開する。

既存テスト（4 repo × 各 `.test.ts`）は `let db: DrizzleClient` でインスタンスを保持し、`beforeEach` 内で `createDrizzleClient(pglite)` で生成、手書き `CREATE TABLE IF NOT EXISTS` SQL で DDL を実行している。

## Goals / Non-Goals

**Goals**:

1. `DrizzleClient` を `PgDatabase` 基底型に一般化し、全 Drizzle repo を driver 非依存にする
2. 本番 PostgreSQL client（`postgres` + `drizzle-orm/postgres-js`）を `@koma/db` に追加する
3. 4 テーブルの冪等 DDL を行う `ensureSchema(db)` を `@koma/db` に追加する
4. `apps/web` の composition root を env 駆動（`DATABASE_URL`）で Drizzle / in-memory を切り替え可能にする
5. 上記すべてについてテストで固定する

**Non-Goals**:

- drizzle-kit によるマイグレーション運用
- 接続プールのチューニング・リトライ
- 本番 PostgreSQL に対する結合テスト
- 認証・検索・ページネーション

## Decisions

### D1: `DrizzleClient` を `PgDatabase<any>` に一般化

`packages/db/src/client.ts` の `DrizzleClient` 型を `import { PgDatabase } from 'drizzle-orm/pg-core'` 由来の `PgDatabase<any>` に変更する。

各 repo の `db: DrizzleClient` 引数はそのまま動く。`PgDatabase` は `insert`, `select`, `execute` 等の Query Builder API を公開するクラスであり、`PgliteDatabase` も `PostgresJsDatabase` も継承するため、1 つの repo 実装で両 driver に対応する。

既存の `createDrizzleClient(pglite)` 関数は残す（返り値は `PgliteDatabase` → `PgDatabase` の subtype なので `DrizzleClient` に代入可能）。

**Rationale**: repo を driver ごとに二重実装するのは重複と乖離を招く。`PgDatabase` 基底への一般化が最小変更で両対応を実現する。

**Alternatives considered**: pglite 型に固定したまま本番用 repo を別途実装 → 却下（重複・乖離）。

### D2: `createPostgresClient(connectionString)` を追加

`packages/db/src/postgres-client.ts` に新設。`postgres`（postgres-js）ライブラリで接続を作り、`drizzle-orm/postgres-js` の `drizzle()` でラップして返す。返り値型は `DrizzleClient`（= `PgDatabase<any>`）に適合する。

`postgres` を `@koma/db` の `dependencies` に追加する。

**Rationale**: postgres-js は drizzle-orm 公式対応 driver であり、`PostgresJsDatabase extends PgDatabase` のため D1 と整合する。

**Alternatives considered**: `pg`（node-postgres）→ postgres-js の方がシンプル（追加設定不要、ESM ネイティブ）。

### D3: `ensureSchema(db)` — 冪等 DDL で 4 テーブルを作成

`packages/db/src/ensure-schema.ts` に新設。`PgDatabase.execute()` + drizzle-orm の `sql` テンプレートタグで `CREATE TABLE IF NOT EXISTS` を 4 テーブル分逐次実行する。

DDL 文は既存テスト（各 `.test.ts`）の `CREATE TABLE IF NOT EXISTS` 文を正典とし、`ensureSchema` に集約する。既存テストの `beforeEach` はこの関数の呼び出しに置き換えてもよい（任意: 既存テストの動作を壊さないことが優先）。

`IF NOT EXISTS` により何度実行しても失敗しない（冪等）。

**Rationale**: drizzle-kit マイグレーション運用は本 request のスコープ外。冪等 DDL は demo / 起動時 bootstrap に適切。DDL と `schema/*.ts` のカラム定義が乖離するリスクは認識しており、後続で drizzle-kit 導入時に `ensureSchema` を廃止する旨のコメントを残す。

**Alternatives considered**: drizzle-kit のマイグレーション → スコープ外。drizzle-orm の `migrate()` API → drizzle-kit 依存が必要で同様。

### D4: env 駆動 adapter 選択 — composition root に閉じる

`apps/web/lib/persistence-mode.ts` に `selectPersistenceMode(env: { DATABASE_URL?: string }): 'drizzle' | 'memory'` を純関数として追加。`DATABASE_URL` が truthy なら `'drizzle'`、それ以外は `'memory'`。

`apps/web/lib/composition-root.ts` を拡張:
- `selectPersistenceMode(process.env)` の結果で分岐
- `'drizzle'`: `createPostgresClient(DATABASE_URL!)` + `ensureSchema(db)` を一度だけ実行し、Drizzle repo 群を `globalThis` にキャッシュ
- `'memory'`: 現行の in-memory repo を返す（変更なし）
- client 生成は遅延（`get*Repository()` 初回呼び出し時）。モジュールロード時には DB 接続しない。これにより `DATABASE_URL` 無しの `next build` が DB 接続なしで通る。

`apps/web/package.json` に `"@koma/db": "workspace:*"` を追加。

**Rationale**: adapter 選択を composition root 1 箇所に閉じることで、port 型に依存する page / action / use-case は無変更。ヘキサゴナルの payoff（差し替えが 1 箇所）を実現する。model.md §2「配信 = composition root」および §3 の `delivery(apps/web) → db ✓` に合致。

**Alternatives considered**: page / action 側で分岐 → 選択が散らばる。モジュールロード時接続 → build が DB を要求して落ちる。

### D5: `ensureSchema` の DDL 実行に `sql` テンプレートタグを使用

`PgDatabase.execute()` は `SQLWrapper | string` を受けるが、driver ごとの `QueryResult` HKT に依存する。`sql` テンプレートタグ（`import { sql } from 'drizzle-orm'`）を使い `db.execute(sql\`...\`)` で呼ぶ。これは `PgDatabase<any>` の `execute` で型安全に呼べる。

**Rationale**: `PgDatabase<any>` で `execute(string)` を呼ぶと戻り値の型推論が driver 依存になるが、`sql` タグを使えば `SQLWrapper` として統一的に渡せる。

**Alternatives considered**: 生文字列 → `PgDatabase<any>` の型パラメータ制約で問題が出る可能性がある。

## Risks / Trade-offs

- **[Risk] DDL と schema 定義の乖離** → `ensureSchema` 内に「DDL は `schema/*.ts` と同期を保つこと。drizzle-kit 導入後に廃止予定」のコメントを残す。テストで 4 テーブル作成を検証し最低限の網を張る。
- **[Risk] `PgDatabase<any>` の `any` による型安全性の低下** → repo 内部では `insert(table).values(...)` 等の table-aware API を使うため実害は限定的。型パラメータを絞る（例: `PgDatabase<PgQueryResultHKT>`）と pglite / postgres-js の `QueryResultHKT` が異なるため driver 非依存にならない。`any` は意図的な選択。
- **[Risk] `postgres` パッケージの bundle size が `apps/web` に入る** → `'memory'` 経路では dynamic import されず tree-shake 対象。`next build` への影響は最小。ただし `@koma/db` の `dependencies` に入るため、build 時に resolve 可能である必要がある。composition root の import を dynamic (`await import(...)`) にすれば完全に回避できるが、複雑さとのトレードオフ。まず静的 import で進め、問題が出れば dynamic import に移行する。
- **[Trade-off] `ensureSchema` は起動時に毎回 DDL を実行** → `IF NOT EXISTS` で冪等なので実害なし。将来マイグレーション運用に移行すれば廃止。

## Open Questions

- なし（request レビューで全論点が解決済み）
