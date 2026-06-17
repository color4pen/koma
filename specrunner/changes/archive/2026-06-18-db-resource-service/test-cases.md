# Test Cases: DrizzleResourceRepository / DrizzleServiceRepository

## Summary

- **Total**: 23 cases
- **Automated** (unit/integration): 21
- **Manual**: 2
- **Priority**: must: 23, should: 0, could: 0

---

## DrizzleResourceRepository 契約

### TC-001: save した Resource を findById で全フィールド一致で取得できる

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: DrizzleResourceRepository SHALL persist and reconstruct Resource aggregates via createResource > Scenario: save した Resource を findById で全フィールド一致で取得できる

---

### TC-002: 未保存の id で findById すると null が返る

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: DrizzleResourceRepository SHALL persist and reconstruct Resource aggregates via createResource > Scenario: 未保存の id で findById すると null が返る

---

### TC-003: 複数 save した Resource を list で全件取得できる

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: DrizzleResourceRepository SHALL persist and reconstruct Resource aggregates via createResource > Scenario: 複数 save した Resource を list で全件取得できる

---

### TC-004: 同一 id で再 save すると更新される（upsert）

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: DrizzleResourceRepository SHALL persist and reconstruct Resource aggregates via createResource > Scenario: 同一 id で再 save すると更新される（upsert）

---

### TC-005: capacity が保存 → 取得で保たれ不変条件を通る

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: DrizzleResourceRepository SHALL persist and reconstruct Resource aggregates via createResource > Scenario: capacity が保存 → 取得で保たれ不変条件を通る

---

## DrizzleServiceRepository 契約

### TC-006: save した Service を findById で全フィールド一致で取得できる

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: DrizzleServiceRepository SHALL persist and reconstruct Service aggregates via createService with value object factories > Scenario: save した Service を findById で全フィールド一致で取得できる

---

### TC-007: 未保存の id で findById すると null が返る

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: DrizzleServiceRepository SHALL persist and reconstruct Service aggregates via createService with value object factories > Scenario: 未保存の id で findById すると null が返る

---

### TC-008: 複数 save した Service を list で全件取得できる

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: DrizzleServiceRepository SHALL persist and reconstruct Service aggregates via createService with value object factories > Scenario: 複数 save した Service を list で全件取得できる

---

### TC-009: 同一 id で再 save すると更新される（upsert）

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: DrizzleServiceRepository SHALL persist and reconstruct Service aggregates via createService with value object factories > Scenario: 同一 id で再 save すると更新される（upsert）

---

### TC-010: duration が往復で保たれる

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: DrizzleServiceRepository SHALL persist and reconstruct Service aggregates via createService with value object factories > Scenario: duration が往復で保たれる

---

### TC-011: price が往復で保たれる

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: DrizzleServiceRepository SHALL persist and reconstruct Service aggregates via createService with value object factories > Scenario: price が往復で保たれる

---

### TC-012: resourceKinds が往復で保たれる

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: DrizzleServiceRepository SHALL persist and reconstruct Service aggregates via createService with value object factories > Scenario: resourceKinds が往復で保たれる

---

### TC-013: resourceKinds が空配列の場合も往復する

- **Category**: integration
- **Priority**: must
- **Source**: spec.md > Requirement: DrizzleServiceRepository SHALL persist and reconstruct Service aggregates via createService with value object factories > Scenario: resourceKinds が空配列の場合も往復する

---

## パッケージ設定

### TC-014: packages/db に @koma/resource / @koma/catalog の依存が追加されている

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-01

**GIVEN** `packages/db/package.json` が存在する  
**WHEN** `dependencies` フィールドを参照する  
**THEN** `"@koma/resource": "workspace:*"` と `"@koma/catalog": "workspace:*"` が両方含まれる

---

### TC-015: packages/db に next / react / zod の依存が混入していない

- **Category**: manual
- **Priority**: must
- **Source**: tasks.md > T-01, request.md > 受け入れ基準

**GIVEN** `packages/db/package.json` が存在する  
**WHEN** `grep -E '"(next|react|zod)"' packages/db/package.json` を実行する  
**THEN** 0 件（マッチなし）

---

## Schema 定義

### TC-016: resources テーブルの schema が正しいカラム定義で存在する

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-02

**GIVEN** `packages/db/src/schema/resource.ts` が作成されている  
**WHEN** `pnpm -F @koma/db run check-types` を実行する  
**THEN** `resources` テーブル（`id` text PK / `name` text NOT NULL / `kind` text NOT NULL / `capacity` integer NOT NULL）と `ResourceRow` 型が export されており、型チェックがエラーなく完了する

---

### TC-017: services テーブルの schema が正しいカラム定義で存在する

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-03

**GIVEN** `packages/db/src/schema/service.ts` が作成されている  
**WHEN** `pnpm -F @koma/db run check-types` を実行する  
**THEN** `services` テーブル（`id` text PK / `name` text NOT NULL / `duration_ms` integer NOT NULL / `price_amount` integer NOT NULL / `price_currency` text NOT NULL / `resource_kinds` jsonb NOT NULL）と `ServiceRow` 型が export されており、型チェックがエラーなく完了する

---

## 型安全性

### TC-018: DrizzleResourceRepository が ResourceRepository port を型として満たす

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-04

**GIVEN** `createDrizzleResourceRepository(db: DrizzleClient)` が実装されている  
**WHEN** `pnpm -F @koma/db run check-types` を実行する  
**THEN** 戻り値が `ResourceRepository` 型に割り当て可能であり、型エラーなく完了する

---

### TC-019: DrizzleServiceRepository が ServiceRepository port を型として満たす

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-05

**GIVEN** `createDrizzleServiceRepository(db: DrizzleClient)` が実装されている  
**WHEN** `pnpm -F @koma/db run check-types` を実行する  
**THEN** 戻り値が `ServiceRepository` 型に割り当て可能であり、型エラーなく完了する

---

## Export

### TC-020: index.ts から必要なシンボルがすべて export されている

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-08

**GIVEN** `packages/db/src/index.ts` が更新されている  
**WHEN** export 一覧を参照し `pnpm -F @koma/db run check-types` を実行する  
**THEN** `createDrizzleResourceRepository`、`createDrizzleServiceRepository`、`resources`、`services` がすべて export されており、型チェックが通る

---

## テスト隔離パターン

### TC-021: ResourceRepository テストが beforeEach / afterEach で隔離されている

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-06

**GIVEN** `packages/db/src/drizzle-resource-repository.test.ts` が作成されている  
**WHEN** `pnpm -F @koma/db run test` を実行する  
**THEN** 各テストが `beforeEach` で fresh な `PGlite` インスタンスを生成し `CREATE TABLE` を発行、`afterEach` で `pglite.close()` を呼ぶ隔離パターンで動作し、全テストが pass する

---

### TC-022: ServiceRepository テストが beforeEach / afterEach で隔離されている

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-07

**GIVEN** `packages/db/src/drizzle-service-repository.test.ts` が作成されている  
**WHEN** `pnpm -F @koma/db run test` を実行する  
**THEN** 各テストが `beforeEach` で fresh な `PGlite` インスタンスを生成し `CREATE TABLE` を発行、`afterEach` で `pglite.close()` を呼ぶ隔離パターンで動作し、全テストが pass する

---

## 全体統合

### TC-023: monorepo 全体の型チェックとテストが green

- **Category**: integration
- **Priority**: must
- **Source**: tasks.md > T-09, request.md > 受け入れ基準

**GIVEN** すべてのタスク（T-01〜T-08）が実装済みの状態  
**WHEN** `pnpm -r --if-present run check-types && pnpm -r --if-present run test` を実行する  
**THEN** 全パッケージ（customer / resource / service を含む）でエラーなく完了する（green）

---

## Result

```yaml
result: completed
total: 23
automated: 21
manual: 2
must: 23
should: 0
could: 0
blocked_reasons: []
```
