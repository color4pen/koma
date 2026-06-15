# Design: shared-events

## Context

`packages/shared`（`@koma/shared`）は値オブジェクト（Id / Money / Duration / TimeRange）を持つ共有カーネルとして確立済み。`docs/アーキテクチャ/dynamic-model.md` の「Domain event seam」は、モジュール間の疎結合連携を `DomainEvent` + `EventBus`(port) の契約で実現し、その契約を `packages/shared` に置くと定めている。

現状、この契約は docs の記述のみで実体化されていない。本変更は `DomainEvent` 基底型・`EventBus` port interface・同期 in-memory 実装を `packages/shared` に追加し、`dynamic-model.md` が定めるモジュール間イベント seam を実体化する。

既存の shared パッケージは外部依存ゼロ（devDependencies のみ）であり、本変更もそれを維持する。既存のコードスタイルは class 不使用・ファクトリ関数 + `Object.freeze` / readonly 型エイリアスのパターンを確立している。

## Goals / Non-Goals

**Goals**:

- `DomainEvent` 基底型を定義し、具体イベント型の拡張基盤を確立する
- `EventBus` port interface を定義し、型安全な publish/subscribe 契約を提供する
- 同期 in-memory EventBus 実装をデフォルト／テスト用に提供する
- vitest テストで振る舞いと型安全性を固定する
- `packages/shared/src/index.ts` から全公開 API を re-export する

**Non-Goals**:

- 非同期配送・キュー・イベントストア（永続化）
- 具体ドメインイベント（`BookingConfirmed` 等は各ドメインパッケージで定義）
- リトライ・配送失敗時のエラーポリシー（購読側／delivery の責務）
- 順序保証・トランザクション境界
- package.json への新規 dependencies 追加

## Decisions

### D1: DomainEvent 基底型 — readonly 型エイリアス

```
type DomainEvent = { readonly name: string; readonly occurredAt: number }
```

全イベントが共有する最小形。具体イベント型はこれを拡張（交差型またはインターフェース拡張）する。`occurredAt` は epoch ミリ秒（`TimeRange` と同じ数値ベースの時刻表現）。

**Rationale**: `Date` は可変で tz 依存。epoch ミリ秒は既存の TimeRange と一貫し、比較・直列化がゼロコスト。`name` は string literal discriminant として型安全な dispatch の基盤になる。

**Alternatives considered**:
- class ベースの基底型 → 直列化・跨境界での再構成が困難。`instanceof` は require 境界で壊れる
- `Date` 型の `occurredAt` → 可変性・tz 依存・JSON 往復での情報欠落

### D2: EventMap + 型安全 EventBus — ジェネリック型パラメータ方式

```
type EventMap = Record<string, DomainEvent>

type EventBus<M extends EventMap = EventMap> = {
  publish<N extends keyof M & string>(event: M[N] & { readonly name: N }): void;
  subscribe<N extends keyof M & string>(
    name: N,
    handler: (event: M[N]) => void,
  ): () => void;
}
```

`EventMap` はイベント名（string literal） → ペイロード型の対応を定義する型エイリアス。各ドメインが自分の EventMap を定義し、`EventBus<MyMap>` で型安全な publish/subscribe を得る。

`publish` は `M[N] & { readonly name: N }` 交差型を受け取る。これにより TypeScript がイベントの `name` フィールドから型パラメータ `N` を推論し、EventMap で対応するペイロード型を強制する。`publish` も `subscribe` と同等の型安全性を持つ。

（request-review #1 の LOW 所見「`publish` のシグネチャ未明示」をここで解決: `publish` は EventMap `M` で型付けされたイベントのみを受け取る。`DomainEvent` を素で受ける untyped 版ではない。）

**Rationale**: ジェネリック型パラメータ方式は、declaration merging（グローバル名前空間汚染）を避けつつ、ドメインごとに独立した型安全なイベントマップを定義できる。

**Alternatives considered**:
- `instanceof` + class hierarchy → 直列化で壊れる、跨境界で再構成が必要
- declaration merging で単一グローバル EventMap を拡張 → 名前空間汚染、パッケージ間の型結合が暗黙的になる
- discriminated union → イベントを追加するたびにユニオンを更新する必要があり、拡張性が低い

### D3: subscribe の戻り値 — 購読解除関数 `() => void`

`subscribe` は `() => void` を返し、呼ぶと購読を解除する。

**Rationale**: Disposable パターン。呼び出し側がハンドラ参照を保持する必要がなく、クロージャで解除を閉じ込められる。React の `useEffect` cleanup や、テストの afterEach と自然に組み合わせられる。

**Alternatives considered**:
- `unsubscribe(name, handler)` メソッド → handler の参照一致が必要で、匿名関数の解除が困難
- `Subscription` オブジェクト → 過剰な抽象化（YAGNI）

### D4: 同期 in-memory 実装 — ファクトリ関数 `createInMemoryEventBus`

```
function createInMemoryEventBus<M extends EventMap = EventMap>(): EventBus<M>
```

`Map<string, Set<handler>>` を内部状態に持つクロージャベースの実装。`publish` は当該 `name` に登録済みのハンドラを同期で順次呼び出す。ハンドラ未登録の name への publish は no-op。

**Rationale**: 既存の shared パッケージの規約（ファクトリ関数 + クロージャ、class 不使用）に従う。同期実行により、テストが決定的で副作用の順序が予測可能。外部依存ゼロで B-4 を維持する。

**Alternatives considered**:
- class `InMemoryEventBus` → 既存パッケージが class を使わないファクトリ関数パターンを確立している
- 非同期実装（Promise / microtask queue）→ YAGNI。発行→購読の決定的テストが書きにくくなる

### D5: ファイル配置 — 契約と実装の分離

- `packages/shared/src/event.ts` — `DomainEvent` 型、`EventMap` 型、`EventBus` 型
- `packages/shared/src/in-memory-event-bus.ts` — `createInMemoryEventBus` 実装
- テストは sibling 配置（`event.test.ts`、`in-memory-event-bus.test.ts`）

**Rationale**: 契約（port）と実装を分離することで、delivery が別実装を注入する際に `event.ts` のみを import すれば済む。既存の sibling テスト配置規約に従う。

**Alternatives considered**:
- 全てを 1 ファイルに → 契約と実装が密結合。別実装への差し替え時に不要な依存を引く

## Risks / Trade-offs

[Risk] **EventMap ジェネリクスの利用側の型宣言コスト** — 各ドメインが独自の EventMap を定義し、EventBus に型引数を渡す必要がある。
→ Mitigation: 本 request は shared の契約確立のみ。利用パターンは後続の具体ドメインイベント request で確立し、その時点で ergonomics を評価する。

[Risk] **同期 publish 中のハンドラ例外が後続ハンドラを阻害する** — 1 つのハンドラが throw すると、同じイベントの残りのハンドラが呼ばれない。
→ Mitigation: エラーポリシーはスコープ外（delivery の責務）と定めている。in-memory 実装は「例外は呼び出し側に伝播する」という最小限の契約とし、リトライ・隔離は delivery 側の wrapper/decorator で対応する。

[Risk] **ハンドラの登録順序に暗黙の依存が生まれる可能性** — 同期呼び出しのため、ハンドラは登録順に実行される。
→ Mitigation: 順序保証はスコープ外と明示。ハンドラは互いに独立であるべき（発行側の不変条件は購読の有無で変わらない）。順序依存が問題になったら別 request で対処する。

## Open Questions

なし。request の architect 評価により設計判断は確定済み。
