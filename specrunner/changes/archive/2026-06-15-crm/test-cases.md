# Test Cases: crm

<!-- FORMAT REQUIREMENTS:
Test Case heading format: `### TC-{NNN}: {Name}` (3-digit zero-padded, e.g. TC-001)

Required fields per test case:
  **Category**: unit | integration | manual
  **Priority**: must | should | could
  **Source**: reference to spec Scenario (spec.md > Requirement: <name> > Scenario: <name>) or design.md / tasks.md section

GIVEN/WHEN/THEN structure (mixed format — depends on TC type):
  Scenario 由来 TC (Source = spec.md > Requirement: <name> > Scenario: <name>):
    GWT は記述しない。Source 参照のみ。behavior の正典は spec の Scenario。
  非 Scenario 由来 TC (Source = design.md or tasks.md section):
    GWT は必須:
    **GIVEN** <preconditions>
    **WHEN** <action>
    **THEN** <expected result>

Category determination:
  unit        — pure logic, validation, helper functions (automated)
  integration — DB operations, API endpoints, multi-module interaction (automated)
  manual      — UI/UX confirmation, visual verification, build artifact check (not automated)

Priority determination:
  must   — core functionality; if broken, the feature does not work
  should — important but core still works; edge cases, error handling
  could  — nice to have; performance, UX details

Summary section MUST appear immediately after the title with ALL 4 items:
  ## Summary
  - **Total**: {count} cases
  - **Automated** (unit/integration): {count}
  - **Manual**: {count}
  - **Priority**: must: {count}, should: {count}, could: {count}

Result section MUST appear at the very end as a YAML code block:
  ## Result
  ```yaml
  result: completed | partial | failed
  total: {count}
  automated: {count}
  manual: {count}
  must: {count}
  should: {count}
  could: {count}
  blocked_reasons: []
  ```

  result determination:
    completed — all testable behaviors are documented
    partial   — some cases could not be derived due to design ambiguity
    failed    — spec is absent AND design.md / tasks.md are also missing
-->

## Summary

- **Total**: 30 cases
- **Automated** (unit/integration): 25
- **Manual**: 5
- **Priority**: must: 20, should: 9, could: 1

---

## ContactInfo — 構築と不変条件

### TC-001: 電話のみで ContactInfo を構築できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ContactInfo は電話またはメールの少なくとも 1 つを持つ > Scenario: 電話のみで ContactInfo を構築できる

### TC-002: メールのみで ContactInfo を構築できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ContactInfo は電話またはメールの少なくとも 1 つを持つ > Scenario: メールのみで ContactInfo を構築できる

### TC-003: 電話とメールの両方で ContactInfo を構築できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ContactInfo は電話またはメールの少なくとも 1 つを持つ > Scenario: 電話とメールの両方で ContactInfo を構築できる

### TC-004: 電話もメールも無い場合はエラーになる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ContactInfo は電話またはメールの少なくとも 1 つを持つ > Scenario: 電話もメールも無い場合はエラーになる

### TC-005: 空文字は連絡先として認めない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: ContactInfo は電話またはメールの少なくとも 1 つを持つ > Scenario: 空文字は連絡先として認めない

### TC-006: ContactInfo のプロパティを書き換えようとすると失敗する

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: ContactInfo は不変である > Scenario: ContactInfo のプロパティを書き換えようとすると失敗する

### TC-007: null を明示指定した ContactInfo 構築はエラーになる

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02

**GIVEN** `phone` と `email` の両方に `null` を明示指定
**WHEN** `createContactInfo({ phone: null, email: null })` を呼ぶ
**THEN** エラーが投げられる（null は連絡先が無いものとして扱う）

---

## Customer — 構築とデフォルト値

### TC-008: name と contact のみで Customer を構築できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Customer は必須フィールドのみで構築でき、省略フィールドにデフォルト値が設定される > Scenario: name と contact のみで Customer を構築できる

### TC-009: id 省略時に UUID が自動生成される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Customer は必須フィールドのみで構築でき、省略フィールドにデフォルト値が設定される > Scenario: id 省略時に UUID が自動生成される

---

## Customer — customFields

### TC-010: customFields に string 値を格納できる

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: Customer の customFields は値の容れ物として機能する > Scenario: customFields に string 値を格納できる

### TC-011: customFields に number 値を格納できる

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: Customer の customFields は値の容れ物として機能する > Scenario: customFields に number 値を格納できる

### TC-012: customFields に boolean 値を格納できる

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: Customer の customFields は値の容れ物として機能する > Scenario: customFields に boolean 値を格納できる

---

## Customer — immutable 更新

### TC-013: updateCustomer は新しい Customer を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Customer は immutable に更新される > Scenario: updateCustomer は新しい Customer を返す

### TC-014: updateCustomer で tags を変更しても元の tags は変わらない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Customer は immutable に更新される > Scenario: updateCustomer で tags を変更しても元の tags は変わらない

### TC-015: updateCustomer は id を保持する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Customer は immutable に更新される > Scenario: updateCustomer は id を保持する

---

## Customer — frozen object

### TC-016: Customer のプロパティを書き換えようとすると失敗する

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: Customer は frozen object である > Scenario: Customer のプロパティを書き換えようとすると失敗する

### TC-017: Customer の tags に push しようとすると失敗する

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: Customer は frozen object である > Scenario: Customer の tags に push しようとすると失敗する

### TC-018: createCustomer に渡した元配列が呼び出し元で freeze されない

**Category**: unit
**Priority**: should
**Source**: design.md > D2 / tasks.md > T-03

**GIVEN** mutable な string 配列 `originalTags = ["常連"]` を用意する
**WHEN** `createCustomer({ name: "テスト", contact, tags: originalTags })` を呼ぶ
**THEN** `originalTags` は `Object.isFrozen(originalTags) === false` のまま（コピー後 freeze により呼び出し元に副作用が生じない）

---

## CustomerRepository — save / findById

### TC-019: save した Customer を findById で取得できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: CustomerRepository の save / findById は往復可能である > Scenario: save した Customer を findById で取得できる

### TC-020: 未保存の id で findById すると null が返る

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: CustomerRepository の save / findById は往復可能である > Scenario: 未保存の id で findById すると null が返る

---

## CustomerRepository — upsert セマンティクス

### TC-021: 同一 id で 2 回 save すると最新が保持される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: CustomerRepository の save は upsert セマンティクスである > Scenario: 同一 id で 2 回 save すると最新が保持される

---

## CustomerRepository — list

### TC-022: 空の状態で list は空配列を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: CustomerRepository の list は保存された全 Customer を返す > Scenario: 空の状態で list は空配列を返す

### TC-023: 複数の Customer を save した後に list が全件返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: CustomerRepository の list は保存された全 Customer を返す > Scenario: 複数の Customer を save した後に list が全件返す

---

## CustomerRepository — Promise シグネチャ

### TC-024: CustomerRepository の全メソッドが Promise<T> を返す

**Category**: unit
**Priority**: must
**Source**: design.md > D5

**GIVEN** `createInMemoryCustomerRepository()` で生成したリポジトリ
**WHEN** `save` / `findById` / `list` を呼ぶ
**THEN** 各メソッドの戻り値が `instanceof Promise === true` である（後続 Drizzle アダプタとの port 契約互換性を確保）

---

## パッケージ設定 / 公開 API

### TC-025: package.json の name・禁止依存・scripts が正しい

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `packages/crm/package.json` が作成された状態
**WHEN** ファイルを確認する
**THEN** `name` が `"@koma/crm"`、`private: true`、`type: "module"`、`exports` が `{ ".": "./src/index.ts" }` であり、`grep -E '"(next|react|drizzle-orm|zod)"'` が 0 件

### TC-026: @koma/shared が workspace:* で dependencies に存在する

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `packages/crm/package.json` が作成された状態
**WHEN** `dependencies` を確認する
**THEN** `"@koma/shared": "workspace:*"` が存在する

### TC-027: pnpm -F @koma/crm run lint が成功する

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-01

**GIVEN** `packages/crm/eslint.config.js` が `@koma/shared` と同一構成で作成された状態
**WHEN** `pnpm -F @koma/crm run lint` を実行する
**THEN** エラーなく終了する

### TC-028: src/index.ts から全公開型・関数が import 可能

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** `packages/crm/src/index.ts` に re-export が追加された状態
**WHEN** `pnpm -F @koma/crm run check-types` を実行する（import 可能性は型チェックで検証）
**THEN** `Customer`, `ContactInfo`, `CustomerRepository`, `CustomFieldValue`, `createCustomer`, `updateCustomer`, `createContactInfo`, `createInMemoryCustomerRepository` が全て型エラーなしで import できる

### TC-029: pnpm -r check-types && pnpm -r test が全パッケージ green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-06

**GIVEN** `packages/crm` と `packages/shared` が両方存在する状態
**WHEN** `pnpm -r --if-present run check-types && pnpm -r --if-present run test` を実行する
**THEN** 全パッケージのチェック・テストが green で終了する（既存 shared を含めた workspace 全体の健全性確認）

---

## 設計境界 — ドメイン純粋性

### TC-030: ContactInfo のフォーマット検証はしない

**Category**: unit
**Priority**: could
**Source**: design.md > D3

**GIVEN** フォーマットが不正な文字列（例: `"not-a-phone"`, `"not-an-email"`）
**WHEN** `createContactInfo({ phone: "not-a-phone" })` を呼ぶ
**THEN** エラーは投げられず ContactInfo が返る（フォーマット検証は delivery 境界の責務であり、ドメインは構造不変条件のみを守る）

---

## Result

```yaml
result: completed
total: 30
automated: 25
manual: 5
must: 20
should: 9
could: 1
blocked_reasons: []
```
