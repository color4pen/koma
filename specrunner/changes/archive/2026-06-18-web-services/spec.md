# Spec: apps/web にサービス（メニュー）の一覧・登録 管理画面を追加する

## Requirements

### Requirement: parseServiceInput は有効な入力から Service を構築する

`parseServiceInput` は `zod/v4/mini` でフォーム入力を検証し、`durationMinutes`（分）→ `ofMinutes` → `Duration`、`priceYen`（円）→ `createMoney` → `Money` の境界変換を経て、`createService` で `Service` を構築して `{ ok: true, service }` を返す。失敗時はフィールド別エラーを `{ ok: false, errors }` で返す。この関数は純関数であり副作用を持たない。

The function SHALL accept a raw input object with `name`, `durationMinutes`, `priceYen`, and `resourceKinds` fields, validate them, perform boundary conversion to domain VOs, and return a discriminated result.

#### Scenario: 有効な入力で Service が構築される

**Given** `raw` が `{ name: "カット", durationMinutes: "60", priceYen: "5000", resourceKinds: "スタイリスト" }` である
**When** `parseServiceInput(raw)` を呼び出す
**Then** 戻り値は `{ ok: true, service }` であり、`service.name` は `"カット"`、`service.duration.milliseconds` は `3600000`（60分）、`service.price.amount` は `5000`、`service.price.currency` は `"JPY"`、`service.resourceKinds` は `["スタイリスト"]`、`service.id` が定義されている

#### Scenario: resourceKinds が空の場合に空配列で構築される

**Given** `raw` が `{ name: "カット", durationMinutes: "30", priceYen: "3000", resourceKinds: "" }` である
**When** `parseServiceInput(raw)` を呼び出す
**Then** 戻り値は `{ ok: true, service }` であり、`service.resourceKinds` は `[]`

#### Scenario: resourceKinds がカンマ区切りで複数種別に分割される

**Given** `raw` が `{ name: "カット&カラー", durationMinutes: "120", priceYen: "12000", resourceKinds: "スタイリスト, カラーリスト" }` である
**When** `parseServiceInput(raw)` を呼び出す
**Then** 戻り値は `{ ok: true, service }` であり、`service.resourceKinds` は `["スタイリスト", "カラーリスト"]`（各要素が trim 済み）

#### Scenario: priceYen が 0 で構築される（無料メニュー）

**Given** `raw` が `{ name: "無料相談", durationMinutes: "15", priceYen: "0", resourceKinds: "" }` である
**When** `parseServiceInput(raw)` を呼び出す
**Then** 戻り値は `{ ok: true, service }` であり、`service.price.amount` は `0`

### Requirement: parseServiceInput は name が空の場合にエラーを返す

`parseServiceInput` SHALL return `{ ok: false, errors }` with an error entry for `name` when the name field is empty or whitespace-only.

#### Scenario: name が空文字

**Given** `raw` が `{ name: "", durationMinutes: "60", priceYen: "5000", resourceKinds: "" }` である
**When** `parseServiceInput(raw)` を呼び出す
**Then** 戻り値は `{ ok: false, errors }` であり、`errors.name` が 1 件以上のエラーメッセージを含む

#### Scenario: name がスペースのみ

**Given** `raw` が `{ name: "   ", durationMinutes: "60", priceYen: "5000", resourceKinds: "" }` である
**When** `parseServiceInput(raw)` を呼び出す
**Then** 戻り値は `{ ok: false, errors }` であり、`errors.name` が 1 件以上のエラーメッセージを含む

### Requirement: parseServiceInput は不正な durationMinutes でエラーを返す

`parseServiceInput` SHALL return `{ ok: false, errors }` with an error entry for `durationMinutes` when durationMinutes is `0`, negative, a decimal, or a non-numeric string. The zod/mini layer provides user-friendly error messages before `ofMinutes` / `createService` domain invariant enforcement.

#### Scenario: durationMinutes が 0

**Given** `raw` が `{ name: "カット", durationMinutes: "0", priceYen: "5000", resourceKinds: "" }` である
**When** `parseServiceInput(raw)` を呼び出す
**Then** 戻り値は `{ ok: false, errors }` であり、`errors.durationMinutes` が 1 件以上のエラーメッセージを含む

#### Scenario: durationMinutes が負の数

**Given** `raw` が `{ name: "カット", durationMinutes: "-30", priceYen: "5000", resourceKinds: "" }` である
**When** `parseServiceInput(raw)` を呼び出す
**Then** 戻り値は `{ ok: false, errors }` であり、`errors.durationMinutes` が 1 件以上のエラーメッセージを含む

#### Scenario: durationMinutes が小数

**Given** `raw` が `{ name: "カット", durationMinutes: "30.5", priceYen: "5000", resourceKinds: "" }` である
**When** `parseServiceInput(raw)` を呼び出す
**Then** 戻り値は `{ ok: false, errors }` であり、`errors.durationMinutes` が 1 件以上のエラーメッセージを含む

#### Scenario: durationMinutes が非数値文字列

**Given** `raw` が `{ name: "カット", durationMinutes: "abc", priceYen: "5000", resourceKinds: "" }` である
**When** `parseServiceInput(raw)` を呼び出す
**Then** 戻り値は `{ ok: false, errors }` であり、`errors.durationMinutes` が 1 件以上のエラーメッセージを含む

### Requirement: parseServiceInput は不正な priceYen でエラーを返す

`parseServiceInput` SHALL return `{ ok: false, errors }` with an error entry for `priceYen` when priceYen is negative, a decimal, or a non-numeric string. `0` は有効（無料メニュー）。

#### Scenario: priceYen が負の数

**Given** `raw` が `{ name: "カット", durationMinutes: "60", priceYen: "-100", resourceKinds: "" }` である
**When** `parseServiceInput(raw)` を呼び出す
**Then** 戻り値は `{ ok: false, errors }` であり、`errors.priceYen` が 1 件以上のエラーメッセージを含む

#### Scenario: priceYen が小数

**Given** `raw` が `{ name: "カット", durationMinutes: "60", priceYen: "1000.5", resourceKinds: "" }` である
**When** `parseServiceInput(raw)` を呼び出す
**Then** 戻り値は `{ ok: false, errors }` であり、`errors.priceYen` が 1 件以上のエラーメッセージを含む

#### Scenario: priceYen が非数値文字列

**Given** `raw` が `{ name: "カット", durationMinutes: "60", priceYen: "無料", resourceKinds: "" }` である
**When** `parseServiceInput(raw)` を呼び出す
**Then** 戻り値は `{ ok: false, errors }` であり、`errors.priceYen` が 1 件以上のエラーメッセージを含む

### Requirement: createServiceAction は登録成功時に save してパスを再検証する

`createServiceAction` SHALL parse form data via `parseServiceInput`, save the resulting `Service` via `getServiceRepository().save`, and call `revalidatePath('/services')` on success. On parse failure, it SHALL return errors without saving.

#### Scenario: 有効なフォーム送信で Service が保存される

**Given** `FormData` に `name: "カット"`, `durationMinutes: "60"`, `priceYen: "5000"`, `resourceKinds: "スタイリスト"` がセットされている
**When** `createServiceAction` を呼び出す
**Then** `getServiceRepository().save` が呼ばれ、戻り値は `{ ok: true }` である

#### Scenario: 不正なフォーム送信でエラーが返る

**Given** `FormData` に `name: ""`, `durationMinutes: "60"`, `priceYen: "5000"`, `resourceKinds: ""` がセットされている
**When** `createServiceAction` を呼び出す
**Then** `save` は呼ばれず、戻り値は `{ ok: false, errors }` であり `errors.name` が存在する

#### Scenario: 成功時に revalidatePath('/services') が呼ばれる

**Given** `FormData` に有効な値がセットされている
**When** `createServiceAction` を呼び出す
**Then** `revalidatePath` が `'/services'` で呼ばれる

### Requirement: サービス一覧ページは登録済みサービスを表示し登録フォームを提供する

`app/services/page.tsx` SHALL render a list of all services from `getServiceRepository().list()` and include a `ServiceForm` client component for new service registration. The list SHALL display `name`, duration in minutes, price in yen, and `resourceKinds` columns.

#### Scenario: サービスが 0 件のとき空メッセージを表示

**Given** `ServiceRepository` にサービスが保存されていない
**When** `/services` ページを表示する
**Then** 「サービスがありません。」というメッセージと登録フォームが表示される

#### Scenario: サービスが存在するとき一覧テーブルを表示

**Given** `ServiceRepository` に `name: "カット"`, `duration: ofMinutes(60)`, `price: createMoney(5000, 'JPY')`, `resourceKinds: ["スタイリスト"]` のサービスが保存されている
**When** `/services` ページを表示する
**Then** テーブルに「カット」「60分」「5,000円」「スタイリスト」が表示される

### Requirement: composition root は ServiceRepository を単一生成する

`getServiceRepository` SHALL return the same `ServiceRepository` instance across multiple calls within the same process, using the `globalThis` lazy singleton pattern established by `getCustomerRepository` / `getResourceRepository`.

#### Scenario: 複数回呼び出しで同一インスタンスを返す

**Given** `getServiceRepository` が未呼び出しの状態
**When** `getServiceRepository()` を 2 回呼び出す
**Then** 両方の戻り値が同一の参照（`===`）である
