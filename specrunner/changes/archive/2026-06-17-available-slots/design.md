# Design: packages/scheduling — availableSlots 純関数

## Context

`packages/scheduling` は Booking 集約・BookingStatus 状態機械・`canAccommodate`（capacity-aware 二重予約整合性判定）を持つ。予約の看板機能である「空き枠計算」を純関数 `availableSlots` として追加する。

開窓（絶対 `TimeRange`）× 所要 `Duration` × 既存 active 予約 × capacity から予約可能枠を導出する。capacity-aware 整合性は既存の `canAccommodate` を再利用する。

### 現状コードの前提

- `canAccommodate(existingActive: Booking[], slot: TimeRange, capacity: number): boolean` が `packages/scheduling/src/can-accommodate.ts` に実装済みで `src/index.ts` から export されている。スイープライン方式で提案 slot を加えた最大同時重なり数が capacity 以下かを判定する。
- `@koma/shared` の `Duration` は `{ readonly milliseconds: number }`、`TimeRange` は `{ readonly start: number; readonly end: number }` で epoch ミリ秒の半開区間 `[start, end)`。`createTimeRange(start, end)` は `start < end` をガードする。
- `Booking` 型は `slot: TimeRange` フィールドを持ち、`canAccommodate` はこのフィールドを参照する。
- scheduling は resource を import しない（B-5）。稼働時間は配信層が `Availability` + tz から解決した絶対 `TimeRange` の開窓として渡す。

## Goals / Non-Goals

**Goals**:

- `availableSlots` 純関数を `packages/scheduling` に追加する
- 開窓内で step 刻みに候補枠を生成し、`canAccommodate` で capacity 判定して予約可能枠を返す
- `src/index.ts` から export する
- vitest テストで受け入れ基準を固定する

**Non-Goals**:

- `Availability` → 絶対開窓への変換（配信層・tz 適用の責務）
- 予約ユースケース・永続化
- 複数 Resource の集約（呼び出し側が Resource ごとに呼ぶ）
- 予約変更（reschedule）・キャンセル待ち

## Decisions

### D1: `canAccommodate` を再利用する

各候補枠の capacity 判定に既存の `canAccommodate` をそのまま呼び出す。capacity 判定ロジックを一元化し、二重実装・乖離リスクを排除する。

**Rationale**: capacity-aware 判定は `canAccommodate` に一元化されている。再利用すればスイープライン方式の正確性を享受でき、将来の capacity 判定ルール変更時も一箇所の修正で済む。

**Alternatives considered**: `availableSlots` 内に重なり判定を再実装 → 却下。二重実装で乖離リスクがある（architect 却下済み）。

### D2: 開窓は絶対 `TimeRange` で受け取る

scheduling は resource（`Availability`）を import しない（B-5）。`Availability` → 絶対開窓（tz 適用）は配信層の責務であり、`availableSlots` は変換済みの `TimeRange[]` を受け取る。

**Rationale**: B-5（兄弟コンテキスト非依存）を維持する。ドメイン層に tz 変換を持ち込まず、純粋な時間演算に閉じる。

**Alternatives considered**: `availableSlots` が `Availability` を直接受ける → 却下。B-5 違反で tz をドメインに持ち込む（architect 却下済み）。

### D3: `step` 既定値は `duration`（back-to-back）

`step` を省略した場合は `duration` と同じ値を使い、隙間なく連続する候補枠を生成する。

**Rationale**: 多くの予約シナリオ（60 分施術を連続で埋める等）では back-to-back が自然。明示指定は 15 分刻みグリッド等の高度なケースに限定する。

**Alternatives considered**: `step` を必須引数にする → 却下。多くの場合 back-to-back で十分であり、冗長な引数指定を強いる（architect 却下済み）。

### D4: 1 枠は単一開窓内に収める

候補枠 `[start, start + duration)` は生成元の開窓 `[window.start, window.end)` に完全に収まる必要がある（`start + duration.milliseconds <= window.end`）。開窓をまたぐ枠は生成しない。

**Rationale**: 休業の谷を跨ぐ予約枠の生成を防ぐ。各開窓を独立に処理することで実装もシンプルになる。

**Alternatives considered**: 開窓をまたぐ枠を許容する → 却下。休業時間を跨ぐ予約が生成される（architect 却下済み）。

### D5: 出力は開始時刻の昇順

入力 `openWindows` の順序に依存しないよう、内部で start 昇順にソートしてからイテレートする。各開窓内の候補も cursor が昇順に進むため、出力は自然にソート済みとなる。

**Rationale**: 呼び出し側がソートする手間を排除し、テストの決定性を保証する。

**Alternatives considered**: 出力順を未定義にする → 却下。テストの決定性が下がり、呼び出し側に不要な責務が生じる。

### D6: 関数シグネチャはオブジェクト引数

```typescript
function availableSlots(params: {
  openWindows: TimeRange[];
  duration: Duration;
  existingActive: Booking[];
  capacity: number;
  step?: Duration;
}): TimeRange[]
```

**Rationale**: 引数が 4-5 個と多いため、オブジェクト引数で可読性を確保する。要件の仕様通り。

### D7: ファイル配置は `src/available-slots.ts` + `src/available-slots.test.ts`

**Rationale**: 既存パッケージのファイル命名規約（kebab-case、sibling テスト）に従う。`can-accommodate.ts` と同階層に配置する。

## Algorithm

```
function availableSlots({ openWindows, duration, existingActive, capacity, step }):
  effectiveStep = step ?? duration
  sortedWindows = openWindows.slice().sort((a, b) => a.start - b.start)
  result: TimeRange[] = []
  for each window in sortedWindows:
    cursor = window.start
    while cursor + duration.milliseconds <= window.end:
      candidateSlot = createTimeRange(cursor, cursor + duration.milliseconds)
      if canAccommodate(existingActive, candidateSlot, capacity):
        result.push(candidateSlot)
      cursor += effectiveStep.milliseconds
  return result
```

- 各開窓を独立に処理するため、開窓をまたぐ枠は生成されない
- 開窓を start 昇順でソートし、各開窓内も cursor が昇順に進むため、出力は自然に start 昇順
- `canAccommodate` が capacity 判定を担うため、重なり判定のロジック重複なし

## Risks / Trade-offs

- **[Risk]** 大量の開窓 × 細かい step で候補数が膨張する → **Mitigation**: 本関数は純関数であり、呼び出し側（配信層）が開窓数・step を制御する。典型的な 1 日の開窓（8h）× 30 分枠で最大 16 候補程度であり、現時点では制限不要。
- **[Trade-off]** `canAccommodate` を候補枠ごとに呼び出すため、候補数 × 既存予約数の計算量になる → **Mitigation**: 典型的な規模では性能問題は発生しない。将来必要になればスイープライン一括最適化を検討する。

## Open Questions

なし。architect 評価済みの設計判断を踏襲し、既存 `canAccommodate` の活用パターンであるため未決定事項はない。
