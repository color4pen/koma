# Test Cases: web-persistence

## Summary

- **Total**: 22 cases
- **Automated** (unit/integration): 15
- **Manual**: 7
- **Priority**: must: 17, should: 5, could: 0

---

## 型システム（DrizzleClient 型の一般化）

### TC-001: pglite drizzle インスタンスが DrizzleClient 型に適合する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: DrizzleClient SHALL be driver-independent > Scenario: pglite drizzle インスタンスが DrizzleClient 型に適合する

---

### TC-002: 各 Drizzle repo が一般化型のまま pglite で動作する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: DrizzleClient SHALL be driver-independent > Scenario: 各 Drizzle repo が一般化型のまま pglite で動作する

---

### TC-013: DrizzleClient 型が PgDatabase<any> として定義されている

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `packages/db/src/client.ts` が存在する
**WHEN** `DrizzleClient` の型定義を確認する
**THEN** `import { type PgDatabase } from 'drizzle-orm/pg-core'` 由来の `PgDatabase<any>` として定義されており、`ReturnType<typeof createDrizzleClient>` のような pglite 固定型ではない

---

## ensureSchema（冪等 DDL）

### TC-003: 空のデータベースに対して 4 テーブルが作成される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: ensureSchema SHALL idempotently create all 4 tables > Scenario: 空のデータベースに対して 4 テーブルが作成される

---

### TC-004: 2 回実行してもエラーにならない（冪等）

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: ensureSchema SHALL idempotently create all 4 tables > Scenario: 2 回実行してもエラーにならない（冪等）

---

### TC-005: ensureSchema 後に Drizzle repo が正常に動作する

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: ensureSchema SHALL idempotently create all 4 tables > Scenario: ensureSchema 後に Drizzle repo が正常に動作する

---

## createPostgresClient（本番 client）

### TC-006: createPostgresClient が DrizzleClient 型を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: createPostgresClient SHALL create a production-ready Drizzle client > Scenario: createPostgresClient が DrizzleClient 型を返す

---

## selectPersistenceMode（env 駆動の adapter 選択）

### TC-007: DATABASE_URL が設定されている場合は 'drizzle' が返る

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: selectPersistenceMode SHALL return mode based on DATABASE_URL > Scenario: DATABASE_URL が設定されている場合

---

### TC-008: DATABASE_URL が未設定の場合は 'memory' が返る

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: selectPersistenceMode SHALL return mode based on DATABASE_URL > Scenario: DATABASE_URL が未設定の場合

---

### TC-009: DATABASE_URL が空文字の場合は 'memory' が返る

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: selectPersistenceMode SHALL return mode based on DATABASE_URL > Scenario: DATABASE_URL が空文字の場合

---

### TC-017: DATABASE_URL が undefined の場合は 'memory' が返る

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** `{ DATABASE_URL: undefined }` を env として渡す
**WHEN** `selectPersistenceMode(env)` を呼ぶ
**THEN** `'memory'` が返る

---

### TC-018: selectPersistenceMode が純関数で process.env を直参照しない

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-05 / design.md > D4

**GIVEN** `selectPersistenceMode` の実装が存在する
**WHEN** 異なる env オブジェクトを引数として渡して呼ぶ
**THEN** `process.env` の状態に依らず、渡した `env` 引数の `DATABASE_URL` 値のみに基づいて結果が決まる（実装が `process.env` を直参照していない）

---

## composition root（adapter 配線）

### TC-010: DATABASE_URL 設定時に Drizzle repo が返る

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: composition root SHALL use Drizzle repos when DATABASE_URL is set > Scenario: DATABASE_URL 設定時に Drizzle repo が返る

---

### TC-011: DATABASE_URL 未設定時に in-memory repo が返る

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: composition root SHALL use Drizzle repos when DATABASE_URL is set > Scenario: DATABASE_URL 未設定時に in-memory repo が返る

---

### TC-019: globalThis 単一生成が維持される（複数呼び出しで同一インスタンス）

**Category**: integration
**Priority**: should
**Source**: design.md > D4 / tasks.md > T-06

**GIVEN** `getCustomerRepository()` が一度呼ばれ、初期化（`createPostgresClient` + `ensureSchema`）が完了した後
**WHEN** 同じ `getCustomerRepository()` を再度呼ぶ
**THEN** 同一のリポジトリインスタンスが返り、`createPostgresClient` と `ensureSchema` は再実行されない

---

### TC-020: composition root の adapter 選択が selectPersistenceMode に閉じている

**Category**: manual
**Priority**: should
**Source**: design.md > D4 / tasks.md > T-06

**GIVEN** `apps/web/lib/composition-root.ts` の実装が存在する
**WHEN** `DATABASE_URL` による分岐箇所を全ファイルで確認する
**THEN** `selectPersistenceMode` 以外の場所（page / action / use-case 等）に `DATABASE_URL` を参照した分岐が存在しない

---

## ビルド（DATABASE_URL 無し）

### TC-012: DATABASE_URL 無しで next build が成功する

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: apps/web SHALL build without DATABASE_URL > Scenario: DATABASE_URL 無しで next build が成功する

---

## パッケージ構成・公開 API

### TC-014: postgres が @koma/db の dependencies に含まれる

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-04

**GIVEN** `packages/db/package.json` が存在する
**WHEN** `dependencies` フィールドのキー一覧を確認する
**THEN** `"postgres"` が `dependencies` に存在する（`devDependencies` ではなく `dependencies`）

---

### TC-015: ensureSchema と createPostgresClient が @koma/db から import 可能

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-02, T-04

**GIVEN** `packages/db/src/index.ts` が存在する
**WHEN** named export の一覧を確認する
**THEN** `ensureSchema` と `createPostgresClient` がいずれも named export されている

---

### TC-016: @koma/db が apps/web の dependencies に含まれる

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** `apps/web/package.json` が存在する
**WHEN** `dependencies` フィールドを確認する
**THEN** `"@koma/db": "workspace:*"` が `dependencies` に存在する

---

## DDL 整合

### TC-021: ensureSchema の DDL と schema/*.ts のカラム定義が一致している

**Category**: manual
**Priority**: should
**Source**: design.md > Risks/Trade-offs / tasks.md > T-02

**GIVEN** `packages/db/src/ensure-schema.ts` の DDL と `packages/db/src/schema/*.ts` の `pgTable` 定義が存在する
**WHEN** 4 テーブル（customers / resources / services / bookings）のカラム名・型・制約を比較する
**THEN** DDL の `CREATE TABLE IF NOT EXISTS` 定義が schema ファイルのカラム定義と乖離していない

---

## 全体 CI

### TC-022: pnpm -r run check-types && test && build が全体 green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-07

**GIVEN** `DATABASE_URL` 環境変数が未設定の状態で、全パッケージのソースが揃っている
**WHEN** `pnpm -r --if-present run check-types && pnpm -r --if-present run test && pnpm -r --if-present run build` を実行する
**THEN** 3 コマンドすべてが exit code 0 で完了する（型チェック・テスト・ビルドが全パッケージで green）

---

## Result

```yaml
result: completed
total: 22
automated: 15
manual: 7
must: 17
should: 5
could: 0
blocked_reasons: []
```
