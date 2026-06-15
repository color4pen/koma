# Spec: resource-availability

## Requirements

### Requirement: DailyTimeRange は分 from midnight の半開区間で不変条件を強制する

`createDailyTimeRange` は `open` と `close` がともに整数であり、`0 <= open < close <= 1440` を満たさない場合、構築を拒否して例外を送出 SHALL する。返却される `DailyTimeRange` は frozen SHALL である。

#### Scenario: 有効な営業時間帯を構築できる

**Given** `open: 540`, `close: 1020`（9:00–17:00）
**When** `createDailyTimeRange(540, 1020)` を呼び出す
**Then** `DailyTimeRange` が返り、`open` は 540、`close` は 1020

#### Scenario: 全日の時間帯を構築できる

**Given** `open: 0`, `close: 1440`（0:00–24:00）
**When** `createDailyTimeRange(0, 1440)` を呼び出す
**Then** `DailyTimeRange` が返り、`open` は 0、`close` は 1440

#### Scenario: open >= close のとき構築に失敗する

**Given** `open: 1020`, `close: 540`（逆転）
**When** `createDailyTimeRange(1020, 540)` を呼び出す
**Then** 例外が送出される

#### Scenario: open と close が同値のとき構築に失敗する

**Given** `open: 540`, `close: 540`
**When** `createDailyTimeRange(540, 540)` を呼び出す
**Then** 例外が送出される

#### Scenario: 範囲外の値で構築に失敗する

**Given** `open: -1`, `close: 540`
**When** `createDailyTimeRange(-1, 540)` を呼び出す
**Then** 例外が送出される

#### Scenario: close が 1440 を超えると構築に失敗する

**Given** `open: 540`, `close: 1441`
**When** `createDailyTimeRange(540, 1441)` を呼び出す
**Then** 例外が送出される

#### Scenario: 非整数で構築に失敗する

**Given** `open: 540.5`, `close: 1020`
**When** `createDailyTimeRange(540.5, 1020)` を呼び出す
**Then** 例外が送出される

### Requirement: DailyTimeRange の overlap 判定は半開区間で行う

`dailyTimeRangeOverlaps` は 2 つの `DailyTimeRange` が半開区間 `[open, close)` として重なるかを判定 SHALL する。隣接（`a.close === b.open`）は overlap しない。

#### Scenario: 重なる時間帯は overlap と判定される

**Given** `a = [540, 1020)`, `b = [720, 1080)`
**When** `dailyTimeRangeOverlaps(a, b)` を呼び出す
**Then** `true` が返る

#### Scenario: 隣接する時間帯は overlap しない

**Given** `a = [540, 720)`, `b = [720, 1020)`
**When** `dailyTimeRangeOverlaps(a, b)` を呼び出す
**Then** `false` が返る

#### Scenario: 離れた時間帯は overlap しない

**Given** `a = [540, 720)`, `b = [780, 1020)`
**When** `dailyTimeRangeOverlaps(a, b)` を呼び出す
**Then** `false` が返る

### Requirement: Availability は overlap する DailyTimeRange の組み合わせを拒否する

`createAvailability` は同一曜日または同一例外日付内で `DailyTimeRange` が相互に overlap する場合、構築を拒否して例外を送出 SHALL する。

#### Scenario: overlap のない複数時間帯で構築できる

**Given** 月曜に `[540, 720)` と `[780, 1020)` の 2 時間帯
**When** `createAvailability` を呼び出す
**Then** `Availability` が正常に構築される

#### Scenario: 隣接する時間帯で構築できる

**Given** 月曜に `[540, 720)` と `[720, 1020)` の 2 時間帯（隣接）
**When** `createAvailability` を呼び出す
**Then** `Availability` が正常に構築される（半開区間で隣接は overlap しない）

#### Scenario: 同一曜日内で overlap すると構築に失敗する

**Given** 月曜に `[540, 780)` と `[720, 1020)` の 2 時間帯（overlap）
**When** `createAvailability` を呼び出す
**Then** 例外が送出される

#### Scenario: 同一例外日内で overlap すると構築に失敗する

**Given** 例外日 `2026-06-16` に `[540, 780)` と `[720, 1020)` の 2 時間帯（overlap）
**When** `createAvailability` を呼び出す
**Then** 例外が送出される

### Requirement: Availability の例外日に空配列を設定することで休業を表現する

例外日に空の `DailyTimeRange[]` を設定することで「その日は休業」を表現 SHALL する。

#### Scenario: 例外日に空配列を設定できる

**Given** 例外日 `2026-12-25` に `[]`（空配列）を設定した `Availability`
**When** `createAvailability` を呼び出す
**Then** `Availability` が正常に構築される

### Requirement: dailyHoursOn は例外日を週次稼働より優先して返す

`dailyHoursOn` は `date` に対応する例外があれば例外を返し、なければその曜日の週次稼働を返す SHALL。例外日が空配列の場合は休業として `[]` を返す SHALL。

#### Scenario: 例外日は例外の時間帯を返す

**Given** 月–金 `[540, 1020)` の週次稼働 + 例外日 `2026-06-16`（火曜）に `[600, 900)`
**When** `dailyHoursOn(availability, '2026-06-16')` を呼び出す
**Then** `[{ open: 600, close: 900 }]` が返る（例外が優先される）

#### Scenario: 例外日が空配列なら休業

**Given** 月–金 `[540, 1020)` の週次稼働 + 例外日 `2026-12-25` に `[]`
**When** `dailyHoursOn(availability, '2026-12-25')` を呼び出す
**Then** `[]` が返る

#### Scenario: 例外なしの日は曜日の週次稼働を返す

**Given** 月–金 `[540, 1020)` の週次稼働、例外なし
**When** `dailyHoursOn(availability, '2026-06-16')`（火曜）を呼び出す
**Then** `[{ open: 540, close: 1020 }]` が返る

#### Scenario: 週次稼働が未設定の曜日は空配列を返す

**Given** 月–金 `[540, 1020)` の週次稼働（土日は未設定）
**When** `dailyHoursOn(availability, '2026-06-14')`（日曜）を呼び出す
**Then** `[]` が返る

### Requirement: dailyHoursOn の曜日導出はカレンダー日付から決定的である

`dailyHoursOn` は ISO `YYYY-MM-DD` 日付文字列から tz 非依存で曜日を導出 SHALL する。導出結果は既知のカレンダーと一致 MUST する。

#### Scenario: 2026-06-14 は日曜日として導出される

**Given** 日曜に `[600, 900)` を設定した `Availability`
**When** `dailyHoursOn(availability, '2026-06-14')` を呼び出す
**Then** `[{ open: 600, close: 900 }]` が返る（日曜 = Weekday 0）

#### Scenario: 2026-06-15 は月曜日として導出される

**Given** 月曜に `[540, 1020)` を設定した `Availability`
**When** `dailyHoursOn(availability, '2026-06-15')` を呼び出す
**Then** `[{ open: 540, close: 1020 }]` が返る（月曜 = Weekday 1）

#### Scenario: 2026-06-20 は土曜日として導出される

**Given** 土曜に `[600, 720)` を設定した `Availability`
**When** `dailyHoursOn(availability, '2026-06-20')` を呼び出す
**Then** `[{ open: 600, close: 720 }]` が返る（土曜 = Weekday 6）

### Requirement: dailyHoursOn は純関数である

`dailyHoursOn` は I/O（ファイル・ネットワーク・`Date.now()`）を持たない純関数 SHALL である。同じ入力に対して常に同じ出力を返す。

#### Scenario: 同一入力で同一出力を返す

**Given** 固定の `Availability` と日付 `2026-06-16`
**When** `dailyHoursOn` を 2 回呼び出す
**Then** 両方の結果が同一（deep equal）
