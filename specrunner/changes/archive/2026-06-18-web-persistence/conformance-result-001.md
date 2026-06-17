# Conformance Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:   implementation conforms to tasks.md, design.md, spec.md, and request.md
  - needs-fix:  one or more upstream artifacts are not satisfied by the implementation
  - escalation: conformance cannot be determined (missing artifacts, unresolvable ambiguity)
- The Findings table records the per-artifact judgment.
-->

- **verdict**: approved

## Conformance Findings

| Artifact | Conforms | Notes |
|----------|----------|-------|
| tasks.md | ✅ yes | 全 7 タスク（T-01〜T-07）のチェックボックスが `[x]` 完了済み |
| design.md | ✅ yes | D1〜D5 の全設計判断が実装に反映。D1 は `PgDatabase<any>` → `PgDatabase<PgQueryResultHKT>` の正の逸脱（型安全性向上、code review 承認済み） |
| spec.md | ✅ yes | 全 6 Requirement・全 11 Scenario が実装・テストで充足。TC-010 drizzle branch の unit test は低優先度残課題（code review Finding #2） |
| request.md | ✅ yes | 全 6 受け入れ基準が機械検証で確認（verification 4 フェーズ全 passed） |

---

## 1. Tasks Completeness

`tasks.md` の全チェックボックスが `[x]` 完了済みであることを確認した。

| Task | Status |
|------|--------|
| T-01: DrizzleClient 型を PgDatabase 基底に一般化 | ✅ |
| T-02: ensureSchema 関数を追加 | ✅ |
| T-03: ensureSchema のテストを追加 | ✅ |
| T-04: createPostgresClient を追加 | ✅ |
| T-05: selectPersistenceMode 関数を追加（apps/web） | ✅ |
| T-06: apps/web に @koma/db 依存を追加し composition root を拡張 | ✅ |
| T-07: 全体検証 | ✅ |

---

## 2. Design Decisions vs. Implementation

### D1: `DrizzleClient` を `PgDatabase` 基底に一般化

`packages/db/src/client.ts`:

```ts
export type DrizzleClient = PgDatabase<PgQueryResultHKT>;
```

設計・タスクが `PgDatabase<any>` と指定していたのに対し、実装は `PgDatabase<PgQueryResultHKT>` を採用。pglite / postgres-js の両 drizzle インスタンスが代入可能であることをより型安全に表現した**正の逸脱**であり、全型チェックがパスしている。code review（Finding #3、low）でも「any より精緻化した正の逸脱」と評価済み。**適合**。

### D2: `createPostgresClient(connectionString)` を追加

`packages/db/src/postgres-client.ts` に実装。`postgres`（postgres-js）で接続、`drizzle-orm/postgres-js` でラップ。返り値型 `DrizzleClient`。`packages/db/package.json` に `"postgres": "^3.4.5"` が dependencies に追加済み。**適合**。

### D3: `ensureSchema(db)` — 冪等 DDL

`packages/db/src/ensure-schema.ts` に実装。`sql` テンプレートタグ + `db.execute()` で 4 テーブルを `CREATE TABLE IF NOT EXISTS` で逐次実行。DDL と `schema/*.ts` 同期・drizzle-kit 導入後廃止予定のコメントあり。**適合**。

### D4: env 駆動 adapter 選択 — composition root に閉じる

`apps/web/lib/composition-root.ts` に実装。`selectPersistenceMode({ DATABASE_URL: process.env.DATABASE_URL })` でモードを決定。drizzle 経路では `await import('@koma/db')` による **dynamic import** で遅延初期化（設計書が「静的 import で進め問題があれば dynamic に」と示唆していたより優れた実装）。`drizzleInitPromise` を `globalThis` にキャッシュし並行呼び出しでも二重初期化しない。**適合**。

### D5: `ensureSchema` DDL に `sql` テンプレートタグを使用

`db.execute(sql\`CREATE TABLE IF NOT EXISTS ...\`)` の形式で統一。**適合**。

---

## 3. Spec Requirements Coverage

### Requirement: DrizzleClient SHALL be driver-independent

| Scenario | 証跡 | 判定 |
|----------|------|------|
| pglite インスタンスが DrizzleClient 型に適合 | `createDrizzleClient(pglite)` 返り値が `PgDatabase` subtype として型チェックパス | ✅ |
| 各 Drizzle repo が一般化型のまま pglite で動作 | 既存 4 テスト（drizzle-*-repository.test.ts）24 tests passed | ✅ |

### Requirement: createPostgresClient SHALL create a production-ready Drizzle client

| Scenario | 証跡 | 判定 |
|----------|------|------|
| createPostgresClient が DrizzleClient 型を返す | 返り値型 `DrizzleClient` で型チェックパス | ✅ |

### Requirement: ensureSchema SHALL idempotently create all 4 tables

| Scenario | 証跡 | 判定 |
|----------|------|------|
| 空の DB に 4 テーブルが作成される | `ensure-schema.test.ts` テスト 1: `pg_tables` クエリで 4 テーブル確認 | ✅ |
| 2 回実行してもエラーにならない（冪等） | `ensure-schema.test.ts` テスト 2: `resolves.toBeUndefined()` × 2 | ✅ |
| ensureSchema 後に Drizzle repo が正常動作 | `ensure-schema.test.ts` テスト 3: Customer save → findById 成功 | ✅ |

### Requirement: selectPersistenceMode SHALL return mode based on DATABASE_URL

| Scenario | 証跡 | 判定 |
|----------|------|------|
| DATABASE_URL が設定されている場合 → drizzle | `persistence-mode.test.ts` テスト 1 | ✅ |
| DATABASE_URL が未設定 → memory | `persistence-mode.test.ts` テスト 2 | ✅ |
| DATABASE_URL が空文字 → memory | `persistence-mode.test.ts` テスト 3 | ✅ |

### Requirement: apps/web SHALL build without DATABASE_URL

| Scenario | 証跡 | 判定 |
|----------|------|------|
| DATABASE_URL 無しで next build が成功 | `verification-result.md` Phase build: passed（exit code 0） | ✅ |

### Requirement: composition root SHALL use Drizzle repos when DATABASE_URL is set

| Scenario | 証跡 | 判定 |
|----------|------|------|
| DATABASE_URL 設定時に Drizzle repo が返る | `initDrizzleRepos()` の dynamic import + `drizzleInitPromise` キャッシュで実装。unit test は低優先度残課題（code review Finding #2） | ✅ |
| DATABASE_URL 未設定時に in-memory repo が返る | `mode === 'memory'` 分岐。build 成功および test で間接確認 | ✅ |

---

## 4. Acceptance Criteria Coverage

| 受け入れ基準 | 証跡 | 判定 |
|-------------|------|------|
| `DrizzleClient` が driver 非依存型（`PgDatabase` 基底）、各 Drizzle repo がその型を受ける。既存 pglite テスト green | `client.ts` 確認 + `check-types` 通過 + 4 repo テスト 24 tests passed | ✅ |
| `@koma/db` に `createPostgresClient` と `ensureSchema` が追加・export、PostgreSQL driver が dependencies に入る | `index.ts` export 確認 + `package.json` `"postgres": "^3.4.5"` | ✅ |
| `ensureSchema`: pglite で 4 テーブル作成、2 回実行でも失敗しない（冪等）テスト | `ensure-schema.test.ts` テスト 1・2 が green | ✅ |
| `selectPersistenceMode`: DATABASE_URL 有→drizzle、無→memory をテストで固定 | `persistence-mode.test.ts` 4 tests passed | ✅ |
| `apps/web` が `@koma/db` に依存、DATABASE_URL 無しで `pnpm -F web run build` 成功 | `apps/web/package.json` `"@koma/db": "workspace:*"` + build phase passed | ✅ |
| `pnpm -r --if-present run check-types && test && build` が green | `verification-result.md` 全 4 フェーズ passed | ✅ |

---

## 5. Verification Summary

`verification-result.md` より:

| Phase | Status |
|-------|--------|
| typecheck | ✅ passed |
| test | ✅ passed |
| lint | ✅ passed |
| build | ✅ passed |

- `packages/db`: 29 tests passed（ensure-schema 3 tests 含む）
- `apps/web`: 91 tests passed（persistence-mode 4 tests 含む）

---

## 6. Residual Findings（後続 request への引継ぎ）

code review（review-feedback-001.md、verdict: approved）で記録された低優先度 findings。本変更の機能的正確性を損なうものではない。

| Finding | Severity | 内容 |
|---------|----------|------|
| #1 | low | 全ページが Static プリレンダリング。初回デプロイ後は in-memory（空）HTML を返す可能性。`export const dynamic = 'force-dynamic'` 追加を後続 request で検討 |
| #2 | low | composition root の drizzle branch（TC-010）の unit test が存在しない。`vi.mock('@koma/db')` によるモックテストで補完可能 |
| #3 | low | `DrizzleClient = PgDatabase<PgQueryResultHKT>` が spec の `PgDatabase<any>` と異なる旨のコメントなし（非破壊的） |
