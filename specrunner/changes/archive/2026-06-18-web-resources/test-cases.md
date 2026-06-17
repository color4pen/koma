# Test Cases: apps/web にリソースの一覧・登録 管理画面を追加する

## Summary

- **Total**: 33 cases
- **Automated** (unit/integration): 18
- **Manual**: 15
- **Priority**: must: 28, should: 4, could: 1

---

## parseResourceInput — 有効入力

### TC-001: 有効な入力で Resource が構築される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseResourceInput は有効な入力から Resource を構築する > Scenario: 有効な入力で Resource が構築される

### TC-002: capacity 省略時にデフォルト値 1 で構築される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseResourceInput は有効な入力から Resource を構築する > Scenario: capacity 省略時にデフォルト値 1 で構築される

### TC-003: capacity が文字列 "1" で正常に変換される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseResourceInput は有効な入力から Resource を構築する > Scenario: capacity が文字列 "1" で正常に変換される

---

## parseResourceInput — name バリデーション

### TC-004: name が空文字のときエラーを返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseResourceInput は name が空の場合にエラーを返す > Scenario: name が空文字

### TC-005: name がスペースのみのときエラーを返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseResourceInput は name が空の場合にエラーを返す > Scenario: name がスペースのみ

---

## parseResourceInput — kind バリデーション

### TC-006: kind が空文字のときエラーを返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseResourceInput は kind が空の場合にエラーを返す > Scenario: kind が空文字

---

## parseResourceInput — capacity バリデーション

### TC-007: capacity が 0 のときエラーを返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseResourceInput は不正な capacity でエラーを返す > Scenario: capacity が 0

### TC-008: capacity が負の数のときエラーを返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseResourceInput は不正な capacity でエラーを返す > Scenario: capacity が負の数

### TC-009: capacity が小数のときエラーを返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseResourceInput は不正な capacity でエラーを返す > Scenario: capacity が小数

### TC-010: capacity が非数値文字列のときエラーを返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseResourceInput は不正な capacity でエラーを返す > Scenario: capacity が非数値文字列

---

## parseResourceInput — 追加エッジケース

### TC-011: 返された Resource が id フィールドを持つ

**Category**: unit
**Priority**: must
**Source**: tasks.md#T-04

**GIVEN** `raw` が `{ name: "田中", kind: "スタイリスト", capacity: "1" }` である  
**WHEN** `parseResourceInput(raw)` を呼び出す  
**THEN** 戻り値は `{ ok: true, resource }` であり、`resource.id` が `undefined` でない

### TC-012: name の前後空白がトリムされた値で Resource を構築する

**Category**: unit
**Priority**: should
**Source**: tasks.md#T-04

**GIVEN** `raw` が `{ name: "  田中  ", kind: "スタイリスト", capacity: "1" }` である  
**WHEN** `parseResourceInput(raw)` を呼び出す  
**THEN** 戻り値は `{ ok: true, resource }` であり、`resource.name` は `"田中"`（前後の空白なし）

### TC-013: raw が文字列のとき ok: false を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md#T-04

**GIVEN** `raw` が文字列 `"not-an-object"` である  
**WHEN** `parseResourceInput(raw)` を呼び出す  
**THEN** 戻り値は `{ ok: false }` である

### TC-014: raw が null のとき ok: false を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md#T-04

**GIVEN** `raw` が `null` である  
**WHEN** `parseResourceInput(raw)` を呼び出す  
**THEN** 戻り値は `{ ok: false }` である

---

## createResourceAction — サーバーアクション

### TC-015: 有効なフォーム送信で Resource が保存される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: createResourceAction は登録成功時に save してパスを再検証する > Scenario: 有効なフォーム送信で Resource が保存される

### TC-016: 不正なフォーム送信でエラーが返り save が呼ばれない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: createResourceAction は登録成功時に save してパスを再検証する > Scenario: 不正なフォーム送信でエラーが返る

### TC-017: 成功時に revalidatePath('/resources') が呼ばれる

**Category**: integration
**Priority**: must
**Source**: tasks.md#T-05

**GIVEN** `FormData` に有効な `name`, `kind`, `capacity` がセットされている  
**WHEN** `createResourceAction` を呼び出す  
**THEN** `revalidatePath('/resources')` が呼ばれ、ページキャッシュが再検証される

### TC-018: 'use server' ディレクティブが先頭に存在する

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-05

**GIVEN** `apps/web/app/resources/actions.ts` ファイルが作成されている  
**WHEN** ファイルの先頭を確認する  
**THEN** `'use server'` ディレクティブが宣言されており、Next.js のサーバーアクションとして機能する

---

## page.tsx — リソース一覧ページ

### TC-019: リソースが 0 件のとき空メッセージを表示

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: リソース一覧ページは登録済みリソースを表示し登録フォームを提供する > Scenario: リソースが 0 件のとき空メッセージを表示

### TC-020: リソースが存在するとき一覧テーブルを表示

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: リソース一覧ページは登録済みリソースを表示し登録フォームを提供する > Scenario: リソースが存在するとき一覧テーブルを表示

### TC-021: page.tsx が server component である

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-07

**GIVEN** `apps/web/app/resources/page.tsx` ファイルが作成されている  
**WHEN** ファイルの先頭を確認する  
**THEN** `'use client'` ディレクティブが存在せず、サーバーコンポーネントとして動作する

### TC-022: テーブルカラム「名前」「種別」「同時受付数」が存在する

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-07

**GIVEN** `apps/web/app/resources/page.tsx` が実装されている  
**WHEN** リソースが 1 件以上ある状態でページを表示する  
**THEN** テーブルには「名前」「種別」「同時受付数」の 3 カラムが表示される

---

## resource-form.tsx — クライアントフォーム

### TC-023: 'use client' ディレクティブが先頭に存在する

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-06

**GIVEN** `apps/web/app/resources/resource-form.tsx` ファイルが作成されている  
**WHEN** ファイルの先頭を確認する  
**THEN** `'use client'` ディレクティブが宣言されており、クライアントコンポーネントとして機能する

### TC-024: capacity input が type="number" min="1" step="1" defaultValue="1" を持つ

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-06

**GIVEN** `resource-form.tsx` が実装されている  
**WHEN** フォームの capacity フィールドを確認する  
**THEN** `<input type="number" min="1" step="1" defaultValue="1">` として実装されており、ユーザーが正整数のみ入力できる

### TC-025: 成功時に「登録が完了しました。」メッセージを表示する

**Category**: manual
**Priority**: should
**Source**: tasks.md#T-06

**GIVEN** `createResourceAction` が `{ ok: true }` を返す状態である  
**WHEN** フォームを送信する  
**THEN** 「登録が完了しました。」メッセージがフォーム上に表示される

### TC-026: isPending 中に「登録中...」を表示する

**Category**: manual
**Priority**: could
**Source**: tasks.md#T-06

**GIVEN** フォームの送信が処理中（`isPending === true`）の状態である  
**WHEN** フォームが送信状態にある  
**THEN** 送信ボタンのテキストが「登録中...」に変わり、ユーザーへの処理中フィードバックが提供される

---

## composition-root — シングルトン

### TC-027: 複数回呼び出しで同一インスタンスを返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: composition root は ResourceRepository を単一生成する > Scenario: 複数回呼び出しで同一インスタンスを返す

### TC-028: createInMemoryResourceRepository の呼び出しが composition-root.ts 内の 1 箇所のみ

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-02

**GIVEN** `apps/web/lib/composition-root.ts` が実装されている  
**WHEN** ファイル内の `createInMemoryResourceRepository` 呼び出し箇所を数える  
**THEN** `createInMemoryResourceRepository()` の呼び出しは 1 箇所のみであり、後続の Drizzle 永続化切り替えが最小差し替えで完了できる

---

## 依存関係

### TC-029: @koma/resource が apps/web/package.json の dependencies に存在する

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-01

**GIVEN** T-01 が完了している  
**WHEN** `apps/web/package.json` の `dependencies` を確認する  
**THEN** `"@koma/resource": "workspace:*"` が存在する

### TC-030: drizzle-orm が apps/web/package.json に含まれない

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-01

**GIVEN** T-01 が完了している  
**WHEN** `grep -E '"drizzle-orm"' apps/web/package.json` を実行する  
**THEN** 0 件（drizzle-orm は本スライスのスコープ外であり、後続スライスで追加する）

---

## ビルド・型チェック・テスト

### TC-031: pnpm -r run check-types が green

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-08

**GIVEN** 全タスクが実装済みである  
**WHEN** `pnpm -r --if-present run check-types` を実行する  
**THEN** 全パッケージで型エラーがなく green で終了する

### TC-032: pnpm -r run test が green

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-08

**GIVEN** 全タスクが実装済みである  
**WHEN** `pnpm -r --if-present run test` を実行する  
**THEN** `parse-resource-input.test.ts` を含む全テストが green で終了する

### TC-033: pnpm -F web run build（next build）が成功する

**Category**: manual
**Priority**: must
**Source**: tasks.md#T-08

**GIVEN** 全タスクが実装済みである  
**WHEN** `pnpm -F web run build` を実行する  
**THEN** Next.js のビルドがエラーなく成功する

---

## Result

```yaml
result: completed
total: 33
automated: 18
manual: 15
must: 28
should: 4
could: 1
blocked_reasons: []
```
