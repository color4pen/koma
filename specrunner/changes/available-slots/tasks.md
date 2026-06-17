# Tasks: packages/scheduling — availableSlots 純関数

## T-01: `availableSlots` 関数の実装（`src/available-slots.ts`）

- [ ] `src/available-slots.ts` を新規作成する
- [ ] `@koma/shared` から `TimeRange`, `Duration`, `createTimeRange` を import する
- [ ] `./booking.js` から `Booking` 型を import する
- [ ] `./can-accommodate.js` から `canAccommodate` を import する
- [ ] 関数シグネチャを実装する:
  ```typescript
  export function availableSlots(params: {
    openWindows: TimeRange[];
    duration: Duration;
    existingActive: Booking[];
    capacity: number;
    step?: Duration;
  }): TimeRange[]
  ```
- [ ] `effectiveStep` を `step ?? duration` で決定する
- [ ] `openWindows` を `start` 昇順でソートする（元配列を変更しないよう `.slice().sort()` を使う）
- [ ] 各開窓について cursor を `window.start` から開始し、`cursor + duration.milliseconds <= window.end` の間ループする:
  - `createTimeRange(cursor, cursor + duration.milliseconds)` で候補枠を生成
  - `canAccommodate(existingActive, candidateSlot, capacity)` で判定
  - `true` なら結果配列に追加
  - cursor を `effectiveStep.milliseconds` だけ進める
- [ ] 結果配列を返す

**Acceptance Criteria**:
- `src/available-slots.ts` が存在し、`availableSlots` 関数を named export している
- `canAccommodate` を `./can-accommodate.js` から import して使用している（再実装していない）
- 禁止依存（`next` / `react` / `drizzle-orm` / `zod`）を import していない
- `pnpm -F @koma/scheduling run check-types` が成功する

## T-02: barrel export に `availableSlots` を追加（`src/index.ts`）

- [ ] `src/index.ts` に `export { availableSlots } from './available-slots.js';` を追加する

**Acceptance Criteria**:
- `import { availableSlots } from '@koma/scheduling'` が型チェックを通る
- `pnpm -F @koma/scheduling run check-types` が成功する

## T-03: `availableSlots` のテスト（`src/available-slots.test.ts`）

- [ ] `src/available-slots.test.ts` を新規作成する
- [ ] テストヘルパー: `makeActiveBooking(start, end)` を定義する（`can-accommodate.test.ts` と同パターンで `createBooking` + `createId` + `createTimeRange` を使用）
- [ ] テストケース — capacity が一杯の枠は除外される:
  - 開窓 `[0, 120)` / `duration = 60` / 既存 `[0, 120)` 1 件 / `capacity = 1` → 空配列
  - 開窓 `[0, 180)` / `duration = 60` / 既存 `[0, 60)` 1 件 / `capacity = 1` → `[60, 120)` と `[120, 180)` のみ
- [ ] テストケース — step 既定 = duration（back-to-back）:
  - 開窓 `[0, 180)` / `duration = 60` / 既存なし / `capacity = 1` / `step` 省略 → `[0, 60)`, `[60, 120)`, `[120, 180)` の 3 枠
- [ ] テストケース — step 指定で候補粒度が変わる:
  - 開窓 `[0, 120)` / `duration = 60` / 既存なし / `capacity = 1` / `step = 30` → `[0, 60)`, `[30, 90)`, `[60, 120)` の 3 枠
- [ ] テストケース — 窓に収まらない末尾は除外:
  - 開窓 `[0, 90)` / `duration = 60` / 既存なし / `capacity = 1` → `[0, 60)` の 1 枠のみ
  - 開窓 `[0, 30)` / `duration = 60` → 空配列
- [ ] テストケース — 開窓をまたぐ枠を作らない:
  - 開窓 `[0, 60)` と `[120, 180)` / `duration = 60` / 既存なし / `capacity = 1` → `[0, 60)` と `[120, 180)` の 2 枠（ギャップ部分なし）
- [ ] テストケース — capacity-aware（canAccommodate 経由）:
  - 開窓 `[0, 120)` / `duration = 60` / 既存 `[0, 60)` 1 件 / `capacity = 2` → `[0, 60)` と `[60, 120)` の 2 枠（1+1=2 ≤ 2）
  - 開窓 `[0, 120)` / `duration = 60` / 既存 `[0, 60)` 2 件 / `capacity = 2` → `[60, 120)` の 1 枠のみ（2+1=3 > 2）
- [ ] テストケース — 出力が開始時刻の昇順:
  - 開窓を逆順 `[120, 180)`, `[0, 60)` で渡す → `[0, 60)`, `[120, 180)` の順で返る
- [ ] テストケース — 純関数（同一入力で 2 回呼んで同一結果）:
  - 同一引数で 2 回呼び出し、結果が deep equal である
- [ ] テストケース — 既存予約なしで空の開窓リスト:
  - `openWindows = []` → 空配列

**Acceptance Criteria**:
- `pnpm -F @koma/scheduling run test` で `available-slots.test.ts` の全テストが green
- capacity が一杯の枠が除外されることをテストで固定している
- step 既定 = duration の back-to-back とstep 指定の候補粒度変化をテストで固定している
- 窓に収まらない末尾除外と開窓またぎ防止をテストで固定している
- capacity=2 で 1 件重なり時に予約可能として出力されることをテストで固定している

## T-04: 全体検証

- [ ] `pnpm -F @koma/scheduling run check-types` が成功する
- [ ] `pnpm -F @koma/scheduling run test` が成功する
- [ ] `pnpm -F @koma/scheduling run lint` が成功する
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green（他パッケージへの影響がない）
- [ ] `grep -E '"(next|react|drizzle-orm|zod)"' packages/scheduling/package.json` が 0 件
- [ ] `availableSlots` が `@koma/scheduling` の `src/index.ts` から export されている

**Acceptance Criteria**:
- 上記 6 項目すべてが期待通り
