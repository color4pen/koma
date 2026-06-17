# Spec: apps/web にリソースの一覧・登録 管理画面を追加する

## Requirements

### Requirement: parseResourceInput は有効な入力から Resource を構築する

`parseResourceInput` は `zod/v4/mini` でフォーム入力を検証し、成功時に `createResource` 経由で `Resource` を構築して `{ ok: true, resource }` を返す。失敗時はフィールド別エラーを `{ ok: false, errors }` で返す。この関数は純関数であり副作用を持たない。

The function SHALL accept a raw input object with `name`, `kind`, and `capacity` fields, validate them, and return a discriminated result.

#### Scenario: 有効な入力で Resource が構築される

**Given** `raw` が `{ name: "スタイリスト田中", kind: "スタイリスト", capacity: "3" }` である
**When** `parseResourceInput(raw)` を呼び出す
**Then** 戻り値は `{ ok: true, resource }` であり、`resource.name` は `"スタイリスト田中"`、`resource.kind` は `"スタイリスト"`、`resource.capacity` は `3`（数値）、`resource.id` が定義されている

#### Scenario: capacity 省略時にデフォルト値 1 で構築される

**Given** `raw` が `{ name: "個室A", kind: "個室" }` であり `capacity` が未指定
**When** `parseResourceInput(raw)` を呼び出す
**Then** 戻り値は `{ ok: true, resource }` であり、`resource.capacity` は `1`

#### Scenario: capacity が文字列 "1" で正常に変換される

**Given** `raw` が `{ name: "席A", kind: "席", capacity: "1" }` である
**When** `parseResourceInput(raw)` を呼び出す
**Then** 戻り値は `{ ok: true, resource }` であり、`resource.capacity` は `1`（数値）

### Requirement: parseResourceInput は name が空の場合にエラーを返す

`parseResourceInput` SHALL return `{ ok: false, errors }` with an error entry for `name` when the name field is empty or whitespace-only.

#### Scenario: name が空文字

**Given** `raw` が `{ name: "", kind: "スタイリスト", capacity: "1" }` である
**When** `parseResourceInput(raw)` を呼び出す
**Then** 戻り値は `{ ok: false, errors }` であり、`errors.name` が 1 件以上のエラーメッセージを含む

#### Scenario: name がスペースのみ

**Given** `raw` が `{ name: "   ", kind: "スタイリスト", capacity: "1" }` である
**When** `parseResourceInput(raw)` を呼び出す
**Then** 戻り値は `{ ok: false, errors }` であり、`errors.name` が 1 件以上のエラーメッセージを含む

### Requirement: parseResourceInput は kind が空の場合にエラーを返す

`parseResourceInput` SHALL return `{ ok: false, errors }` with an error entry for `kind` when the kind field is empty or whitespace-only.

#### Scenario: kind が空文字

**Given** `raw` が `{ name: "田中", kind: "", capacity: "1" }` である
**When** `parseResourceInput(raw)` を呼び出す
**Then** 戻り値は `{ ok: false, errors }` であり、`errors.kind` が 1 件以上のエラーメッセージを含む

### Requirement: parseResourceInput は不正な capacity でエラーを返す

`parseResourceInput` SHALL return `{ ok: false, errors }` with an error entry for `capacity` when capacity is `0`, negative, a decimal, or a non-numeric string. The zod/mini layer provides user-friendly error messages before `createResource` domain invariant enforcement.

#### Scenario: capacity が 0

**Given** `raw` が `{ name: "田中", kind: "スタイリスト", capacity: "0" }` である
**When** `parseResourceInput(raw)` を呼び出す
**Then** 戻り値は `{ ok: false, errors }` であり、`errors.capacity` が 1 件以上のエラーメッセージを含む

#### Scenario: capacity が負の数

**Given** `raw` が `{ name: "田中", kind: "スタイリスト", capacity: "-1" }` である
**When** `parseResourceInput(raw)` を呼び出す
**Then** 戻り値は `{ ok: false, errors }` であり、`errors.capacity` が 1 件以上のエラーメッセージを含む

#### Scenario: capacity が小数

**Given** `raw` が `{ name: "田中", kind: "スタイリスト", capacity: "1.5" }` である
**When** `parseResourceInput(raw)` を呼び出す
**Then** 戻り値は `{ ok: false, errors }` であり、`errors.capacity` が 1 件以上のエラーメッセージを含む

#### Scenario: capacity が非数値文字列

**Given** `raw` が `{ name: "田中", kind: "スタイリスト", capacity: "abc" }` である
**When** `parseResourceInput(raw)` を呼び出す
**Then** 戻り値は `{ ok: false, errors }` であり、`errors.capacity` が 1 件以上のエラーメッセージを含む

### Requirement: createResourceAction は登録成功時に save してパスを再検証する

`createResourceAction` SHALL parse form data via `parseResourceInput`, save the resulting `Resource` via `getResourceRepository().save`, and call `revalidatePath('/resources')` on success. On parse failure, it SHALL return errors without saving.

#### Scenario: 有効なフォーム送信で Resource が保存される

**Given** `FormData` に `name: "田中"`, `kind: "スタイリスト"`, `capacity: "2"` がセットされている
**When** `createResourceAction` を呼び出す
**Then** `getResourceRepository().save` が呼ばれ、戻り値は `{ ok: true }` である

#### Scenario: 不正なフォーム送信でエラーが返る

**Given** `FormData` に `name: ""`, `kind: "スタイリスト"`, `capacity: "1"` がセットされている
**When** `createResourceAction` を呼び出す
**Then** `save` は呼ばれず、戻り値は `{ ok: false, errors }` であり `errors.name` が存在する

### Requirement: リソース一覧ページは登録済みリソースを表示し登録フォームを提供する

`app/resources/page.tsx` SHALL render a list of all resources from `getResourceRepository().list()` and include a `ResourceForm` client component for new resource registration. The list SHALL display `name`, `kind`, `capacity` columns.

#### Scenario: リソースが 0 件のとき空メッセージを表示

**Given** `ResourceRepository` にリソースが保存されていない
**When** `/resources` ページを表示する
**Then** 「リソースがありません。」というメッセージと登録フォームが表示される

#### Scenario: リソースが存在するとき一覧テーブルを表示

**Given** `ResourceRepository` に `name: "田中"`, `kind: "スタイリスト"`, `capacity: 2` のリソースが保存されている
**When** `/resources` ページを表示する
**Then** テーブルに「田中」「スタイリスト」「2」が表示される

### Requirement: composition root は ResourceRepository を単一生成する

`getResourceRepository` SHALL return the same `ResourceRepository` instance across multiple calls within the same process, using the `globalThis` lazy singleton pattern established by `getCustomerRepository`.

#### Scenario: 複数回呼び出しで同一インスタンスを返す

**Given** `getResourceRepository` が未呼び出しの状態
**When** `getResourceRepository()` を 2 回呼び出す
**Then** 両方の戻り値が同一の参照（`===`）である
