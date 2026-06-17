# Spec: packages/scheduling — availableSlots 純関数

## Requirements

### Requirement: availableSlots は開窓内で capacity に空きがある枠のみを返す

`availableSlots` は各開窓内で `step` 刻みに候補枠を生成し、`canAccommodate` による capacity 判定を通過した枠のみを返す SHALL。capacity が一杯の時間帯の枠は出力から除外される。

#### Scenario: capacity=1 で重なる予約がない場合、全候補枠が返る

**Given** 開窓 `[0, 120)` / `duration = 60` / `existingActive = []` / `capacity = 1`
**When** `availableSlots` を呼び出す
**Then** `[0, 60)` と `[60, 120)` の 2 枠が返る

#### Scenario: capacity=1 で全枠が塞がっている場合、空配列が返る

**Given** 開窓 `[0, 120)` / `duration = 60` / `existingActive` に `[0, 120)` の Booking 1 件 / `capacity = 1`
**When** `availableSlots` を呼び出す
**Then** 空配列が返る

#### Scenario: capacity=1 で一部の枠のみ重なる場合、空きのある枠だけが返る

**Given** 開窓 `[0, 180)` / `duration = 60` / `existingActive` に `[0, 60)` の Booking 1 件 / `capacity = 1`
**When** `availableSlots` を呼び出す
**Then** `[60, 120)` と `[120, 180)` の 2 枠が返る（`[0, 60)` は除外）

### Requirement: step 既定値は duration であり、step 指定で候補粒度が変わる

`step` 省略時は `duration` と同じ値を既定値として back-to-back の候補枠を生成 SHALL する。`step` を明示指定した場合はその刻みで候補枠を生成 SHALL する。

#### Scenario: step 省略（既定 = duration）で back-to-back の連続枠が出る

**Given** 開窓 `[0, 180)` / `duration = 60` / `existingActive = []` / `capacity = 1` / `step` 省略
**When** `availableSlots` を呼び出す
**Then** `[0, 60)`, `[60, 120)`, `[120, 180)` の 3 枠が返る

#### Scenario: step = 30 で 60 分枠を 30 分刻みに候補生成する

**Given** 開窓 `[0, 120)` / `duration = 60` / `existingActive = []` / `capacity = 1` / `step = 30`
**When** `availableSlots` を呼び出す
**Then** `[0, 60)`, `[30, 90)`, `[60, 120)` の 3 枠が返る

### Requirement: 窓に収まらない末尾候補は出力しない

候補枠 `[start, start + duration)` が開窓の end を超える場合（`start + duration > window.end`）、その候補は生成しない SHALL。

#### Scenario: duration が窓の残り幅を超える候補は生成されない

**Given** 開窓 `[0, 90)` / `duration = 60` / `existingActive = []` / `capacity = 1` / `step` 省略
**When** `availableSlots` を呼び出す
**Then** `[0, 60)` の 1 枠のみ返る（`[60, 120)` は `window.end = 90` を超えるため除外）

#### Scenario: 開窓の幅が duration 未満なら空配列が返る

**Given** 開窓 `[0, 30)` / `duration = 60` / `existingActive = []` / `capacity = 1`
**When** `availableSlots` を呼び出す
**Then** 空配列が返る

### Requirement: 1 枠は単一開窓内に収まり、開窓をまたがない

候補枠は生成元の開窓に完全に含まれる SHALL。複数開窓間の谷を跨ぐ枠は生成しない。

#### Scenario: 2 つの開窓の間にギャップがある場合、ギャップを跨ぐ枠は生成されない

**Given** 開窓 `[0, 60)` と `[120, 180)` / `duration = 60` / `existingActive = []` / `capacity = 1`
**When** `availableSlots` を呼び出す
**Then** `[0, 60)` と `[120, 180)` の 2 枠が返る（`[60, 120)` のようなギャップを跨ぐ枠は生成されない）

### Requirement: capacity-aware で canAccommodate 経由の判定を行う

`availableSlots` は各候補枠に対して `canAccommodate(existingActive, candidateSlot, capacity)` を呼び出し、`true` の枠のみ返す SHALL。capacity > 1 の場合、重なりが capacity 未満であれば予約可能として出力する。

#### Scenario: capacity=2 で 1 件重なる時間帯の枠も予約可能として返る

**Given** 開窓 `[0, 120)` / `duration = 60` / `existingActive` に `[0, 60)` の Booking 1 件 / `capacity = 2`
**When** `availableSlots` を呼び出す
**Then** `[0, 60)` と `[60, 120)` の 2 枠が返る（`[0, 60)` は既存 1 件 + 提案 1 件 = 2 ≤ capacity 2 で通過）

#### Scenario: capacity=2 で 2 件重なる時間帯の枠は返らない

**Given** 開窓 `[0, 120)` / `duration = 60` / `existingActive` に `[0, 60)` の Booking 2 件 / `capacity = 2`
**When** `availableSlots` を呼び出す
**Then** `[60, 120)` の 1 枠が返る（`[0, 60)` は既存 2 件 + 提案 1 件 = 3 > capacity 2 で除外）

### Requirement: 出力は開始時刻の昇順である

`availableSlots` の出力は `start` の昇順でソートされている SHALL。入力 `openWindows` の順序に依存しない。

#### Scenario: 逆順で渡された開窓でも出力は start 昇順

**Given** 開窓 `[120, 180)` と `[0, 60)` (逆順) / `duration = 60` / `existingActive = []` / `capacity = 1`
**When** `availableSlots` を呼び出す
**Then** `[0, 60)`, `[120, 180)` の順で返る

### Requirement: availableSlots は純関数である

`availableSlots` は I/O を持たず、同一入力に対して常に同一出力を返す SHALL。引数を変更しない。

#### Scenario: 同一入力で 2 回呼び出すと同一出力が返る

**Given** 同一の `openWindows` / `duration` / `existingActive` / `capacity` / `step`
**When** `availableSlots` を 2 回呼び出す
**Then** 2 回とも同一の結果が返る

### Requirement: availableSlots は `@koma/scheduling` の `src/index.ts` から export される

`availableSlots` は barrel export を通じて `@koma/scheduling` から import 可能 SHALL である。

#### Scenario: index.ts から availableSlots が import できる

**Given** `packages/scheduling/src/index.ts` に `availableSlots` の export が含まれる
**When** `import { availableSlots } from '@koma/scheduling'` を記述する
**Then** 型チェック（`pnpm -F @koma/scheduling run check-types`）が成功する
