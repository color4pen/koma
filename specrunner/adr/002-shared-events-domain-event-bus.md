# ADR-002: 共有カーネルへの DomainEvent 基底型と EventBus port（＋同期 in-memory 実装）の確立

- **status**: accepted
- **date**: 2026-06-15
- **change**: shared-events
- **deciders**: architect, spec-runner

## Context

Koma のモジュラモノリスは scheduling / crm / notification 等の複数ドメインパッケージを持ち、それらを**疎結合**に連携させるための event seam が必要である。`docs/アーキテクチャ/dynamic-model.md` の「Domain event seam」は、`DomainEvent` + `EventBus`(port) の契約を `packages/shared`（`@koma/shared`）に置き、実装は delivery が注入する、と定めている。

本変更以前、この契約は docs の記述のみで実体化されていなかった。ADR-001 で確立した `packages/shared` は値オブジェクト（Id / Money / Duration / TimeRange）を持ち、外部依存ゼロ（devDependencies のみ）・class 不使用・ファクトリ関数 + readonly 型エイリアスのパターンを確立済みである。

本 ADR は `DomainEvent` 基底型・`EventBus` port interface・同期 in-memory 実装を `packages/shared` に追加し、`dynamic-model.md` が定めるモジュール間 event seam を実体化する決定を記録する。発行側は購読側を知らず、購読の有無で発行側の不変条件は変わらない（`dynamic-model.md` の不変条件）。

## Decisions

### D1: DomainEvent 基底型 — readonly 型エイリアス

```typescript
type DomainEvent = { readonly name: string; readonly occurredAt: number }
```

全イベントが共有する最小形。具体イベント型はこれを交差型またはインターフェース拡張で拡張する。`occurredAt` は epoch ミリ秒（ADR-001 の TimeRange と同じ数値ベースの時刻表現）。

**採用理由**: `Date` は可変で tz 依存。epoch ミリ秒は既存の TimeRange と一貫し、比較・直列化がゼロコスト。`name` は string literal discriminant として型安全な dispatch の基盤になる。class を使わないことで直列化・跨境界・再構成がゼロコストになる。

**却下案**:
- class ベースの基底型 → `JSON.stringify` で情報が欠落し、`instanceof` は require 境界（ESM と CJS の混在等）で壊れる。跨境界での再構成のたびに wrap/unwrap が必要になる
- `Date` 型の `occurredAt` → 可変性・tz 依存・JSON 往復での情報欠落（`Date` は `"2026-06-15T..."` に serialize されるが、ミリ秒精度が失われる場合がある）

---

### D2: EventMap + 型安全 EventBus — ジェネリック型パラメータ方式

```typescript
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

`publish` は `M[N] & { readonly name: N }` 交差型を受け取る。TypeScript がイベントの `name` フィールドから型パラメータ `N` を推論し、EventMap で対応するペイロード型を強制する。`publish` も `subscribe` と同等の型安全性を持つ。

**採用理由**: ジェネリック型パラメータ方式は、declaration merging（グローバル名前空間汚染）を避けつつ、ドメインごとに独立した型安全なイベントマップを定義できる。イベント名の string literal から型を引くことで、ハンドラの引数型が自動的に絞り込まれ、`@ts-expect-error` で誤型をコンパイル時に検出できる。

**却下案**:
- `instanceof` + class hierarchy → 直列化で壊れる、跨境界で再構成が必要（D1 と同じ理由）
- declaration merging で単一グローバル EventMap を拡張 → パッケージ間の型結合が暗黙的になり、モジュール境界が型レベルで崩れる
- discriminated union → イベントを追加するたびにユニオン定義を更新する必要があり、ドメインパッケージ追加のたびに shared を修正する逆依存が生じる

---

### D3: subscribe の戻り値 — 購読解除関数 `() => void`（Disposable パターン）

`subscribe` は `() => void` を返し、呼ぶと購読を解除する。

**採用理由**: 呼び出し側がハンドラ参照を保持する必要がなく、クロージャで解除を閉じ込められる。React の `useEffect` cleanup・vitest の `afterEach`・Node の `process.on` cleanup と自然に組み合わせられる（利用側の cleanup コードが均一になる）。

**却下案**:
- `unsubscribe(name, handler)` メソッド → handler の参照一致が必要。匿名関数・アロー関数をインラインで渡した場合に解除が困難
- `Subscription` オブジェクト（`{ unsubscribe(): void }`） → RxJS 由来のパターンだが、`() => void` で表現できるものに追加の抽象化レイヤーを挟む YAGNI

---

### D4: 同期 in-memory 実装 — ファクトリ関数 `createInMemoryEventBus`

```typescript
function createInMemoryEventBus<M extends EventMap = EventMap>(): EventBus<M>
```

`Map<string, Set<handler>>` を内部状態に持つクロージャベースの実装。`publish` は当該 `name` に登録済みのハンドラを同期で順次呼び出す。ハンドラ未登録の name への publish は no-op。

**採用理由**: ADR-001 で確立した shared パッケージの規約（ファクトリ関数 + クロージャ、class 不使用）に従う。同期実行によりテストが決定的で副作用の順序が予測可能。外部依存ゼロで B-4（共有カーネルは `next` / `react` / `drizzle-orm` / `zod` を import しない）を維持する。delivery が別実装（非同期キュー等）を注入する際、port（`EventBus<M>` interface）依存が保たれるため差し替えが可能。

**却下案**:
- class `InMemoryEventBus` → 既存パッケージが class を使わないファクトリ関数パターンを確立している。一貫性を損なう
- 非同期実装（Promise / microtask queue）→ YAGNI。発行→購読の決定的テストが書きにくくなる。配送ポリシーは delivery の責務であり、デフォルト実装に持ち込む理由がない

---

### D5: ファイル配置 — 契約（port）と実装（adapter）の分離

- `packages/shared/src/event.ts` — `DomainEvent` 型・`EventMap` 型・`EventBus` 型（port のみ）
- `packages/shared/src/in-memory-event-bus.ts` — `createInMemoryEventBus` 実装（adapter）
- テストは sibling 配置（`event.test.ts`・`in-memory-event-bus.test.ts`）

**採用理由**: delivery が別実装を注入する際に `event.ts` のみを import すれば済む。実装の詳細（Map, Set, Set iteration 順序）が port の消費者に漏洩しない。ADR-001 で確立した sibling テスト配置規約に従う。

**却下案**: 全てを 1 ファイルに → 契約と実装が密結合。別実装への差し替え時に `import` が実装詳細を引く

---

### D6: `occurredAt` の型 — epoch ミリ秒 `number`

ADR-001 の `TimeRange`（`{ start: number; end: number }`）と時刻表現を統一する。`occurredAt` は `Date.now()` で生成した epoch ミリ秒を想定。`Date` の可変性・tz 依存・JSON 往復での精度欠落を回避する。

**採用理由**: 既存の shared パッケージの時刻表現と一貫し、比較・直列化・DB 格納がゼロコスト。

**却下案**: `Date` 型 → ADR-001 D5 却下案と同じ理由（可変、tz 依存）

## Alternatives Considered

### Alternative 1: グローバル EventMap の declaration merging

```typescript
// 各ドメインパッケージで
declare module '@koma/shared' {
  interface GlobalEventMap {
    BookingConfirmed: BookingConfirmedEvent;
  }
}
```

**Pros**:
- EventBus に型引数を渡す必要がなく、呼び出しが `bus.subscribe('BookingConfirmed', handler)` のみで済む
- 中央の型定義が一か所にまとまる

**Cons**:
- パッケージ間の型結合が declaration merging 経由で暗黙的になる。`scheduling` が `crm` のイベント型を間接的に参照してしまう
- TypeScript の declaration merging はモジュール境界を越えると設定依存の動作がある
- テスト環境で merging の順序制御が複雑になる

**Why not**: ジェネリック型パラメータ方式（D2）はドメインごとに独立した型安全性を明示的に提供し、名前空間汚染がない。

---

### Alternative 2: `instanceof` ベースのイベント識別

```typescript
class DomainEvent {
  constructor(public readonly occurredAt: number) {}
}
class BookingConfirmed extends DomainEvent { ... }

bus.subscribe(BookingConfirmed, handler)  // class を key に使う
```

**Pros**:
- `instanceof` で型絞り込みが直感的に機能する
- クラス階層でイベントの共通メソッドを定義できる

**Cons**:
- `JSON.stringify` + `JSON.parse` 後の復元は `instanceof` を壊す（plain object になる）
- ESM/CJS 境界や Worker/iframe への跨境界送信後に再構成が必要
- 直列化・永続化・キュー経由の配送（後続 request）と根本的に相性が悪い

**Why not**: 将来の非同期配送・永続化への移行を考慮すると、plain object + string literal discriminant の方が変更コストが低い。

---

### Alternative 3: 非同期 in-memory 実装（microtask queue）

```typescript
async publish(event): Promise<void> {
  await Promise.resolve();  // microtask に defer
  handlers.forEach(h => h(event));
}
```

**Pros**:
- 非同期配送の本番実装と振る舞いを合わせられる
- ハンドラの例外が publish の呼び出し元に伝播しない

**Cons**:
- テストが `await` を必要とし、決定論的な「publish 後すぐ副作用を確認」が書けなくなる
- エラーポリシーが複雑化する（unhandledRejection の管理）

**Why not**: YAGNI。テストの決定性を犠牲にする理由がない。配送ポリシーの複雑さは delivery の責務。

## Consequences

### Positive

- scheduling ↔ notification / crm 等のモジュール間連携が `EventBus<M>` port 経由で実装でき、発行側と購読側の直接依存が生じない
- `@ts-expect-error` テストにより、EventMap の型安全性（誤った payload 型での subscribe）がコンパイル時に固定される
- in-memory 実装が同期なので、ドメインサービスのユニットテストが `await` なしで発行→受信を検証できる
- delivery が非同期キュー等の別実装を注入しても、port 依存のドメインサービスは無変更

### Negative / Trade-offs

- 各ドメインパッケージが独自の EventMap を定義し、`EventBus<MyMap>` のように型引数を渡す必要がある。利用側の型宣言コストが生じる（後続の具体ドメインイベント request で ergonomics を評価する）
- 同期 publish 中のハンドラ例外は後続ハンドラを阻害する。エラーポリシーはスコープ外（delivery の責務）。リトライ・隔離は delivery 側の wrapper/decorator で対応する
- ハンドラは登録順に実行される（順序保証は仕様外）。ハンドラは互いに独立であるべきで、順序依存が問題になった場合は後続 request で対処する

## References

- `docs/アーキテクチャ/dynamic-model.md` — Domain event seam の所在定義と不変条件
- `docs/アーキテクチャ/model.md` — 層・依存規律 B-1〜B-4
- `specrunner/changes/shared-events/design.md` — 詳細設計判断（D1〜D5）
- `specrunner/adr/001-shared-kernel-value-objects.md` — 共有カーネルの確立と既存規約
- `packages/shared/src/event.ts` — DomainEvent / EventMap / EventBus 型定義
- `packages/shared/src/in-memory-event-bus.ts` — createInMemoryEventBus 実装
