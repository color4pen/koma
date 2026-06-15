# Spec: crm

## Requirements

### Requirement: ContactInfo は電話またはメールの少なくとも 1 つを持つ

ContactInfo は値オブジェクトであり、電話番号とメールアドレスのうち少なくとも 1 つを MUST 保持する。両方が欠落した ContactInfo の構築は拒否する。

#### Scenario: 電話のみで ContactInfo を構築できる

**Given** 電話番号 `"090-1234-5678"` が与えられ、メールは省略
**When** `createContactInfo({ phone: "090-1234-5678" })` を呼ぶ
**Then** `phone` が `"090-1234-5678"`、`email` が `null` の ContactInfo が返る

#### Scenario: メールのみで ContactInfo を構築できる

**Given** メールアドレス `"test@example.com"` が与えられ、電話は省略
**When** `createContactInfo({ email: "test@example.com" })` を呼ぶ
**Then** `phone` が `null`、`email` が `"test@example.com"` の ContactInfo が返る

#### Scenario: 電話とメールの両方で ContactInfo を構築できる

**Given** 電話番号とメールアドレスの両方が与えられる
**When** `createContactInfo({ phone: "090-1234-5678", email: "test@example.com" })` を呼ぶ
**Then** 両方のフィールドが設定された ContactInfo が返る

#### Scenario: 電話もメールも無い場合はエラーになる

**Given** 電話番号もメールアドレスも与えられない
**When** `createContactInfo({})` を呼ぶ
**Then** エラーが投げられる

#### Scenario: 空文字は連絡先として認めない

**Given** 電話番号とメールアドレスが両方空文字で与えられる
**When** `createContactInfo({ phone: "", email: "" })` を呼ぶ
**Then** エラーが投げられる（空文字は連絡先が無いものとして扱う）

---

### Requirement: ContactInfo は不変である

ContactInfo は生成後に変更不可 SHALL be immutable。プロパティへの代入は失敗する。

#### Scenario: ContactInfo のプロパティを書き換えようとすると失敗する

**Given** `createContactInfo({ phone: "090-1234-5678" })` で生成した ContactInfo
**When** `contactInfo.phone = "080-0000-0000"` を試みる
**Then** strict mode でエラーが投げられる（frozen object）

---

### Requirement: Customer は必須フィールドのみで構築でき、省略フィールドにデフォルト値が設定される

Customer の構築時に `name` と `contact` は MUST 必須。`id` / `tags` / `notes` / `customFields` は省略可能で、デフォルト値が設定される。

#### Scenario: name と contact のみで Customer を構築できる

**Given** name `"山田太郎"` と、電話のみの ContactInfo
**When** `createCustomer({ name: "山田太郎", contact })` を呼ぶ
**Then** `name` が `"山田太郎"`、`contact` が指定値、`tags` が空配列、`notes` が空文字、`customFields` が空オブジェクトの Customer が返る

#### Scenario: id 省略時に UUID が自動生成される

**Given** `id` を指定せずに Customer を構築
**When** `createCustomer({ name: "山田太郎", contact })` を呼ぶ
**Then** 返された Customer の `id` は UUID v4 形式の文字列である

---

### Requirement: Customer の customFields は値の容れ物として機能する

customFields は string / number / boolean の値を MUST 格納できる。スキーマ定義・検証は行わない。

#### Scenario: customFields に string 値を格納できる

**Given** customFields `{ "担当者": "佐藤" }` を指定して Customer を構築
**When** `customer.customFields["担当者"]` を参照する
**Then** `"佐藤"` が返る

#### Scenario: customFields に number 値を格納できる

**Given** customFields `{ "来店回数": 5 }` を指定して Customer を構築
**When** `customer.customFields["来店回数"]` を参照する
**Then** `5` が返る

#### Scenario: customFields に boolean 値を格納できる

**Given** customFields `{ "VIP": true }` を指定して Customer を構築
**When** `customer.customFields["VIP"]` を参照する
**Then** `true` が返る

---

### Requirement: Customer は immutable に更新される

Customer の更新は新しいインスタンスを返し、元のインスタンスを MUST NOT 変更する。

#### Scenario: updateCustomer は新しい Customer を返す

**Given** name `"山田太郎"` の Customer `original`
**When** `updateCustomer(original, { name: "山田花子" })` を呼ぶ
**Then** 返された Customer の `name` は `"山田花子"` であり、`original.name` は `"山田太郎"` のまま

#### Scenario: updateCustomer で tags を変更しても元の tags は変わらない

**Given** tags `["常連"]` の Customer `original`
**When** `updateCustomer(original, { tags: ["常連", "VIP"] })` を呼ぶ
**Then** 返された Customer の `tags` は `["常連", "VIP"]` であり、`original.tags` は `["常連"]` のまま

#### Scenario: updateCustomer は id を保持する

**Given** 特定の `id` を持つ Customer `original`
**When** `updateCustomer(original, { name: "新しい名前" })` を呼ぶ
**Then** 返された Customer の `id` は `original.id` と同一

---

### Requirement: Customer は frozen object である

Customer オブジェクトとそのネストフィールド（tags）は構築後に変更不可 SHALL be frozen。

#### Scenario: Customer のプロパティを書き換えようとすると失敗する

**Given** `createCustomer(...)` で生成した Customer
**When** `customer.name = "別の名前"` を試みる
**Then** strict mode でエラーが投げられる（frozen object）

#### Scenario: Customer の tags に push しようとすると失敗する

**Given** `createCustomer(...)` で生成した Customer
**When** `customer.tags.push("新タグ")` を試みる
**Then** エラーが投げられる（frozen array）

---

### Requirement: CustomerRepository の save / findById は往復可能である

CustomerRepository に save した Customer は findById で取得 SHALL be retrievable できる。未保存の id は null を返す。

#### Scenario: save した Customer を findById で取得できる

**Given** 空の CustomerRepository と、構築済みの Customer `c`
**When** `repo.save(c)` の後に `repo.findById(c.id)` を呼ぶ
**Then** `c` と同一の Customer が返る

#### Scenario: 未保存の id で findById すると null が返る

**Given** 空の CustomerRepository
**When** 任意の `Id<'Customer'>` で `repo.findById(id)` を呼ぶ
**Then** `null` が返る

---

### Requirement: CustomerRepository の save は upsert セマンティクスである

同一 id の Customer を save すると上書き SHALL overwrite される。

#### Scenario: 同一 id で 2 回 save すると最新が保持される

**Given** Customer `c` を save 済みの CustomerRepository
**When** `updateCustomer(c, { name: "更新後" })` した Customer `c2` を `repo.save(c2)` する
**Then** `repo.findById(c.id)` は `c2`（name が `"更新後"`）を返す

---

### Requirement: CustomerRepository の list は保存された全 Customer を返す

list は保存済みの全 Customer を SHALL return all saved customers 返す。空の場合は空配列。

#### Scenario: 空の状態で list は空配列を返す

**Given** 空の CustomerRepository
**When** `repo.list()` を呼ぶ
**Then** 空配列 `[]` が返る

#### Scenario: 複数の Customer を save した後に list が全件返す

**Given** Customer `c1` と `c2` を save 済みの CustomerRepository
**When** `repo.list()` を呼ぶ
**Then** `c1` と `c2` を含む配列が返る（順序は問わない）
