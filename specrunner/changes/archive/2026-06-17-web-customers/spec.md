# Spec: web-customers

## Requirements

### Requirement: parseCustomerInput は有効な入力からドメイン Customer を構築する

`parseCustomerInput` は `zod/mini` スキーマで入力を検証し、成功時に `createContactInfo` と `createCustomer` を経由してドメイン `Customer` を構築して返す MUST。戻り値は `{ ok: true; customer: Customer }` の形式とする。

#### Scenario: 名前と電話番号のみで Customer を構築できる

**Given** `{ name: "山田太郎", phone: "090-1234-5678" }` が入力として与えられる
**When** `parseCustomerInput(input)` を呼ぶ
**Then** `ok` が `true` であり、`customer.name` が `"山田太郎"`、`customer.contact.phone` が `"090-1234-5678"`、`customer.contact.email` が `null` である

#### Scenario: 名前とメールのみで Customer を構築できる

**Given** `{ name: "山田太郎", email: "test@example.com" }` が入力として与えられる
**When** `parseCustomerInput(input)` を呼ぶ
**Then** `ok` が `true` であり、`customer.name` が `"山田太郎"`、`customer.contact.email` が `"test@example.com"`、`customer.contact.phone` が `null` である

#### Scenario: 名前・電話・メール全てで Customer を構築できる

**Given** `{ name: "山田太郎", phone: "090-1234-5678", email: "test@example.com" }` が入力として与えられる
**When** `parseCustomerInput(input)` を呼ぶ
**Then** `ok` が `true` であり、`customer.contact.phone` と `customer.contact.email` の両方が設定されている

#### Scenario: 構築された Customer は createCustomer 経由で生成される

**Given** 有効な入力 `{ name: "山田太郎", phone: "090-1234-5678" }` が与えられる
**When** `parseCustomerInput(input)` を呼ぶ
**Then** 返された `customer` は `Id<'Customer'>` を持ち、`tags` は空配列、`notes` は空文字、`customFields` は空オブジェクトである（`createCustomer` のデフォルト値）

---

### Requirement: parseCustomerInput は名前が空の場合にエラーを返す

名前が空文字またはスペースのみの場合、`parseCustomerInput` は MUST `{ ok: false; errors }` を返し、`errors` に `name` フィールドのエラーメッセージを含める。

#### Scenario: 名前が空文字の場合はエラーを返す

**Given** `{ name: "", phone: "090-1234-5678" }` が入力として与えられる
**When** `parseCustomerInput(input)` を呼ぶ
**Then** `ok` が `false` であり、`errors` オブジェクトに `name` キーが存在し、エラーメッセージの配列を含む

#### Scenario: 名前がスペースのみの場合はエラーを返す

**Given** `{ name: "   ", phone: "090-1234-5678" }` が入力として与えられる
**When** `parseCustomerInput(input)` を呼ぶ
**Then** `ok` が `false` であり、`errors` に `name` フィールドのエラーが含まれる

---

### Requirement: parseCustomerInput は電話・メールが両方欠落している場合にエラーを返す

電話番号とメールアドレスの両方が未指定または空文字の場合、`parseCustomerInput` は MUST `{ ok: false; errors }` を返す。

#### Scenario: 電話もメールも未指定の場合はエラーを返す

**Given** `{ name: "山田太郎" }` が入力として与えられる（phone / email なし）
**When** `parseCustomerInput(input)` を呼ぶ
**Then** `ok` が `false` であり、`errors` に連絡先に関するエラーが含まれる

#### Scenario: 電話もメールも空文字の場合はエラーを返す

**Given** `{ name: "山田太郎", phone: "", email: "" }` が入力として与えられる
**When** `parseCustomerInput(input)` を呼ぶ
**Then** `ok` が `false` であり、`errors` に連絡先に関するエラーが含まれる

---

### Requirement: composition root は単一の CustomerRepository インスタンスを提供する

`getCustomerRepository()` は呼び出しごとに同一の `CustomerRepository` インスタンスを返す MUST。具象生成（`createInMemoryCustomerRepository`）はこのモジュールの 1 箇所のみで行われる。

#### Scenario: 複数回呼び出しで同一インスタンスが返る

**Given** `getCustomerRepository()` を 2 回呼び出す
**When** 返されたインスタンスを比較する
**Then** 同一の参照（`===`）である

#### Scenario: 1 回目の呼び出しで save したデータが 2 回目の呼び出しで取得できる

**Given** `getCustomerRepository()` で repo を取得し、Customer を `save` する
**When** 再度 `getCustomerRepository()` で repo を取得し `list()` を呼ぶ
**Then** save した Customer が一覧に含まれる

---

### Requirement: createCustomerAction は有効な入力で Customer を保存し一覧を revalidate する

`createCustomerAction` server action は `parseCustomerInput` で検証し、成功時に composition root の repo に `save` し、`/customers` を revalidate する MUST。失敗時はエラーを返しデータを保存しない。

#### Scenario: 有効な FormData で Customer が保存される

**Given** name=`"山田太郎"` / phone=`"090-1234-5678"` を含む FormData
**When** `createCustomerAction(null, formData)` を呼ぶ
**Then** 戻り値の `ok` が `true` であり、`getCustomerRepository().list()` に該当 Customer が含まれる

#### Scenario: 無効な FormData でエラーが返りデータは保存されない

**Given** name=`""` / phone=`"090-1234-5678"` を含む FormData
**When** `createCustomerAction(null, formData)` を呼ぶ
**Then** 戻り値の `ok` が `false` であり、`errors` にフィールドエラーが含まれ、`getCustomerRepository().list()` は変更されない

---

### Requirement: 顧客一覧ページは登録済み顧客を表示し登録フォームを提供する

`app/customers/page.tsx` は server component として composition root の repo から `list()` で顧客一覧を取得して表示し、`CustomerForm` client component を含む MUST。

#### Scenario: 登録済み顧客が一覧に表示される

**Given** composition root の repo に Customer `{ name: "山田太郎", contact: { phone: "090-1234-5678", email: null } }` が保存されている
**When** `/customers` ページを描画する
**Then** ページ内に `"山田太郎"` と `"090-1234-5678"` が表示される

#### Scenario: 顧客が 0 件の場合は空状態が表示される

**Given** composition root の repo が空である
**When** `/customers` ページを描画する
**Then** ページ内に顧客が存在しないことを示すメッセージが表示される

#### Scenario: 登録フォームがページに含まれる

**Given** `/customers` ページを描画する
**When** ページの構成を確認する
**Then** 名前・電話番号・メールアドレスの入力フィールドと送信ボタンが含まれる
