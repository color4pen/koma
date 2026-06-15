# Spec: shared-events

## Requirements

### Requirement: DomainEvent は具体イベント型の拡張基盤である

`DomainEvent` 基底型は `name: string` と `occurredAt: number` を持ち、具体イベント型はこれを拡張して追加フィールドを持つことができる MUST be extensible via intersection or interface extension。

#### Scenario: 具体イベント型が DomainEvent を拡張できる

**Given** `DomainEvent` を拡張した具体イベント型 `{ readonly name: 'TestHappened'; readonly occurredAt: number; readonly detail: string }`
**When** この型の値を `DomainEvent` 型の変数に代入する
**Then** 型エラーなくコンパイルが通る（型レベルテスト）

---

### Requirement: EventBus の publish はイベント名に一致する subscriber にのみ配送する

`publish` されたイベントは、同じ `name` を `subscribe` したハンドラにのみ配送される SHALL deliver only to matching subscribers。異なる `name` のハンドラには配送されない。

#### Scenario: publish したイベントが同じ name の subscriber に届く

**Given** InMemoryEventBus を生成し、`'TestHappened'` で handler を subscribe している
**When** `name: 'TestHappened'` のイベントを publish する
**Then** handler がそのイベントを引数として 1 回呼ばれる

#### Scenario: 異なる name の subscriber にはイベントが届かない

**Given** InMemoryEventBus を生成し、`'OtherEvent'` で handler を subscribe している
**When** `name: 'TestHappened'` のイベントを publish する
**Then** `'OtherEvent'` の handler は呼ばれない

#### Scenario: subscriber がいないイベントの publish はエラーなく完了する

**Given** InMemoryEventBus を生成し、どの name にも subscribe していない
**When** イベントを publish する
**Then** エラーが発生せず正常に完了する

---

### Requirement: subscribe は購読解除関数を返す

`subscribe` の戻り値（`() => void`）を呼ぶと購読が解除される MUST return an unsubscribe function。解除後はイベントが配送されない。

#### Scenario: unsubscribe 後はイベントが届かない

**Given** InMemoryEventBus を生成し、`'TestHappened'` で handler を subscribe し、返された関数を保持する
**When** 返された関数を呼んだ後に `'TestHappened'` のイベントを publish する
**Then** handler は呼ばれない

#### Scenario: unsubscribe は他の subscriber に影響しない

**Given** InMemoryEventBus を生成し、`'TestHappened'` で handler A と handler B を subscribe し、handler A の購読解除関数を保持する
**When** handler A の購読を解除した後に `'TestHappened'` のイベントを publish する
**Then** handler B はイベントを受け取り、handler A は呼ばれない

---

### Requirement: InMemoryEventBus の publish は同期でハンドラを呼び出す

InMemoryEventBus の `publish` は登録済みハンドラを同期で呼び出す MUST invoke handlers synchronously。`publish` の呼び出しが返った時点で、全ハンドラの実行が完了している。

#### Scenario: publish 後にハンドラの副作用が即座に観測できる

**Given** InMemoryEventBus を生成し、handler が外部配列に値を push する subscribe を登録している
**When** イベントを publish する
**Then** publish の呼び出しが返った直後（await なし）に、配列にその値が含まれている

---

### Requirement: subscribe の handler は EventMap に基づく型安全なイベント型を受け取る

EventMap を型引数に渡した `EventBus<M>` において、`subscribe(name, handler)` の handler は EventMap で `name` に対応する型のイベントのみを受け取る MUST be type-safe。EventMap に定義されていないプロパティへのアクセスはコンパイルエラーになる。

#### Scenario: 正しいイベント型のプロパティにアクセスできる

**Given** `{ TestHappened: { name: 'TestHappened'; occurredAt: number; detail: string } }` を EventMap とした EventBus
**When** `subscribe('TestHappened', (e) => { e.detail })` と書く
**Then** 型エラーなくコンパイルが通る

#### Scenario: EventMap に存在しないプロパティへのアクセスはコンパイルエラーになる

**Given** `{ TestHappened: { name: 'TestHappened'; occurredAt: number; detail: string } }` を EventMap とした EventBus
**When** `subscribe('TestHappened', (e) => { e.nonExistent })` と書く（`@ts-expect-error` でガード）
**Then** コンパイルエラーが発生する（`@ts-expect-error` が有効に機能し、`check-types` が pass する）

---

### Requirement: 同一 name に複数のハンドラを登録できる

同一イベント名に複数のハンドラを登録した場合、publish で全ハンドラが呼ばれる SHALL invoke all registered handlers for the same event name。

#### Scenario: 2 つのハンドラが同じイベントを受け取る

**Given** InMemoryEventBus を生成し、`'TestHappened'` で handler A と handler B を subscribe している
**When** `'TestHappened'` のイベントを publish する
**Then** handler A と handler B の両方がそのイベントを引数として呼ばれる
