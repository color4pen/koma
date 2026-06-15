# Spec: shared-kernel

## Requirements

### Requirement: Id の生成は有効な UUID v4 を返す

`createId` は `crypto.randomUUID()` で生成した UUID v4 文字列を branded type として返す。返却値は UUID v4 形式に適合し MUST NOT be empty。

#### Scenario: createId が UUID v4 形式の Id を生成する

**Given** 何も前提条件がない
**When** `createId<'Customer'>()` を呼ぶ
**Then** 返却値は UUID v4 正規表現 `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i` に一致する

#### Scenario: 2 回の createId は異なる値を返す

**Given** 何も前提条件がない
**When** `createId<'Customer'>()` を 2 回呼ぶ
**Then** 2 つの返却値は異なる（`!==`）

---

### Requirement: Id の parse は不正値を拒否する

`parseId` は文字列を受け取り UUID v4 形式を検証する。不正な文字列は拒否 SHALL throw an error。

#### Scenario: 有効な UUID 文字列を parse できる

**Given** UUID v4 形式の文字列 `"550e8400-e29b-41d4-a716-446655440000"`
**When** `parseId<'Booking'>(str)` を呼ぶ
**Then** 入力と値等価な `Id<'Booking'>` が返る

#### Scenario: 空文字を parse するとエラーになる

**Given** 空文字列 `""`
**When** `parseId<'Booking'>(str)` を呼ぶ
**Then** エラーが投げられる

#### Scenario: UUID 形式でない文字列を parse するとエラーになる

**Given** 文字列 `"not-a-uuid"`
**When** `parseId<'Booking'>(str)` を呼ぶ
**Then** エラーが投げられる

---

### Requirement: Id の等価判定は値ベースである

同一文字列から生成された Id は等価 SHALL be equal。異なる文字列からの Id は非等価。

#### Scenario: 同一文字列由来の Id は等価

**Given** UUID 文字列 `uuid` から `parseId<'Customer'>(uuid)` で 2 つの Id を生成
**When** 2 つの Id を `===` で比較する
**Then** `true` が返る

---

### Requirement: Money は整数の最小通貨単位のみを受け付ける

Money の `amount` は整数 MUST be an integer。小数を渡した場合はエラーで拒否する。

#### Scenario: 整数 amount で Money を生成できる

**Given** amount = 1000, currency = 'JPY'
**When** `createMoney(1000, 'JPY')` を呼ぶ
**Then** `amount` が 1000、`currency` が `'JPY'` の Money が返る

#### Scenario: 小数 amount は拒否される

**Given** amount = 10.5, currency = 'JPY'
**When** `createMoney(10.5, 'JPY')` を呼ぶ
**Then** エラーが投げられる

#### Scenario: 負の整数 amount は許可される

**Given** amount = -500, currency = 'JPY'（返金等のユースケース）
**When** `createMoney(-500, 'JPY')` を呼ぶ
**Then** `amount` が -500 の Money が返る

---

### Requirement: Money の通貨不一致演算はエラーになる

加算・減算において通貨が一致しない場合 MUST throw an error。サイレントな変換は行わない。

#### Scenario: 同一通貨の加算は成功する

**Given** Money A = 1000 JPY, Money B = 500 JPY
**When** `addMoney(A, B)` を呼ぶ
**Then** amount が 1500 の JPY Money が返る

#### Scenario: 同一通貨の減算は成功する

**Given** Money A = 1000 JPY, Money B = 300 JPY
**When** `subtractMoney(A, B)` を呼ぶ
**Then** amount が 700 の JPY Money が返る

#### Scenario: 異なる通貨の加算はエラーになる

**Given** Money A = 1000 JPY, Money B = 10 USD（将来の拡張を想定した例）
**When** `addMoney(A, B)` を呼ぶ
**Then** 通貨不一致エラーが投げられる

#### Scenario: 異なる通貨の減算はエラーになる

**Given** Money A = 1000 JPY, Money B = 10 USD
**When** `subtractMoney(A, B)` を呼ぶ
**Then** 通貨不一致エラーが投げられる

---

### Requirement: Money は不変である

Money オブジェクトは生成後に変更不可 SHALL be immutable。プロパティへの代入は失敗する。

#### Scenario: Money のプロパティを書き換えようとすると失敗する

**Given** `createMoney(1000, 'JPY')` で生成した Money
**When** `money.amount = 2000` を試みる
**Then** strict mode でエラーが投げられる（frozen object）

---

### Requirement: Duration は非負である

Duration のミリ秒値は非負 MUST be non-negative。負の値は構築時にエラーで拒否する。

#### Scenario: ofMinutes で Duration を生成できる

**Given** minutes = 30
**When** `ofMinutes(30)` を呼ぶ
**Then** milliseconds が 1_800_000 の Duration が返る

#### Scenario: ofHours で Duration を生成できる

**Given** hours = 1
**When** `ofHours(1)` を呼ぶ
**Then** milliseconds が 3_600_000 の Duration が返る

#### Scenario: 負のミリ秒は拒否される

**Given** milliseconds = -1
**When** `ofMilliseconds(-1)` を呼ぶ
**Then** エラーが投げられる

#### Scenario: ゼロの Duration は許可される

**Given** milliseconds = 0
**When** `ofMilliseconds(0)` を呼ぶ
**Then** milliseconds が 0 の Duration が返る

---

### Requirement: TimeRange は start < end の半開区間である

TimeRange は `[start, end)` の半開区間を表す。`start >= end` での構築は MUST throw an error。

#### Scenario: start < end で TimeRange を構築できる

**Given** start = 1000, end = 2000（epoch ミリ秒）
**When** `createTimeRange(1000, 2000)` を呼ぶ
**Then** start が 1000、end が 2000 の TimeRange が返る

#### Scenario: start == end は拒否される

**Given** start = 1000, end = 1000
**When** `createTimeRange(1000, 1000)` を呼ぶ
**Then** エラーが投げられる

#### Scenario: start > end は拒否される

**Given** start = 2000, end = 1000
**When** `createTimeRange(2000, 1000)` を呼ぶ
**Then** エラーが投げられる

---

### Requirement: TimeRange の overlaps は半開区間の意味論に従う

`overlaps` は 2 つの TimeRange が重複するかを判定する。隣接（前枠の `end` === 次枠の `start`）は overlap としない SHALL NOT overlap。これが二重予約判定の基礎となる。

#### Scenario: 完全に重なる区間は overlap

**Given** A = [100, 300), B = [100, 300)
**When** `overlaps(A, B)` を呼ぶ
**Then** `true` が返る

#### Scenario: 部分的に重なる区間は overlap

**Given** A = [100, 300), B = [200, 400)
**When** `overlaps(A, B)` を呼ぶ
**Then** `true` が返る

#### Scenario: 一方が他方を包含する場合は overlap

**Given** A = [100, 400), B = [200, 300)
**When** `overlaps(A, B)` を呼ぶ
**Then** `true` が返る

#### Scenario: 隣接する区間は overlap しない

**Given** A = [100, 200), B = [200, 300)
**When** `overlaps(A, B)` を呼ぶ
**Then** `false` が返る

#### Scenario: 完全に離れた区間は overlap しない

**Given** A = [100, 200), B = [300, 400)
**When** `overlaps(A, B)` を呼ぶ
**Then** `false` が返る

#### Scenario: overlaps は対称である

**Given** A = [100, 300), B = [200, 400)
**When** `overlaps(A, B)` と `overlaps(B, A)` を呼ぶ
**Then** 両方とも `true` が返る

---

### Requirement: TimeRange の contains は時点の包含を半開区間で判定する

`contains` は TimeRange が指定時点（epoch ミリ秒）を含むかを判定する。半開区間なので `start` は含み `end` は含まない SHALL include start and exclude end。

#### Scenario: start 時点は含まれる

**Given** range = [100, 300), point = 100
**When** `contains(range, 100)` を呼ぶ
**Then** `true` が返る

#### Scenario: 区間内の時点は含まれる

**Given** range = [100, 300), point = 200
**When** `contains(range, 200)` を呼ぶ
**Then** `true` が返る

#### Scenario: end 時点は含まれない

**Given** range = [100, 300), point = 300
**When** `contains(range, 300)` を呼ぶ
**Then** `false` が返る

#### Scenario: 区間外の時点は含まれない

**Given** range = [100, 300), point = 50
**When** `contains(range, 50)` を呼ぶ
**Then** `false` が返る

---

### Requirement: TimeRange の duration は区間の長さを Duration として返す

`duration` は TimeRange の長さ（`end - start`）を Duration 値オブジェクトとして返す MUST return Duration。

#### Scenario: duration は end - start のミリ秒を Duration で返す

**Given** range = [1000, 3000)
**When** `duration(range)` を呼ぶ
**Then** milliseconds が 2000 の Duration が返る
