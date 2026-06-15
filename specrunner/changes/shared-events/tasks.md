# Tasks: shared-events

## T-01: DomainEvent 基底型・EventMap 型・EventBus port interface

- [x] `packages/shared/src/event.ts` を作成する:
  - `DomainEvent` 型エイリアス: `{ readonly name: string; readonly occurredAt: number }`
  - `EventMap` 型エイリアス: `Record<string, DomainEvent>`（イベント名 → ペイロード型の対応を定義する基底型）
  - `EventBus<M extends EventMap = EventMap>` 型エイリアス:
    - `publish<N extends keyof M & string>(event: M[N] & { readonly name: N }): void` — EventMap `M` で型付けされたイベントを受け取り、`name` フィールドから型パラメータ `N` を推論する
    - `subscribe<N extends keyof M & string>(name: N, handler: (event: M[N]) => void): () => void` — イベント名 `N` に対応するペイロード型の handler を受け取り、購読解除関数を返す
- [x] `packages/shared/src/event.test.ts` を作成する:
  - 型テスト: 具体イベント型（`name` + `occurredAt` + 追加フィールド）が `DomainEvent` に代入可能であることを検証
  - 型テスト: `@ts-expect-error` で `name` フィールドが欠けた型は `DomainEvent` に代入できないことを検証

**Acceptance Criteria**:
- `pnpm -F @koma/shared run check-types` が pass（型テストの `@ts-expect-error` が有効に機能している）
- `DomainEvent` / `EventMap` / `EventBus` 型が `event.ts` からエクスポートされている

## T-02: 同期 in-memory EventBus 実装

- [x] `packages/shared/src/in-memory-event-bus.ts` を作成する:
  - `createInMemoryEventBus<M extends EventMap = EventMap>(): EventBus<M>` ファクトリ関数をエクスポート
  - 内部に `Map<string, Set<(event: DomainEvent) => void>>` を保持するクロージャ
  - `publish`: `event.name` をキーに `Map` からハンドラの `Set` を取得し、同期で順次呼び出す。ハンドラ未登録の `name` への publish は no-op
  - `subscribe`: ハンドラを `Set` に追加し、購読解除関数 `() => void` を返す。購読解除関数は `Set` からハンドラを削除する
  - `event.ts` から `DomainEvent` / `EventMap` / `EventBus` を import する
- [x] `packages/shared/src/in-memory-event-bus.test.ts` を作成する:
  - publish したイベントが同じ `name` の subscriber に届くことを検証
  - 異なる `name` の subscriber にはイベントが届かないことを検証
  - subscriber がいないイベントの publish がエラーなく完了することを検証
  - unsubscribe 後はイベントが届かないことを検証
  - unsubscribe が他の subscriber に影響しないことを検証
  - publish が同期であることを検証（publish 直後に副作用が即座に観測可能）
  - 同一 `name` に複数のハンドラを登録し、全ハンドラが呼ばれることを検証
  - 型テスト: EventMap を定義した EventBus で、正しいプロパティにアクセスできることを検証
  - 型テスト: `@ts-expect-error` で EventMap に存在しないプロパティへのアクセスがコンパイルエラーになることを検証

**Acceptance Criteria**:
- `pnpm -F @koma/shared run test` で in-memory-event-bus 関連テストが全て pass
- `@ts-expect-error` による型安全テストが存在し、`check-types` が pass
- publish → subscribe 配送テスト、name 不一致テスト、unsubscribe テスト、no-op テスト、複数ハンドラテストが存在する

## T-03: 公開 API re-export と最終 verification

- [x] `packages/shared/src/index.ts` に以下の re-export を追加する:
  - `event.ts` から: `type { DomainEvent }`, `type { EventMap }`, `type { EventBus }`
  - `in-memory-event-bus.ts` から: `{ createInMemoryEventBus }`
- [x] `pnpm -F @koma/shared run check-types` が成功することを確認する
- [x] `pnpm -F @koma/shared run test` が全テスト pass することを確認する
- [x] `pnpm -F @koma/shared run lint` が成功することを確認する
- [x] `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green であることを確認する（既存 `apps/web` を含めた全体 verification）
- [x] `grep -E '"(next|react|drizzle-orm|zod)"' packages/shared/package.json` が 0 件であることを確認する

**Acceptance Criteria**:
- `DomainEvent` / `EventMap` / `EventBus` / `createInMemoryEventBus` が `@koma/shared` の `src/index.ts` から import 可能
- 全受け入れ基準が green:
  - `@koma/shared` の check-types / test / lint が pass
  - `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green
  - 禁止依存が 0 件
