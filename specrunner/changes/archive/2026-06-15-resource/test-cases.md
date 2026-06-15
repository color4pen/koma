# Test Cases: packages/resource

## Summary

- **Total**: 21 cases
- **Automated** (unit/integration): 18
- **Manual**: 3
- **Priority**: must: 14, should: 6, could: 1

---

### TC-001: capacity を省略すると既定値 1 が適用される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Resource の capacity は 1 以上の整数でなければならない > Scenario: capacity を省略すると既定値 1 が適用される

---

### TC-002: capacity に正整数を指定して構築できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Resource の capacity は 1 以上の整数でなければならない > Scenario: capacity に正整数を指定して構築できる

---

### TC-003: capacity が 0 のとき構築に失敗する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Resource の capacity は 1 以上の整数でなければならない > Scenario: capacity が 0 のとき構築に失敗する

---

### TC-004: capacity が負数のとき構築に失敗する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Resource の capacity は 1 以上の整数でなければならない > Scenario: capacity が負数のとき構築に失敗する

---

### TC-005: capacity が小数のとき構築に失敗する

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: Resource の capacity は 1 以上の整数でなければならない > Scenario: capacity が小数のとき構築に失敗する

---

### TC-006: name を更新しても元の Resource が保持される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Resource は immutable であり更新は新インスタンスを返す > Scenario: name を更新しても元の Resource が保持される

---

### TC-007: 更新後も id が保持される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Resource は immutable であり更新は新インスタンスを返す > Scenario: 更新後も id が保持される

---

### TC-008: capacity を更新する際も不変条件が再検証される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Resource は immutable であり更新は新インスタンスを返す > Scenario: capacity を更新する際も不変条件が再検証される

---

### TC-009: 生成した Resource が frozen である

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: Resource は Object.freeze で凍結される > Scenario: 生成した Resource が frozen である

---

### TC-010: save した Resource を findById で取得できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: InMemoryResourceRepository は save/findById/list の基本操作を提供する > Scenario: save した Resource を findById で取得できる

---

### TC-011: 未保存の id で findById すると null が返る

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: InMemoryResourceRepository は save/findById/list の基本操作を提供する > Scenario: 未保存の id で findById すると null が返る

---

### TC-012: save したものが list に含まれる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: InMemoryResourceRepository は save/findById/list の基本操作を提供する > Scenario: save したものが list に含まれる

---

### TC-013: 空の状態で list は空配列を返す

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: InMemoryResourceRepository は save/findById/list の基本操作を提供する > Scenario: 空の状態で list は空配列を返す

---

### TC-014: 同一 id で save を 2 回呼ぶと上書きされる

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: InMemoryResourceRepository は save/findById/list の基本操作を提供する > Scenario: 同一 id で save を 2 回呼ぶと上書きされる

---

### TC-015: id 省略時に一意な id が自動生成される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02: Resource 集約（`src/resource.ts`）/ T-03: Resource 集約のテスト

**GIVEN** `id` を省略し `name` と `kind` のみを渡した `createResource` の引数
**WHEN** `createResource` を 2 回呼び出す
**THEN** 各 `Resource` が `undefined` でない文字列 `id` を持ち、2 つの `id` は互いに異なる

---

### TC-016: 複数 Resource を save して list が全件返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-06: in-memory ResourceRepository のテスト

**GIVEN** 空の `InMemoryResourceRepository`
**WHEN** 異なる `id` を持つ 2 つの `Resource` を順に `save` し、`list` を呼び出す
**THEN** 2 件すべてを含む配列が返る

---

### TC-017: in-memory 実装が ResourceRepository 型を満たす

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04: ResourceRepository port / T-05: in-memory ResourceRepository 実装

**GIVEN** `createInMemoryResourceRepository()` で生成したインスタンス
**WHEN** `ResourceRepository` 型の変数に代入し、`pnpm -F @koma/resource run check-types` を実行する
**THEN** 型エラーが発生せず、インスタンスが `ResourceRepository` 型として割り当て可能である

---

### TC-018: kind に空文字を指定すると構築に失敗する

**Category**: unit
**Priority**: could
**Source**: design.md > Risks / Trade-offs（空文字チェック）

**GIVEN** `kind: ''` を指定した `createResource` の引数
**WHEN** `createResource` を呼び出す
**THEN** 例外が送出される

---

### TC-019: パッケージ設定の正確性

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01: パッケージスキャフォールド

**GIVEN** `packages/resource` ディレクトリが作成された状態
**WHEN** `packages/resource/package.json` の内容を確認する
**THEN** `name` が `"@koma/resource"`、`dependencies` に `"@koma/shared": "workspace:*"` が存在し、`next` / `react` / `drizzle-orm` / `zod` がいずれも含まれない。`scripts` に `check-types` / `test` / `lint` の 3 つが定義されている

---

### TC-020: pnpm コマンド（check-types / test / lint）が全て成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-07: 全体検証

**GIVEN** `packages/resource` の実装と全テストが完了した状態
**WHEN** `pnpm -F @koma/resource run check-types`、`pnpm -F @koma/resource run test`、`pnpm -F @koma/resource run lint` を順に実行する
**THEN** 3 コマンドすべてが exit code 0 で完了する

---

### TC-021: モノレポ全体への影響なし

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-07: 全体検証

**GIVEN** `@koma/resource` パッケージが追加された monorepo
**WHEN** `pnpm -r --if-present run check-types && pnpm -r --if-present run test` を実行する
**THEN** 全パッケージで exit code 0 が返り、既存パッケージ（`@koma/crm`、`@koma/shared` 等）のテストが引き続き green を維持する

---

## Result

```yaml
result: completed
total: 21
automated: 18
manual: 3
must: 14
should: 6
could: 1
blocked_reasons: []
```
