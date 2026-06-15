# Spec: packages/resource

## Requirements

### Requirement: Resource の capacity は 1 以上の整数でなければならない

`createResource` は `capacity` が 1 以上の整数（`Number.isInteger` かつ `>= 1`）でない場合、構築を拒否して例外を送出 SHALL する。`capacity` を省略した場合、既定値 1 を適用 SHALL する。

#### Scenario: capacity を省略すると既定値 1 が適用される

**Given** `capacity` を指定しない `createResource` の引数
**When** `createResource` を呼び出す
**Then** 生成された `Resource` の `capacity` は 1 である

#### Scenario: capacity に正整数を指定して構築できる

**Given** `capacity: 3` を指定した `createResource` の引数
**When** `createResource` を呼び出す
**Then** 生成された `Resource` の `capacity` は 3 である

#### Scenario: capacity が 0 のとき構築に失敗する

**Given** `capacity: 0` を指定した `createResource` の引数
**When** `createResource` を呼び出す
**Then** 例外が送出される

#### Scenario: capacity が負数のとき構築に失敗する

**Given** `capacity: -1` を指定した `createResource` の引数
**When** `createResource` を呼び出す
**Then** 例外が送出される

#### Scenario: capacity が小数のとき構築に失敗する

**Given** `capacity: 1.5` を指定した `createResource` の引数
**When** `createResource` を呼び出す
**Then** 例外が送出される

### Requirement: Resource は immutable であり更新は新インスタンスを返す

`updateResource` は元の `Resource` インスタンスを変更せず、更新内容を反映した新しい frozen `Resource` を返す SHALL。

#### Scenario: name を更新しても元の Resource が保持される

**Given** `name: '会議室A'` で作成した `Resource`
**When** `updateResource` で `name: '会議室B'` に更新する
**Then** 元の `Resource` の `name` は `'会議室A'` のまま、返された新 `Resource` の `name` は `'会議室B'`

#### Scenario: 更新後も id が保持される

**Given** 作成した `Resource`
**When** `updateResource` で `name` を変更する
**Then** 返された新 `Resource` の `id` は元の `Resource` の `id` と同一

#### Scenario: capacity を更新する際も不変条件が再検証される

**Given** `capacity: 2` で作成した `Resource`
**When** `updateResource` で `capacity: 0` に更新しようとする
**Then** 例外が送出される

### Requirement: Resource は Object.freeze で凍結される

`createResource` が返す `Resource` オブジェクトは `Object.isFrozen` が `true` を返す SHALL。

#### Scenario: 生成した Resource が frozen である

**Given** 任意の引数で `createResource` を呼び出す
**When** 返された `Resource` に対して `Object.isFrozen` を確認する
**Then** `true` が返る

### Requirement: InMemoryResourceRepository は save/findById/list の基本操作を提供する

in-memory 実装は `ResourceRepository` interface の契約を満たす SHALL。

#### Scenario: save した Resource を findById で取得できる

**Given** 空の `InMemoryResourceRepository`
**When** `Resource` を `save` し、その `id` で `findById` する
**Then** 保存した `Resource` と等価なオブジェクトが返る

#### Scenario: 未保存の id で findById すると null が返る

**Given** 空の `InMemoryResourceRepository`
**When** 未保存の `Id<'Resource'>` で `findById` する
**Then** `null` が返る

#### Scenario: save したものが list に含まれる

**Given** 空の `InMemoryResourceRepository`
**When** `Resource` を `save` し、`list` を呼び出す
**Then** 保存した `Resource` を含む配列が返る

#### Scenario: 空の状態で list は空配列を返す

**Given** 空の `InMemoryResourceRepository`
**When** `list` を呼び出す
**Then** 空配列が返る

#### Scenario: 同一 id で save を 2 回呼ぶと上書きされる

**Given** `Resource` を `save` した `InMemoryResourceRepository`
**When** 同一 `id` で別の `name` を持つ `Resource` を `save` し、`findById` する
**Then** 後に保存した `Resource` が返る。`list` の件数は 1
