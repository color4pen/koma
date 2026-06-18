# Test Cases: packages/iam — User 集約・Role・Permission（認可）と UserRepository

## Summary

- **Total**: 29 cases
- **Automated** (unit/integration): 22
- **Manual**: 7
- **Priority**: must: 25, should: 4, could: 0

---

## can() 認可

### TC-001: owner が全 Permission を持つ

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: can() は owner に対して全 Permission で true を返す > Scenario: owner が全 Permission を持つ

### TC-002: staff が manage-users を持たない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: can() は staff に対して manage-users と manage-settings で false を返す > Scenario: staff が manage-users を持たない

### TC-003: staff が manage-settings を持たない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: can() は staff に対して manage-users と manage-settings で false を返す > Scenario: staff が manage-settings を持たない

### TC-004: staff が manage-customers を持つ

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: can() は staff に対して業務系 Permission で true を返す > Scenario: staff が manage-customers を持つ

### TC-005: staff が manage-resources を持つ

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: can() は staff に対して業務系 Permission で true を返す > Scenario: staff が manage-resources を持つ

### TC-006: staff が manage-services を持つ

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: can() は staff に対して業務系 Permission で true を返す > Scenario: staff が manage-services を持つ

### TC-007: staff が manage-bookings を持つ

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: can() は staff に対して業務系 Permission で true を返す > Scenario: staff が manage-bookings を持つ

---

## User 集約

### TC-008: email が空文字で createUser を呼ぶ

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: User は email が空の場合に構築不可 > Scenario: email が空文字で createUser を呼ぶ

### TC-009: email が空白のみで createUser を呼ぶ

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: User は email が空の場合に構築不可 > Scenario: email が空白のみで createUser を呼ぶ

### TC-010: passwordHash と role が保持される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: User は passwordHash と role を保持する > Scenario: passwordHash と role が保持される

### TC-011: updateUser で email を変更しても元の User が不変

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: User は immutable で更新は新インスタンスを返す > Scenario: updateUser で email を変更しても元の User が不変

---

## UserRepository（InMemoryUserRepository）

### TC-012: 保存済み User を findByEmail で取得

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: UserRepository の findByEmail は該当 User を返し、未登録は null を返す > Scenario: 保存済み User を findByEmail で取得

### TC-013: 未登録メールで findByEmail

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: UserRepository の findByEmail は該当 User を返し、未登録は null を返す > Scenario: 未登録メールで findByEmail

### TC-014: save → findById

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: UserRepository の save → findById → list が正しく動作する > Scenario: save → findById

### TC-015: 未保存 id で findById

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: UserRepository の save → findById → list が正しく動作する > Scenario: 未保存 id で findById

### TC-016: save → list

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: UserRepository の save → findById → list が正しく動作する > Scenario: save → list

### TC-017: 同一 id の save は upsert

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: UserRepository の save → findById → list が正しく動作する > Scenario: 同一 id の save は upsert

---

## パッケージ設定・依存関係

### TC-018: package.json の name が @koma/iam

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01 Acceptance Criteria

**GIVEN** `packages/iam/package.json` が作成されている
**WHEN** `name` フィールドを確認する
**THEN** `"@koma/iam"` である

### TC-019: 禁止依存（next / react / drizzle-orm / zod）が含まれない

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01 Acceptance Criteria

**GIVEN** `packages/iam/package.json` が作成されている
**WHEN** `grep -E '"(next|react|drizzle-orm|zod)"' packages/iam/package.json` を実行する
**THEN** マッチが 0 件である

### TC-020: @koma/shared への workspace:* 依存が存在する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01 Acceptance Criteria

**GIVEN** `packages/iam/package.json` が作成されている
**WHEN** `dependencies` を確認する
**THEN** `"@koma/shared": "workspace:*"` が含まれる

### TC-021: pnpm -F @koma/iam run check-types が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01 / T-02 / T-04 / T-06 / T-07 Acceptance Criteria

**GIVEN** `packages/iam` のソースが実装済みである
**WHEN** `pnpm -F @koma/iam run check-types` を実行する
**THEN** 終了コード 0 で成功する

---

## 追加 Unit Tests（tasks.md 由来）

### TC-022: createUser で id 省略時に自動生成される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** `id` を指定せずに `createUser({ email: 'user@example.com', passwordHash: 'hash', role: 'owner' })` を呼ぶ
**WHEN** 返された User の `id` を確認する
**THEN** `undefined` でなく、文字列の id が自動生成されている

### TC-023: createUser で返される User が frozen である

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** `createUser` で User を生成する
**WHEN** `Object.isFrozen(user)` を確認する
**THEN** `true` を返す（プロパティへの直接代入は silent fail または strict mode では Error）

### TC-024: updateUser で id が保持される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-05

**GIVEN** `createUser` で生成した User（id を保持）
**WHEN** `updateUser(user, { role: 'staff' })` を呼ぶ
**THEN** 返された新 User の `id` が元の User と同一である

### TC-025: updateUser で email を空文字に変更しようとすると Error が throw される

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05

**GIVEN** 有効な email を持つ User が存在する
**WHEN** `updateUser(user, { email: '' })` を呼ぶ
**THEN** Error が throw される（email の非空バリデーションが updateUser でも再適用される）

### TC-026: 空の InMemoryUserRepository で list が空配列を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-08

**GIVEN** `createInMemoryUserRepository()` で新規リポジトリを生成した（保存件数 0）
**WHEN** `list()` を呼ぶ
**THEN** 空配列 `[]` が返される

---

## 統合・公開 API

### TC-027: InMemoryUserRepository が UserRepository 型を満たす

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-07 Acceptance Criteria

**GIVEN** `createInMemoryUserRepository` の戻り値型が `UserRepository` に代入される
**WHEN** `pnpm -F @koma/iam run check-types` を実行する
**THEN** 型エラーが発生しない（`UserRepository` の全メソッド署名を満たす）

### TC-028: src/index.ts から全公開 API が export されている

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-09 Acceptance Criteria

**GIVEN** `packages/iam/src/index.ts` が実装済みである
**WHEN** export 一覧を確認する
**THEN** `Role`, `Permission`, `ALL_PERMISSIONS`, `can`, `User`, `createUser`, `updateUser`, `UserRepository`（type）, `createInMemoryUserRepository` がすべて export されている

### TC-029: pnpm -r check-types && pnpm -r test が全体 green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-09 Acceptance Criteria

**GIVEN** `packages/iam` を含むモノレポが整合した状態にある
**WHEN** `pnpm -r --if-present run check-types && pnpm -r --if-present run test` を実行する
**THEN** 終了コード 0 で成功し、既存パッケージのテストもすべて green のまま維持される

---

## Result

```yaml
result: completed
total: 29
automated: 22
manual: 7
must: 25
should: 4
could: 0
blocked_reasons: []
```
