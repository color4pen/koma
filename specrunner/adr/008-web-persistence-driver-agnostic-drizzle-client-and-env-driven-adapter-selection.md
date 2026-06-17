# ADR-008: @koma/db の driver 非依存化と env 駆動 adapter 選択 — PgDatabase 基底型・createPostgresClient・ensureSchema・composition root 配線

- **status**: accepted
- **date**: 2026-06-18
- **change**: web-persistence
- **deciders**: architect, spec-runner

## Context

ADR-005 は `@koma/db` を monorepo 初の永続化アダプタ層として確立し、`DrizzleClient = ReturnType<typeof createDrizzleClient>`（= `PgliteDatabase`）という pglite 固定型で Repository を実装した。ADR-005 の D6 は「汎用 Drizzle DB 型への変更は後続 request のスコープ」と明記しており、本番 PostgreSQL ドライバへの対応を意図的に先送りしていた。

ADR-006 は `apps/web` の composition root を `globalThis` singleton パターンで確立し、「Drizzle 永続化への移行が 1 ファイルの差し替えで完結することが構造的に保証される（swappability の実証）」と記した。実際の差し替えは本 change のスコープとされていた。

本 change はこれら 2 つの宿題を同時に解消する:

1. `DrizzleClient` を pglite 固定型から `PgDatabase` 基底型に一般化し、全 Drizzle Repository を driver 非依存にする
2. 本番 PostgreSQL client (`createPostgresClient`) と冪等 DDL bootstrap (`ensureSchema`) を `@koma/db` に追加する
3. `apps/web` の composition root を `DATABASE_URL` の有無で Drizzle / in-memory を切り替える env 駆動 adapter 選択に拡張し、ADR-006 D2 が約束した swappability を実証する

drizzle-orm の型階層: `PgliteDatabase extends PgDatabase<PgliteQueryResultHKT>`, `PostgresJsDatabase extends PgDatabase<PostgresJsQueryResultHKT>`。両者は `PgDatabase` を共通基底にもつため、1 つの Repository 実装で両 driver に対応できる。

テスト環境は外部 DB を持たない（pglite で代替）。`next build` は `DATABASE_URL` 無しで成功する必要があるため、build 時に DB 接続が発生しない設計が必須となる。

## Decisions

### D1: `DrizzleClient` を `PgDatabase<PgQueryResultHKT>` に一般化

`packages/db/src/client.ts` の `DrizzleClient` 型を `import { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'` 由来の `PgDatabase<PgQueryResultHKT>` に変更する。

`PgDatabase` は `insert`, `select`, `execute` 等の Query Builder API を公開するクラスであり、`PgliteDatabase` も `PostgresJsDatabase` も継承する。各 Repository の `db: DrizzleClient` 引数はそのまま動き、1 つの実装で両 driver に対応する。

既存の `createDrizzleClient(pglite: PGlite)` 関数は残す。返り値 `PgliteDatabase` は `DrizzleClient`（= `PgDatabase<PgQueryResultHKT>`）の subtype なので代入可能であり、既存 pglite 契約テストは無変更で通る。

request の設計では `any` を提案していたが、実装では `PgQueryResultHKT` を使用した。これは pglite / postgres-js の `QueryResultHKT` が `PgQueryResultHKT` を基底とするため driver 非依存性は同等に実現できる正の逸脱（型安全性の向上）である。

**採用理由**: Repository を driver ごとに二重実装するのは重複と乖離を招く。`PgDatabase` 基底への一般化が最小変更で両対応を実現する。

**却下案**: pglite 型に固定したまま本番用 Repository を別途実装 → 重複・乖離。汎用型への変更は将来 ADR-005 Alternative 2 が示した通りコストが低い（今回その通りになった）。

---

### D2: `createPostgresClient(connectionString)` — 本番 PostgreSQL client を追加

`packages/db/src/postgres-client.ts` に新設。`postgres`（postgres-js）ライブラリで接続を作り、`drizzle-orm/postgres-js` の `drizzle()` でラップして返す。返り値型は `DrizzleClient`（= `PgDatabase<PgQueryResultHKT>`）に適合する。

`postgres` を `@koma/db` の `dependencies` に追加する。

**採用理由**: postgres-js は drizzle-orm 公式対応 driver であり、`PostgresJsDatabase extends PgDatabase` のため D1 と整合する。ESM ネイティブでシンプル（追加設定不要）。

**却下案**: `pg`（node-postgres）→ postgres-js の方が ESM ネイティブで設定が少ない。`@koma/db` が `postgres` を `dependencies` に持つことで、`apps/web` が依存追加なしに間接利用できる。

---

### D3: `ensureSchema(db)` — 冪等 DDL で 4 テーブルを bootstrap

`packages/db/src/ensure-schema.ts` に新設。`sql` テンプレートタグ（`import { sql } from 'drizzle-orm'`）と `db.execute()` を使い `CREATE TABLE IF NOT EXISTS` を 4 テーブル（customers / resources / services / bookings）分逐次実行する。`IF NOT EXISTS` により何度実行してもエラーにならない（冪等）。

DDL 文は各テストの `CREATE TABLE IF NOT EXISTS` 文を正典とし、`ensureSchema` に集約する。`drizzle-kit` によるマイグレーション管理は本 change のスコープ外とし、後続で導入する際に `ensureSchema` を廃止する旨のコメントを残す。

**採用理由**: drizzle-kit マイグレーション運用は本 change のスコープ外。冪等 DDL は demo / 起動時 bootstrap として適切。`sql` テンプレートタグを使うことで `PgDatabase<any>` の `execute` メソッドに型安全に渡せる。

**却下案**: drizzle-kit のマイグレーション → drizzle-kit 依存が必要でスコープ外。drizzle-orm の `migrate()` API → drizzle-kit 依存が同様に必要。生文字列渡し → `PgDatabase` の型パラメータ制約で問題が出る可能性。

**既知のリスク**: `ensureSchema` 内の DDL 文と `schema/*.ts` のカラム定義が乖離するリスクがある。テストで 4 テーブル作成を検証し最低限の網を張る。drizzle-kit 導入後に廃止予定。

---

### D4: env 駆動 adapter 選択 — composition root に閉じる

`apps/web/lib/persistence-mode.ts` に `selectPersistenceMode(env: { DATABASE_URL?: string }): 'drizzle' | 'memory'` を純関数として追加する。`DATABASE_URL` が truthy なら `'drizzle'`、falsy なら `'memory'`。`process.env` を直参照しない純関数にすることでテストが容易になる。

`apps/web/lib/composition-root.ts` を拡張する:

- `selectPersistenceMode(process.env)` の結果で分岐
- `'drizzle'` モード: `createPostgresClient(DATABASE_URL!)` + `ensureSchema(db)` を初回 `get*Repository()` 呼び出し時に一度だけ実行し、Drizzle Repository 群を `globalThis` にキャッシュ。`drizzleInitPromise` を `globalThis` にキャッシュすることで並行呼び出しでも二重初期化しない
- `'memory'` モード: 従来の in-memory Repository を返す（変更なし）
- `globalThis` 単一生成は維持

`apps/web/package.json` に `"@koma/db": "workspace:*"` を追加。`next.config.ts` の `transpilePackages` に `@koma/db` を追加。

**採用理由**: adapter 選択を composition root 1 箇所に閉じることで、port 型に依存する page / action / use-case は無変更（ヘキサゴナルの payoff = 差し替えが 1 箇所）。ADR-006 D2 が約束した「Drizzle 永続化への移行が 1 ファイルの差し替えで完結する」を実証する。

**却下案**: page / action 側で分岐 → 選択が散らばり後続メンテコストが増大。モジュールロード時に接続 → `DATABASE_URL` 無しの `next build` が DB 接続を要求して失敗する。

---

### D5: `@koma/db` の dynamic import による遅延ロード

`apps/web` の composition root で `@koma/db` を `await import('@koma/db')` で dynamic import する。これにより `'memory'` 経路および `next build` 時（`DATABASE_URL` 無し）に `postgres` モジュールが一切ロードされない。

設計書は「まず静的 import で進め、問題が出れば dynamic import に移行する」と示唆していたが、実装では直接 dynamic import を採用した。これは静的 import だと `postgres` パッケージが `'memory'` 経路でもバンドルされ `next build` に影響する可能性があるという判断による正の逸脱である。

**採用理由**: `DATABASE_URL` 無しでの `next build` 成功を保証しつつ、`postgres` パッケージの bundle への混入を防ぐ。`drizzleInitPromise` の globalThis キャッシュと組み合わせて、async 初期化を安全に行う。

**却下案**: 静的 import → `'memory'` モードでも `postgres` がロードされる。tree-shaking の保証が難しく、`next build` 時の挙動が不明確になる。

---

### D6: `apps/web` の全ページに `export const dynamic = 'force-dynamic'` を追加

全ページ（bookings / customers / resources / services / page）を静的プリレンダリング（Static）から動的レンダリング（Dynamic）に切り替える。

**採用理由**: `DATABASE_URL` 無しでビルドした場合、静的プリレンダリングは初回デプロイ後の GET リクエストで in-memory（空）データの静的 HTML を返す。`revalidatePath` が呼ばれる（書き込み操作後）まで DB データが表示されない問題がある。`force-dynamic` により毎リクエスト時に server component が再レンダリングされ、常に最新の DB データを返す。

**却下案**: 静的プリレンダリングのまま → 初回デプロイ後の初期表示が空になるリスク。`revalidatePath` 依存のデータ更新は書き込み後のみ有効で、読み取り専用ユーザーには陳腐化したデータが表示される。

## Alternatives Considered

### Alternative 1: pglite 型に固定したまま本番用 Repository を別途実装

```typescript
// DrizzleClient = PgliteDatabase のまま
function createProductionCustomerRepository(db: PostgresJsDatabase) { ... }
function createDrizzleCustomerRepository(db: PgliteDatabase) { ... }
```

**Pros**: 型が具体的で誤使用が防ぎやすい。

**Cons**: 4 Repository × 2 実装 = 8 ファイルの二重実装。仕様変更時に両方更新が必要で乖離が生まれる。`PgDatabase` 基底型の活用という drizzle-orm の設計意図に反する。

**Why not**: `PgDatabase` 基底への一般化が最小変更で両対応を実現し、乖離リスクを排除する。

---

### Alternative 2: drizzle-kit によるマイグレーション管理

```bash
pnpm drizzle-kit push  # または migrate
```

**Pros**: スキーマ定義（`schema/*.ts`）から DDL を自動生成し、定義と DDL の乖離を防ぐ。本番運用に適した管理方式。

**Cons**: drizzle-kit のセットアップ（設定ファイル・マイグレーションディレクトリ）が必要。CI/CD との統合が必要。本 change のスコープを超える。

**Why not**: 冪等 DDL（`ensureSchema`）で demo / 起動時 bootstrap として機能し、現時点の要件を満たす。drizzle-kit 導入は後続 change で行う。

---

### Alternative 3: モジュールロード時に DB 接続を確立する

```typescript
// composition-root.ts トップレベル
const db = createPostgresClient(process.env.DATABASE_URL!)
await ensureSchema(db)
```

**Pros**: 接続タイミングが明示的。

**Cons**: `DATABASE_URL` 無しの環境（`next build`・テスト）で即座に失敗する。Next.js のモジュール評価順によっては `process.env` が未解決の場合がある。

**Why not**: `get*Repository()` 初回呼び出し時の遅延初期化により、build 時・`'memory'` モード時の DB 接続を完全に回避できる。

---

### Alternative 4: page / action 側で adapter を選択する

```typescript
// app/customers/page.tsx
const repo = process.env.DATABASE_URL
  ? createDrizzleCustomerRepository(db)
  : createInMemoryCustomerRepository()
```

**Pros**: 各ページが明示的に依存関係を制御できる。

**Cons**: 選択ロジックが全ページ・全 action に散在する。adapter を変更する際に多数のファイルを修正が必要。ヘキサゴナルアーキテクチャの payoff（差し替えが 1 箇所）が失われる。

**Why not**: composition root 1 箇所への集約がヘキサゴナルの本質。ADR-006 D2 のパターンを維持する。

## Consequences

### Positive

- `DrizzleClient` が `PgDatabase` 基底型になり、全 Drizzle Repository が driver 非依存になる。pglite テストは無変更で引き続き動作し、本番 PostgreSQL への切り替えが Repository 実装の変更なしで完了する
- ADR-006 D2 が約束した「Drizzle 永続化への移行が 1 ファイルの差し替えで完結する」が実際のコードで実証された。port 型に依存する page / action / use-case は 0 行の変更で Drizzle Repository に切り替わる（ヘキサゴナルの payoff を実証）
- `ensureSchema` により `drizzle-kit` セットアップなしに 4 テーブルを冪等 bootstrap できる。demo / PoC 環境での起動が単一の `DATABASE_URL` 設定のみで完了する
- dynamic import による遅延ロードにより `'memory'` モードと `next build` 時に `postgres` パッケージが一切ロードされない。bundle サイズへの影響を最小化しつつ、`DATABASE_URL` 無しのビルドが常に成功する
- `selectPersistenceMode` が純関数（`process.env` を直参照しない）として実装されており、単体テストが容易

### Negative / Trade-offs

- `ensureSchema` 内の DDL 文と `schema/*.ts` のカラム定義が乖離するリスクがある。手動同期が必要で、後続で drizzle-kit を導入した際に `ensureSchema` を廃止するまで二重管理になる
- `PgDatabase<PgQueryResultHKT>` の使用は `any` よりも型安全だが、QueryResult の型情報が失われる面がある。Repository 内部の query 結果は `unknown` として扱い、適切なキャストが必要
- `postgres` パッケージが `@koma/db` の `dependencies` に入るため、`apps/web` の `node_modules` に解決可能である必要がある。dynamic import で回避しているが、将来の bundle 設定変更時に再確認が必要
- 本番 PostgreSQL に対する結合テストが存在しない（CI に DB が無いため pglite で代替）。`createPostgresClient` の動作は型チェックと pglite での間接検証に留まる
- `next build` で全ページが `force-dynamic` になったため、静的最適化の恩恵を受けられない。将来的にキャッシュ戦略を導入する際は per-page で `revalidate` を設定する必要がある

## References

- `docs/アーキテクチャ/model.md` — 層・依存規律 B-1〜B-6、`delivery(apps/web) → db ✓`
- `specrunner/adr/005-db-package-drizzle-pglite-persistence-adapter-pattern.md` — DrizzleClient pglite 固定型の確立（本 ADR で一般化）
- `specrunner/adr/006-web-delivery-layer-composition-root-server-action-zod-mini-boundary.md` — composition root swappability の約束（本 ADR で実証）
- `specrunner/changes/web-persistence/design.md` — 詳細設計判断（D1〜D5）
- `packages/db/src/client.ts` — `DrizzleClient = PgDatabase<PgQueryResultHKT>` 定義
- `packages/db/src/postgres-client.ts` — `createPostgresClient` 実装
- `packages/db/src/ensure-schema.ts` — `ensureSchema` 冪等 DDL 実装
- `apps/web/lib/persistence-mode.ts` — `selectPersistenceMode` 純関数
- `apps/web/lib/composition-root.ts` — env 駆動 adapter 選択・dynamic import・globalThis キャッシュ
