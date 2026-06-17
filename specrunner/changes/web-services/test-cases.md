# Test Cases: apps/web にサービス（メニュー）の一覧・登録 管理画面を追加する

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

- **Total**: 29 cases
- **Automated** (unit/integration): 21
- **Manual**: 8
- **Priority**: must: 14, should: 13, could: 2

---

## parseServiceInput — 有効入力

### TC-001: 有効な入力で Service が構築される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseServiceInput は有効な入力から Service を構築する > Scenario: 有効な入力で Service が構築される

### TC-002: resourceKinds が空の場合に空配列で構築される

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: parseServiceInput は有効な入力から Service を構築する > Scenario: resourceKinds が空の場合に空配列で構築される

### TC-003: resourceKinds がカンマ区切りで複数種別に分割される

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: parseServiceInput は有効な入力から Service を構築する > Scenario: resourceKinds がカンマ区切りで複数種別に分割される

### TC-004: priceYen が 0 で構築される（無料メニュー）

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: parseServiceInput は有効な入力から Service を構築する > Scenario: priceYen が 0 で構築される（無料メニュー）

### TC-005: 返された Service は id を持つ

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** `raw` が `{ name: "カット", durationMinutes: "60", priceYen: "5000", resourceKinds: "" }` である
**WHEN** `parseServiceInput(raw)` を呼び出す
**THEN** 戻り値は `{ ok: true, service }` であり、`service.id` が定義されており（`undefined` でない）

### TC-006: name の前後の空白が trim された Service が構築される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** `raw` が `{ name: "  カット  ", durationMinutes: "60", priceYen: "5000", resourceKinds: "" }` である
**WHEN** `parseServiceInput(raw)` を呼び出す
**THEN** 戻り値は `{ ok: true, service }` であり、`service.name` は `"カット"`（前後の空白が除去されている）

---

## parseServiceInput — name バリデーション

### TC-007: name が空文字でエラーを返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseServiceInput は name が空の場合にエラーを返す > Scenario: name が空文字

### TC-008: name がスペースのみでエラーを返す

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: parseServiceInput は name が空の場合にエラーを返す > Scenario: name がスペースのみ

---

## parseServiceInput — durationMinutes バリデーション

### TC-009: durationMinutes が 0 でエラーを返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseServiceInput は不正な durationMinutes でエラーを返す > Scenario: durationMinutes が 0

### TC-010: durationMinutes が負の数でエラーを返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseServiceInput は不正な durationMinutes でエラーを返す > Scenario: durationMinutes が負の数

### TC-011: durationMinutes が小数でエラーを返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseServiceInput は不正な durationMinutes でエラーを返す > Scenario: durationMinutes が小数

### TC-012: durationMinutes が非数値文字列でエラーを返す

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: parseServiceInput は不正な durationMinutes でエラーを返す > Scenario: durationMinutes が非数値文字列

---

## parseServiceInput — priceYen バリデーション

### TC-013: priceYen が負の数でエラーを返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseServiceInput は不正な priceYen でエラーを返す > Scenario: priceYen が負の数

### TC-014: priceYen が小数でエラーを返す

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: parseServiceInput は不正な priceYen でエラーを返す > Scenario: priceYen が小数

### TC-015: priceYen が非数値文字列でエラーを返す

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: parseServiceInput は不正な priceYen でエラーを返す > Scenario: priceYen が非数値文字列

---

## parseServiceInput — 型ガード

### TC-016: raw が文字列の場合に ok: false を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** `raw` が文字列 `"invalid"` である
**WHEN** `parseServiceInput(raw)` を呼び出す
**THEN** 戻り値は `{ ok: false, errors }` である

### TC-017: raw が null の場合に ok: false を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04

**GIVEN** `raw` が `null` である
**WHEN** `parseServiceInput(raw)` を呼び出す
**THEN** 戻り値は `{ ok: false, errors }` である

---

## createServiceAction

### TC-018: 有効なフォーム送信で Service が保存される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: createServiceAction は登録成功時に save してパスを再検証する > Scenario: 有効なフォーム送信で Service が保存される

### TC-019: 不正なフォーム送信でエラーが返り save が呼ばれない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: createServiceAction は登録成功時に save してパスを再検証する > Scenario: 不正なフォーム送信でエラーが返る

### TC-020: 成功時に revalidatePath('/services') が呼ばれる

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: createServiceAction は登録成功時に save してパスを再検証する > Scenario: 成功時に revalidatePath('/services') が呼ばれる

---

## サービス一覧ページ

### TC-021: サービスが 0 件のとき空メッセージと登録フォームを表示

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: サービス一覧ページは登録済みサービスを表示し登録フォームを提供する > Scenario: サービスが 0 件のとき空メッセージを表示

### TC-022: サービスが存在するとき一覧テーブルを表示

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: サービス一覧ページは登録済みサービスを表示し登録フォームを提供する > Scenario: サービスが存在するとき一覧テーブルを表示

---

## composition root

### TC-023: 複数回呼び出しで同一 ServiceRepository インスタンスを返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: composition root は ServiceRepository を単一生成する > Scenario: 複数回呼び出しで同一インスタンスを返す

---

## 依存・パッケージ構成

### TC-024: @koma/catalog が依存に存在し drizzle-orm が含まれない

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `apps/web/package.json` が存在する
**WHEN** `grep -E '"@koma/catalog"' apps/web/package.json` および `grep -E '"drizzle-orm"' apps/web/package.json` を実行する
**THEN** `@koma/catalog` が 1 件以上ヒットし、`drizzle-orm` が 0 件である

---

## service-form.tsx（クライアントコンポーネント）

### TC-025: フォームフィールドの型・制約属性が正しく設定されている

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** `/services` ページを開き登録フォームを表示する
**WHEN** ブラウザの DevTools でフォームフィールドの属性を確認する
**THEN** `durationMinutes` の input は `type="number"` かつ `min="1"` `step="1"`、`priceYen` の input は `type="number"` かつ `min="0"` `step="1"` である

### TC-026: フォームのエラー表示と成功メッセージが動作する

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-07

**GIVEN** `/services` ページを開く
**WHEN** `name` を空のまま送信し、次に有効な値で送信する
**THEN** 空送信時はフィールド下に `name` のエラーメッセージが表示され、有効送信時は「登録が完了しました。」が表示される

---

## page.tsx — 表示フォーマット

### TC-027: 所要時間と料金が読みやすいフォーマットで表示される

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-08

**GIVEN** `ServiceRepository` に `duration: ofMinutes(60)`, `price: createMoney(5000, 'JPY')` のサービスが保存されている
**WHEN** `/services` ページを表示する
**THEN** 一覧テーブルの所要時間カラムに「60分」、料金カラムに「5,000円」と表示される

### TC-028: resourceKinds がカンマ区切りで結合して表示される

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-08

**GIVEN** `ServiceRepository` に `resourceKinds: ["スタイリスト", "カラーリスト"]` のサービスが保存されている
**WHEN** `/services` ページを表示する
**THEN** 対応リソース種別カラムに「スタイリスト, カラーリスト」と表示される（`join(', ')` 結果）

---

## ビルド・型チェック・テスト全体

### TC-029: ビルド・型チェック・テストが全て green になる

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-09

**GIVEN** 全実装が完了した状態である
**WHEN** `pnpm -r --if-present run check-types && pnpm -r --if-present run test && pnpm -r --if-present run build` を実行する
**THEN** コマンドが 0 exit で完了し、エラーが出力されない

---

## Result

```yaml
result: completed
total: 29
automated: 21
manual: 8
must: 14
should: 13
could: 2
blocked_reasons: []
```
