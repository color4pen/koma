# Spec: DrizzleResourceRepository / DrizzleServiceRepository

## Requirements

### Requirement: DrizzleResourceRepository SHALL persist and reconstruct Resource aggregates via createResource

`DrizzleResourceRepository` は `ResourceRepository` port を満たし、`save` で Resource を永続化し、`findById` / `list` で取得した行を `createResource` 経由で再構成する。再構成時に `capacity >= 1` の不変条件が適用される。

#### Scenario: save した Resource を findById で全フィールド一致で取得できる

**Given** 空の resources テーブル
**When** `createResource({ name: '席A', kind: 'seat', capacity: 3 })` を `save` し、同じ id で `findById` する
**Then** 取得した Resource の `id`, `name`, `kind`, `capacity` が保存時と一致する

#### Scenario: 未保存の id で findById すると null が返る

**Given** 空の resources テーブル
**When** 存在しない id で `findById` する
**Then** `null` が返る

#### Scenario: 複数 save した Resource を list で全件取得できる

**Given** 空の resources テーブル
**When** 3 件の Resource を `save` し、`list` を呼ぶ
**Then** 戻り値の長さが 3 で、全 id が含まれる

#### Scenario: 同一 id で再 save すると更新される（upsert）

**Given** Resource を 1 件 `save` 済み
**When** 同じ id で `name` を変更した Resource を再度 `save` する
**Then** `findById` で取得した `name` が更新後の値であり、`list` の件数は 1

#### Scenario: capacity が保存 → 取得で保たれ不変条件を通る

**Given** `capacity: 5` の Resource を `save` 済み
**When** `findById` で取得する
**Then** `capacity` が `5` であり、`createResource` の不変条件（`capacity >= 1`）を通過している

### Requirement: DrizzleServiceRepository SHALL persist and reconstruct Service aggregates via createService with value object factories

`DrizzleServiceRepository` は `ServiceRepository` port を満たし、`save` で Service を永続化し、`findById` / `list` で取得した行を `ofMilliseconds` + `createMoney` + `createService` 経由で再構成する。`duration`, `price`, `resourceKinds` の往復が保たれる。

#### Scenario: save した Service を findById で全フィールド一致で取得できる

**Given** 空の services テーブル
**When** `createService({ name: 'カット', duration: ofMilliseconds(3600000), price: createMoney(5000, 'JPY'), resourceKinds: ['seat', 'stylist'] })` を `save` し、同じ id で `findById` する
**Then** 取得した Service の `id`, `name`, `duration.milliseconds`, `price.amount`, `price.currency`, `resourceKinds` が保存時と一致する

#### Scenario: 未保存の id で findById すると null が返る

**Given** 空の services テーブル
**When** 存在しない id で `findById` する
**Then** `null` が返る

#### Scenario: 複数 save した Service を list で全件取得できる

**Given** 空の services テーブル
**When** 3 件の Service を `save` し、`list` を呼ぶ
**Then** 戻り値の長さが 3 で、全 id が含まれる

#### Scenario: 同一 id で再 save すると更新される（upsert）

**Given** Service を 1 件 `save` 済み
**When** 同じ id で `name` を変更した Service を再度 `save` する
**Then** `findById` で取得した `name` が更新後の値であり、`list` の件数は 1

#### Scenario: duration が往復で保たれる

**Given** `duration: ofMilliseconds(1800000)` の Service を `save` 済み
**When** `findById` で取得する
**Then** `duration.milliseconds` が `1800000`

#### Scenario: price が往復で保たれる

**Given** `price: createMoney(12000, 'JPY')` の Service を `save` 済み
**When** `findById` で取得する
**Then** `price.amount` が `12000`、`price.currency` が `'JPY'`

#### Scenario: resourceKinds が往復で保たれる

**Given** `resourceKinds: ['seat', 'stylist']` の Service を `save` 済み
**When** `findById` で取得する
**Then** `resourceKinds` が `['seat', 'stylist']` と等価

#### Scenario: resourceKinds が空配列の場合も往復する

**Given** `resourceKinds` 未指定（デフォルト `[]`）の Service を `save` 済み
**When** `findById` で取得する
**Then** `resourceKinds` が `[]`
