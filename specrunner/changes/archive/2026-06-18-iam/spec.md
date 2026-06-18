# Spec: packages/iam — User 集約・Role・Permission（認可）と UserRepository

## Requirements

### Requirement: can() は owner に対して全 Permission で true を返す

owner ロールは全管理権限を持つ。`can('owner', p)` は定義済みの全 Permission に対して `true` を返さなければならない（SHALL）。

#### Scenario: owner が全 Permission を持つ

**Given** 全 Permission のリスト（`manage-customers`, `manage-resources`, `manage-services`, `manage-bookings`, `manage-users`, `manage-settings`）
**When** 各 Permission に対して `can('owner', permission)` を呼ぶ
**Then** すべて `true` を返す

### Requirement: can() は staff に対して manage-users と manage-settings で false を返す

staff ロールはユーザー管理・設定管理の権限を持たない。`can('staff', 'manage-users')` と `can('staff', 'manage-settings')` は `false` を返さなければならない（SHALL）。

#### Scenario: staff が manage-users を持たない

**Given** role が `'staff'`
**When** `can('staff', 'manage-users')` を呼ぶ
**Then** `false` を返す

#### Scenario: staff が manage-settings を持たない

**Given** role が `'staff'`
**When** `can('staff', 'manage-settings')` を呼ぶ
**Then** `false` を返す

### Requirement: can() は staff に対して業務系 Permission で true を返す

staff ロールは顧客・リソース・サービス・予約の管理権限を持つ。`can('staff', p)` はこれらの Permission に対して `true` を返さなければならない（SHALL）。

#### Scenario: staff が manage-customers を持つ

**Given** role が `'staff'`
**When** `can('staff', 'manage-customers')` を呼ぶ
**Then** `true` を返す

#### Scenario: staff が manage-resources を持つ

**Given** role が `'staff'`
**When** `can('staff', 'manage-resources')` を呼ぶ
**Then** `true` を返す

#### Scenario: staff が manage-services を持つ

**Given** role が `'staff'`
**When** `can('staff', 'manage-services')` を呼ぶ
**Then** `true` を返す

#### Scenario: staff が manage-bookings を持つ

**Given** role が `'staff'`
**When** `can('staff', 'manage-bookings')` を呼ぶ
**Then** `true` を返す

### Requirement: User は email が空の場合に構築不可

`createUser` は `email` が空文字または空白のみの場合、Error を throw しなければならない（SHALL）。

#### Scenario: email が空文字で createUser を呼ぶ

**Given** `email` が `''`
**When** `createUser({ email: '', passwordHash: 'hash', role: 'owner' })` を呼ぶ
**Then** Error が throw される

#### Scenario: email が空白のみで createUser を呼ぶ

**Given** `email` が `'   '`
**When** `createUser({ email: '   ', passwordHash: 'hash', role: 'owner' })` を呼ぶ
**Then** Error が throw される

### Requirement: User は passwordHash と role を保持する

`createUser` で生成した User は `passwordHash` と `role` をそのまま保持しなければならない（SHALL）。

#### Scenario: passwordHash と role が保持される

**Given** `passwordHash` が `'$2b$10$abc...'`、`role` が `'staff'`
**When** `createUser({ email: 'user@example.com', passwordHash: '$2b$10$abc...', role: 'staff' })` を呼ぶ
**Then** 返された User の `passwordHash` が `'$2b$10$abc...'`、`role` が `'staff'` である

### Requirement: User は immutable で更新は新インスタンスを返す

`updateUser` は元の User を変更せず、新しいインスタンスを返さなければならない（SHALL）。id は保持される。

#### Scenario: updateUser で email を変更しても元の User が不変

**Given** `email` が `'old@example.com'` の User
**When** `updateUser(user, { email: 'new@example.com' })` を呼ぶ
**Then** 元の User の `email` は `'old@example.com'` のまま、新 User の `email` は `'new@example.com'`、`id` は同一

### Requirement: UserRepository の findByEmail は該当 User を返し、未登録は null を返す

`findByEmail` は保存済みの User をメールアドレスで検索し、存在すれば User を返し、存在しなければ `null` を返さなければならない（SHALL）。

#### Scenario: 保存済み User を findByEmail で取得

**Given** `email` が `'test@example.com'` の User が save 済み
**When** `findByEmail('test@example.com')` を呼ぶ
**Then** 該当 User が返される

#### Scenario: 未登録メールで findByEmail

**Given** リポジトリが空
**When** `findByEmail('unknown@example.com')` を呼ぶ
**Then** `null` が返される

### Requirement: UserRepository の save → findById → list が正しく動作する

`save` で保存した User は `findById` で取得でき、`list` で全件取得できなければならない（SHALL）。同一 id の save は上書き（upsert）される。

#### Scenario: save → findById

**Given** User を `save` した
**When** その User の `id` で `findById` を呼ぶ
**Then** 保存した User が返される

#### Scenario: 未保存 id で findById

**Given** リポジトリが空
**When** 未保存の id で `findById` を呼ぶ
**Then** `null` が返される

#### Scenario: save → list

**Given** 3 件の User を `save` した
**When** `list` を呼ぶ
**Then** 3 件の User が返される

#### Scenario: 同一 id の save は upsert

**Given** User A を `save` し、同一 id で email を変更した User B を `save` した
**When** `findById` を呼ぶ
**Then** User B が返され、`list` の件数は 1
