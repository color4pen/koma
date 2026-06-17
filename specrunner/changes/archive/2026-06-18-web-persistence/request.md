# apps/web を Drizzle 永続化に配線する（driver 非依存化 ＋ 本番 client ＋ env 駆動の adapter 選択）

## Meta

- **type**: new-feature
- **slug**: web-persistence
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 新しい port/adapter 追加、既存パターンと異なる設計選択、振る舞い/契約を変える修正、構造的リファクタリング → true。いずれにも該当しない → false -->

## 背景

`packages/db` の Drizzle Repository（Customer / Resource / Service / Booking）を `apps/web` から実使用できるようにし、ヘキサゴナルの adapter 差し替えを実コードで完成させる。現状 `createDrizzleClient` は pglite 専用で repo もその型に固定されている（db-customer の判断で本番対応を後続にした）。本 request で **driver 非依存に一般化**し、**本番 PostgreSQL client** を足し、**`DATABASE_URL` があれば Drizzle・無ければ in-memory** という env 駆動の adapter 選択を composition root に入れる。

## 現状コードの前提

- `packages/db/src/client.ts` の `createDrizzleClient(pglite: PGlite)` は `drizzle-orm/pglite` を使い pglite 専用。`DrizzleClient = ReturnType<typeof createDrizzleClient>`（pglite 固定型）。各 `createDrizzle*Repository(db: DrizzleClient)` はこの型を受ける。
- `packages/db` は `createDrizzle{Customer,Resource,Service,Booking}Repository` と各 schema（`customers` / `resources` / `services` / `bookings`）を export 済み。各 repo は `db.insert(...).onConflictDoUpdate(...)` / `db.select().from(...).where(...)` を使う。
- `apps/web/lib/composition-root.ts` は `getCustomerRepository` 等で in-memory repo を `globalThis` 単一生成する。`apps/web` は `@koma/db` 未依存。
- 検証は外部 DB を持たない（pglite で実施）。`next build` は `DATABASE_URL` 無しで通る必要がある。

## 要件

<!-- 最重量部: (1) repo の db 型を driver 非依存化 (2) ensureSchema (3) build が DB 無しで通る env 駆動選択。 -->

1. **db client 型を driver 非依存に一般化**。`DrizzleClient` を **`drizzle-orm/pg-core` の `PgDatabase` 基底型**（generic は `any` で可）に一般化し、各 Drizzle repo の `db` 引数をそれに合わせる。pglite の drizzle インスタンスも postgres-js の drizzle インスタンスも `PgDatabase` を継承するため両対応になる。既存 pglite テストは引き続き通す（`createDrizzleClient(pglite)` は残す）。

2. **本番 PostgreSQL client**。`@koma/db` に `createPostgresClient(connectionString: string)` を追加（PostgreSQL driver ＝ 例: `postgres`(postgres-js) ＋ `drizzle-orm/postgres-js`）。返り値は要件1の一般化型に適合する。driver を dependencies に追加する。

3. **`ensureSchema(db)`**。4 テーブル（customers / resources / services / bookings）を **`CREATE TABLE IF NOT EXISTS` で冪等に**作成する関数を `@koma/db` に追加・export する。pglite でも本番 client でも動く。

4. **apps/web の env 駆動 adapter 選択**。`apps/web` に `@koma/db` を依存追加。`selectPersistenceMode(env): 'drizzle' | 'memory'`（`DATABASE_URL` があれば `'drizzle'`、無ければ `'memory'`、純関数）を追加。composition root を、`'drizzle'` のとき `createPostgresClient(DATABASE_URL)` ＋ `ensureSchema` を一度行い Drizzle repo 群を返す／`'memory'` のとき従来の in-memory を返す、に拡張する（`globalThis` 単一生成は維持。client 生成・接続は遅延し、build/`DATABASE_URL` 無し時は in-memory 経路で DB 接続しない）。

5. **vitest テスト**: `selectPersistenceMode`（`DATABASE_URL` 有→drizzle / 無→memory）＋ `ensureSchema`（pglite で 4 テーブルが作成され、再実行しても失敗しない＝冪等）＋ pglite client で各 Drizzle repo が一般化型のまま動く（既存テスト維持）。

## スコープ外

- drizzle-kit による本番マイグレーション運用（本 request は `ensureSchema` の冪等 DDL で代替）
- 接続プールのチューニング・リトライ
- 本番 PostgreSQL に対する結合テスト（CI に DB が無いため。pglite で代替）
- 認証・検索・ページネーション

## 受け入れ基準

<!-- 機械検証できる文にする。 -->

- [ ] `DrizzleClient` が driver 非依存型（`PgDatabase` 基底）になり、各 Drizzle repo がその型を受ける。既存 pglite 契約テストが引き続き green
- [ ] `@koma/db` に `createPostgresClient` と `ensureSchema` が追加・export され、PostgreSQL driver が dependencies に入る
- [ ] `ensureSchema`: pglite で 4 テーブルが作成され、**2 回実行しても失敗しない（冪等）**ことをテストで固定する
- [ ] `selectPersistenceMode`: `DATABASE_URL` 有で `'drizzle'`、無で `'memory'` を返すことをテストで固定する
- [ ] `apps/web` が `@koma/db` に依存し、**`DATABASE_URL` 無しで `pnpm -F web run build` が成功する**（in-memory 経路、DB 接続なし）
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test && pnpm -r --if-present run build` が green

## architect 評価済みの設計判断

<!-- 採用案 + 却下案。 -->

- **repo の db 型を `PgDatabase` 基底に一般化**（driver 非依存）。pglite / postgres-js の両 drizzle インスタンスが継承するため 1 つの repo 実装で両対応。却下: pglite 型に固定したまま本番用 repo を二重実装（重複・乖離）。
- **本番マイグレーションは `ensureSchema` の冪等 DDL で代替**（demo/起動時 bootstrap）。却下: drizzle-kit のマイグレーション運用（本 request の範囲を超える。後続で導入可）。
- **adapter 選択は env 駆動（`DATABASE_URL`）で composition root に閉じる**。port 型に依存する page / action / use-case は無変更（ヘキサゴナルの payoff＝差し替えが 1 箇所）。却下: page / action 側で分岐（選択が散らばる）。
- **client 生成は遅延**し、`DATABASE_URL` 無し（build 含む）では DB 接続しない。却下: モジュールロード時接続（build が DB を要求して落ちる）。
- **adr: true** の理由: 永続化アダプタの driver 非依存化と、env 駆動の adapter 選択という、本番運用に効く構造決定を記録する。
