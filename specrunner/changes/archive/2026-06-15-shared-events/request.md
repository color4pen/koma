# packages/shared に DomainEvent 基底型と EventBus port（＋同期 in-memory 実装）を追加する

## Meta

- **type**: new-feature
- **slug**: shared-events
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 新しい port/adapter 追加、既存パターンと異なる設計選択、振る舞い/契約を変える修正、構造的リファクタリング → true。いずれにも該当しない → false -->

## 背景

モジュール間（scheduling / crm / notification …）を疎結合に繋ぐ **event seam** を共有カーネルに確立する。
`docs/アーキテクチャ/dynamic-model.md` の「Domain event seam」が、`DomainEvent` ＋ `EventBus`(port) の契約を `packages/shared` に置き、実装は delivery が注入する、と定めている。本 request はその契約と純粋なデフォルト実装を実体化する。
発行側は購読側を知らず、購読の有無で発行側の不変条件は変わらない（`dynamic-model.md` の不変条件）。

## 現状コードの前提

- `packages/shared`（`@koma/shared`）は値オブジェクト Id / Money / Duration / TimeRange を持ち、`packages/shared/src/index.ts` から re-export している。
- `packages/shared/package.json:9-11` に scripts `check-types` / `test` / `lint`、`packages/shared/vitest.config.ts` で vitest 設定済み。
- `packages/shared/package.json` の dependencies に `next` / `react` / `drizzle-orm` / `zod` は無い（`model.md` B-4）。

## 要件

<!-- 最重量部: 型安全な subscribe（イベント名 → payload 型の対応）と、純粋な同期 in-memory 実装の不変条件。 -->

1. **DomainEvent 基底型**。全イベントが共有する形 `{ readonly name: string; readonly occurredAt: number }`（`occurredAt` は epoch ミリ秒）。具体イベント（各ドメインが定義）はこれを拡張する。

2. **EventBus port（interface）**。`publish(event)` と `subscribe(name, handler)` を持つ。`subscribe` は購読解除関数（`() => void`）を返す。**型安全**: イベント名 → payload 型の対応（EventMap）により、`subscribe(name, handler)` の handler は該当イベント型のみを受ける。

3. **同期 in-memory EventBus 実装**（純粋・依存ゼロ）。デフォルト／テスト用。`publish` は当該 `name` に登録済みの handler を**同期**で呼ぶ。delivery は port 経由でこの実装または別実装を注入できる。

4. すべて immutable な契約で、vitest テストを伴う。

5. `DomainEvent` / `EventBus` / in-memory 実装を `packages/shared/src/index.ts` から re-export する。

6. 禁止依存（`next` / `react` / `drizzle-orm` / `zod`）を増やさない（B-4）。

## スコープ外

- 非同期配送・キュー・イベントストア（永続化）
- 具体ドメインイベント（`BookingConfirmed` 等は各ドメインパッケージで定義）
- リトライ・配送失敗時のエラーポリシー（購読側／delivery の責務）
- 順序保証・トランザクション境界（後続 request / spec の範囲）

## 受け入れ基準

<!-- 機械検証できる文にする。 -->

- [ ] `DomainEvent` 基底型が `name: string` と `occurredAt: number` を持ち、具体イベント型が拡張できる（型レベルテスト）
- [ ] `EventBus` interface が `publish` と `subscribe` を持ち、`subscribe` が購読解除関数を返す
- [ ] in-memory 実装: `publish` した event が同じ `name` を `subscribe` した handler に渡る／別 `name` の handler には渡らない／`unsubscribe` 後は呼ばれない、をテストで固定する
- [ ] 型安全: `subscribe(name, handler)` の handler が該当イベント型を受ける（`@ts-expect-error` で誤った payload 型をガードしたテストがある）
- [ ] `grep -E '"(next|react|drizzle-orm|zod)"' packages/shared/package.json` が 0 件
- [ ] `DomainEvent` / `EventBus` / in-memory 実装が `@koma/shared` の `src/index.ts` から import 可能
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green

## architect 評価済みの設計判断

<!-- 採用案 + 却下案。 -->

- **同期 in-memory をデフォルト実装に**。却下: 最初から非同期/キュー（YAGNI。配送ポリシーは delivery の責務で、純粋同期なら発行→購読がテストで決定的に固定できる）。
- **イベント識別は `name`（string literal discriminant）＋ EventMap（name → payload 型）**で型安全な subscribe を実現する。却下: `instanceof` ベースの識別（直列化・跨境界・event の再構成で脆い）。
- **`occurredAt` は epoch ミリ秒 number**。shared の時刻表現（TimeRange と同じ数値ベース）に揃え、`Date` の可変性・tz 依存を避ける。
- **実装を shared に置く**理由: 純粋・依存ゼロで B-4 を破らない。`dynamic-model.md` の binder は「実装は delivery が注入」とするが、delivery が注入する対象としてこの純粋デフォルト実装を選べる（port 依存は保たれる）。
- **adr: true** の理由: `EventBus` port（新しいモジュール間 seam）を確立する構造決定で、以降の scheduling↔notification 等の連携の前提になるため記録する。
