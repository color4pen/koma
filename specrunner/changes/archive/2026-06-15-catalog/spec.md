# Spec: packages/catalog — Service 集約と ServiceRepository port

## Requirements

### Requirement: Service の所要時間（duration）は正でなければならない

`createService` は `duration.milliseconds` が 0 以下の場合に例外を投げ、Service の構築を拒否 SHALL する。`@koma/shared` の `Duration` は非負（>= 0）を保証するが、0 分のサービスメニューは業務上無意味であるため、catalog ドメイン層で正（> 0）を追加ガードする。

#### Scenario: duration が 0 ミリ秒のとき構築に失敗する

**Given** `ofMinutes(0)` で生成した Duration（milliseconds = 0）
**When** `createService` に当該 duration を渡して構築を試みる
**Then** 例外が投げられ、Service は生成されない

#### Scenario: duration が正のとき構築に成功する

**Given** `ofMinutes(60)` で生成した Duration（milliseconds = 3,600,000）
**When** `createService` に当該 duration を渡す
**Then** Service が構築され、`service.duration` が渡した Duration と等しい

### Requirement: Service の料金（price）は非負でなければならない

`createService` は `price.amount` が負の場合に例外を投げ、Service の構築を拒否 SHALL する。0 円は無料メニューとして許容する。Money の型制約（整数）に加え、catalog ドメイン層でサービス料金の業務制約（非負）をガードする。

#### Scenario: price が負のとき構築に失敗する

**Given** `createMoney(-100, 'JPY')` で生成した Money（amount = -100）
**When** `createService` に当該 price を渡して構築を試みる
**Then** 例外が投げられ、Service は生成されない

#### Scenario: price が 0 のとき構築に成功する

**Given** `createMoney(0, 'JPY')` で生成した Money（amount = 0）
**When** `createService` に当該 price を渡す
**Then** Service が構築され、`service.price.amount` が 0 である

### Requirement: Service の更新は immutable でなければならない

`updateService` は元の Service インスタンスを変更せず、新しい Service インスタンスを返す SHALL。返却値の `id` は元インスタンスと同一。更新時も全不変条件（duration 正・price 非負）が再検証される。

#### Scenario: name を更新したとき元インスタンスは変更されない

**Given** name が「カット」の Service を構築済み
**When** `updateService` で name を「カット＆ブロー」に変更する
**Then** 返却された Service の name は「カット＆ブロー」であり、元の Service の name は「カット」のまま。返却値と元インスタンスは参照が異なる（`!==`）。id は同一。

#### Scenario: 更新時に不正な duration を渡すと失敗する

**Given** 正常な Service を構築済み
**When** `updateService` で duration を `ofMinutes(0)` に変更しようとする
**Then** 例外が投げられ、元インスタンスは変更されない

### Requirement: InMemoryServiceRepository は Repository 契約を満たさなければならない

`InMemoryServiceRepository` は `ServiceRepository` port が定義する `save` / `findById` / `list` の 3 メソッドの契約を SHALL 満たす。save は upsert セマンティクス（同一 id で上書き）。findById は未保存 id に対し null を返す。list は保存された全件を返す。

#### Scenario: save した Service を findById で取得できる

**Given** 空の InMemoryServiceRepository
**When** Service を save し、その id で findById する
**Then** save した Service と等しいオブジェクトが返る

#### Scenario: 未保存の id で findById すると null が返る

**Given** 空の InMemoryServiceRepository
**When** 存在しない id で findById する
**Then** null が返る

#### Scenario: list が保存分を全件返す

**Given** 空の InMemoryServiceRepository
**When** 3 件の Service を save し、list を呼ぶ
**Then** 3 件の Service が返る

#### Scenario: 同一 id で save を 2 回呼ぶと上書きされる

**Given** Service A を save 済みの InMemoryServiceRepository
**When** 同じ id で name を変更した Service B を save する
**Then** findById で Service B が返り、list は 1 件のみ
