# packages/scheduling に空き枠計算 availableSlots（純関数）を追加する

## Meta

- **type**: new-feature
- **slug**: available-slots
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 新しい port/adapter 追加、既存パターンと異なる設計選択、振る舞い/契約を変える修正、構造的リファクタリング → true。いずれにも該当しない → false -->

## 背景

予約の看板機能「空き枠計算」を scheduling に追加する。**開窓（絶対 `TimeRange`）× 所要 `Duration` × 既存 active 予約 × capacity** から予約可能枠を導出する。capacity-aware 整合性（既存の `canAccommodate`）を各候補枠に適用する。
scheduling は resource を import しない（B-5）ため、稼働時間は **絶対 `TimeRange` の開窓**として配信層が（`Availability` ＋ tz から解決して）渡す。`docs/アーキテクチャ/domain-model.md`: 空き枠は `(Availability × Resource × Service × active Bookings)` からの純粋導出で scheduling に属し、導出手順は behavior。

## 現状コードの前提

- `packages/scheduling` が `canAccommodate` / `Booking` / `BookingRepository` を持ち、`packages/scheduling/src/index.ts:7` で `canAccommodate` を export している。
- `@koma/shared` の `Duration` は `{ milliseconds: number }`（`packages/shared/src/duration.ts`）、`TimeRange` は絶対 epoch ミリ秒の半開区間で `createTimeRange` を持つ。
- `packages/scheduling` に `availableSlots` は未実装。

## 要件

<!-- 最重量部: 候補枠の生成（step・窓内収まり）と canAccommodate の再利用。 -->

1. **availableSlots（純関数）** を `packages/scheduling` に追加する。入力（オブジェクト引数）: `openWindows: TimeRange[]`（絶対開窓）/ `duration: Duration`（枠の長さ）/ `existingActive: Booking[]`（対象 Resource の active 予約）/ `capacity: number` / `step?: Duration`（候補開始の刻み、省略時は `duration`）。出力: 予約可能な枠 `TimeRange[]`（各 `[start, start + duration)`）。

2. 各開窓内で `step` 刻みに候補枠 `[start, start + duration)` を生成し、**窓に収まるもの（`start + duration <= window.end`）のみ**対象。各候補に `canAccommodate(existingActive, slot, capacity)` を適用し、true の枠だけ返す。

3. **1 枠は単一開窓内に収める**（開窓をまたがない＝休業の谷を跨ぐ枠を作らない）。出力は開始時刻の昇順。

4. 純関数（I/O を持たない）。vitest テスト付き。`availableSlots` を `src/index.ts` から export する。

5. 禁止依存（`next` / `react` / `drizzle-orm` / `zod`）を増やさない。

## スコープ外

- `Availability` → 絶対開窓への変換（配信層、tz 適用）
- 予約ユースケース・永続化
- 複数 Resource の集約（呼び出し側が Resource ごとに呼ぶ）
- 予約変更（reschedule）・キャンセル待ち

## 受け入れ基準

<!-- 機械検証できる文にする。 -->

- [ ] capacity が一杯（重なりが capacity 件）の時間帯の枠は出力されず、空きがある枠は出力される、をテストで固定する
- [ ] `step` 既定 = `duration`（back-to-back）で連続枠が出る／`step` 指定で候補粒度が変わる、をテストで固定する
- [ ] 窓に収まらない末尾（`start + duration > window.end`）は出力しない／開窓をまたぐ枠を作らない、をテストで固定する
- [ ] capacity-aware: `capacity = 2` で 1 件重なる時間帯の枠も予約可能として出力される（`canAccommodate` 経由）、をテストで固定する
- [ ] 出力が開始時刻の昇順であり、`availableSlots` が純関数である
- [ ] `grep -E '"(next|react|drizzle-orm|zod)"' packages/scheduling/package.json` が 0 件、`availableSlots` が `@koma/scheduling` の `src/index.ts` から import 可能
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green

## architect 評価済みの設計判断

<!-- 採用案 + 却下案。 -->

- **`canAccommodate` を再利用**（capacity 判定を一元化）。却下: `availableSlots` 内に重なり判定を再実装（二重実装・乖離リスク）。
- **開窓は絶対 `TimeRange` で受け取る**。scheduling は resource（`Availability`）を import しない（B-5）。`Availability` → 絶対開窓（tz 適用）は配信の責務。却下: `availableSlots` が `Availability` を直接受ける（B-5 違反・tz をドメインに持ち込む）。
- **`step` 既定 = `duration`（back-to-back）**、指定で固定グリッド。却下: `step` 必須（多くの場合 back-to-back で十分）。
- **1 枠は単一開窓内**（開窓をまたがない）。休業の谷を跨ぐ枠を作らない。
- 純関数（テスト可能・副作用なし）。
- **adr: false** の理由: 既存 `canAccommodate` を用いる behavior（アルゴリズム）の追加で、新 port / パターンの構造変更ではない。
