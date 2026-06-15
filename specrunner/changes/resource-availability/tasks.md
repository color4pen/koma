# Tasks: resource-availability

## T-01: DailyTimeRange 値オブジェクト（`src/daily-time-range.ts`）

- [ ] `DailyTimeRange` 型を定義する: `{ readonly open: number; readonly close: number }`
- [ ] `createDailyTimeRange(open: number, close: number): DailyTimeRange` ファクトリ関数を実装する:
  - `open` / `close` が整数でない場合に `throw`
  - `open < 0` または `close > 1440` で `throw`
  - `open >= close` で `throw`
  - 返却オブジェクトを `Object.freeze` する
- [ ] `dailyTimeRangeOverlaps(a: DailyTimeRange, b: DailyTimeRange): boolean` ヘルパー関数を実装する:
  - 半開区間 `[open, close)` の overlap 判定: `a.open < b.close && b.open < a.close`
- [ ] `isEqualDailyTimeRange(a: DailyTimeRange, b: DailyTimeRange): boolean` 等価判定を実装する
- [ ] `src/index.ts` から `DailyTimeRange` 型、`createDailyTimeRange`、`dailyTimeRangeOverlaps`、`isEqualDailyTimeRange` を export する

**Acceptance Criteria**:
- `createDailyTimeRange(0, 1440)` が成功する（全日）
- `createDailyTimeRange(540, 1020)` が成功する（9:00–17:00）
- `createDailyTimeRange(1020, 540)` が throw する（open >= close）
- `createDailyTimeRange(-1, 540)` が throw する（範囲外）
- `createDailyTimeRange(540, 1441)` が throw する（範囲外）
- `createDailyTimeRange(540.5, 1020)` が throw する（非整数）
- 返却値が `Object.isFrozen === true`
- `pnpm -F @koma/resource run check-types` が成功する

## T-02: DailyTimeRange テスト（`src/daily-time-range.test.ts`）

- [ ] `createDailyTimeRange` の正常系テスト:
  - `(540, 1020)` — 9:00–17:00 を構築できる
  - `(0, 1440)` — 全日を構築できる
  - `(0, 60)` — 0:00–1:00 を構築できる
  - 返却値が frozen である
- [ ] `createDailyTimeRange` の異常系テスト:
  - `open >= close`（同値、逆転）で throw
  - `open < 0` で throw
  - `close > 1440` で throw
  - 非整数で throw
- [ ] `dailyTimeRangeOverlaps` のテスト:
  - 重なるペア → `true`
  - 隣接（`close === open`）→ `false`（半開区間）
  - 離れたペア → `false`
- [ ] `isEqualDailyTimeRange` のテスト:
  - 同値 → `true`、異値 → `false`

**Acceptance Criteria**:
- `pnpm -F @koma/resource run test` で daily-time-range.test.ts の全テストが green

## T-03: Weekday 型 + Availability 値オブジェクト（`src/availability.ts`）

- [ ] `Weekday` 型を定義する: `0 | 1 | 2 | 3 | 4 | 5 | 6`（`0=Sunday .. 6=Saturday`）
- [ ] `Availability` 型を定義する:
  ```
  {
    readonly weeklyHours: ReadonlyMap<Weekday, readonly DailyTimeRange[]>;
    readonly exceptions: ReadonlyMap<string, readonly DailyTimeRange[]>;
  }
  ```
  - `weeklyHours`: 曜日 → その曜日の稼働時間帯配列
  - `exceptions`: ISO 日付文字列 `YYYY-MM-DD` → その日の稼働時間帯配列（空配列＝休業）
- [ ] `createAvailability` ファクトリ関数を実装する:
  - 引数: `{ weeklyHours?: Partial<Record<Weekday, DailyTimeRange[]>>; exceptions?: Record<string, DailyTimeRange[]> }`
  - 各曜日の `DailyTimeRange[]` 内で overlap がないことを検証する（`open` でソート → 隣接の `close > next.open` なら throw）
  - 各例外日の `DailyTimeRange[]` 内で overlap がないことを同様に検証する
  - 未指定の曜日は空配列（休業）として扱う
  - `DailyTimeRange[]` を `open` 昇順にソートして格納する（正規化）
  - 返却オブジェクトを `Object.freeze` する（Map 内の配列も frozen）
- [ ] `src/index.ts` から `Weekday` 型、`Availability` 型、`createAvailability` を export する

**Acceptance Criteria**:
- overlap のない `weeklyHours` / `exceptions` で正常に構築できる
- 同一曜日内で overlap する `DailyTimeRange` を与えると throw する
- 同一例外日内で overlap する `DailyTimeRange` を与えると throw する
- 隣接する `DailyTimeRange`（`[540,720)` + `[720,1020)`）は overlap しない → 構築成功
- 例外日に空配列を設定できる（休業）
- `pnpm -F @koma/resource run check-types` が成功する

## T-04: dailyHoursOn 純関数（`src/availability.ts` に追加）

- [ ] `dailyHoursOn(availability: Availability, date: string): readonly DailyTimeRange[]` を実装する:
  - `date` は ISO `YYYY-MM-DD` 形式
  - `availability.exceptions` に `date` キーがあれば、その値を返す（空配列＝休業→`[]`を返す）
  - なければ `date` から曜日を導出し、`availability.weeklyHours` の該当曜日の値を返す
  - 曜日導出: `new Date(date + 'T00:00:00Z').getUTCDay()` を使い tz 非依存にする
  - 不正な日付文字列の場合（`getUTCDay()` が `NaN`）は例外を送出する
- [ ] `src/index.ts` から `dailyHoursOn` を export する

**Acceptance Criteria**:
- 例外日が設定された日付 → 例外の `DailyTimeRange[]` を返す
- 例外日が空配列の日付 → `[]`（休業）を返す
- 例外がない日付 → その曜日の週次稼働を返す
- 週次稼働も未設定の曜日 → `[]` を返す
- 既知の日付で曜日導出が正しい（例: `2026-06-16` = 火曜日 = `2`）
- 不正な日付文字列で例外が送出される
- I/O を持たない（`Date.now()` / ファイル / ネットワーク呼び出しなし）

## T-05: Availability + dailyHoursOn テスト（`src/availability.test.ts`）

- [ ] `createAvailability` テスト — 正常系:
  - 月–金 9:00–17:00 の週次稼働を構築できる
  - 1 日に複数の時間帯（午前 + 午後）を設定できる（overlap なし）
  - 例外日（空配列＝休業）を設定できる
  - 例外日（特別営業時間）を設定できる
  - 全曜日未指定（`weeklyHours` 空）で構築できる
  - `weeklyHours` / `exceptions` 省略で構築できる
- [ ] `createAvailability` テスト — 異常系:
  - 同一曜日内で overlap する `DailyTimeRange` → throw
  - 同一例外日内で overlap する `DailyTimeRange` → throw
- [ ] `dailyHoursOn` テスト:
  - 例外日 → 例外の時間帯を返す
  - 例外日（空配列）→ `[]` を返す
  - 例外なし → 曜日の週次稼働を返す
  - 週次未設定の曜日 → `[]` を返す
  - 曜日導出の正確性: 既知の日付（`2026-06-14`=日, `2026-06-15`=月, `2026-06-16`=火, `2026-06-17`=水, `2026-06-18`=木, `2026-06-19`=金, `2026-06-20`=土）で正しい曜日の稼働を返す
  - 不正な日付文字列で throw

**Acceptance Criteria**:
- `pnpm -F @koma/resource run test` で availability.test.ts の全テストが green

## T-06: index.ts export 追加 + 全体検証

- [ ] `src/index.ts` に以下の export を追加する（既存 export を維持）:
  - `DailyTimeRange` 型、`createDailyTimeRange`、`dailyTimeRangeOverlaps`、`isEqualDailyTimeRange`（from `./daily-time-range.js`）
  - `Weekday` 型、`Availability` 型、`createAvailability`、`dailyHoursOn`（from `./availability.js`）
- [ ] `pnpm -F @koma/resource run check-types` が成功する
- [ ] `pnpm -F @koma/resource run test` が成功する
- [ ] `pnpm -F @koma/resource run lint` が成功する
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green
- [ ] `grep -E '"(next|react|drizzle-orm|zod)"' packages/resource/package.json` が 0 件

**Acceptance Criteria**:
- 上記 5 コマンドすべてが exit code 0
- 新規追加した型・関数が `@koma/resource` の `src/index.ts` から import 可能
- `package.json` に禁止依存が追加されていない
