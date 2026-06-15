# packages/resource に Availability（週次稼働 ＋ 例外）と日次稼働時間の導出を追加する

## Meta

- **type**: new-feature
- **slug**: resource-availability
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 新しい port/adapter 追加、既存パターンと異なる設計選択、振る舞い/契約を変える修正、構造的リファクタリング → true。いずれにも該当しない → false -->

## 背景

`resource` コンテキストに稼働ルール `Availability` を追加する。週次の営業時間（曜日ごとの**日内時間帯**）＋ 日付例外（休業・特別営業）を持ち、ある日の日内稼働時間帯を導出する。これが空き枠計算（scheduling、別 request）の供給側入力になる。
**日内時間は絶対時刻 `TimeRange` とは別概念**（曜日・カレンダー日付で定義、tz 非依存）であり、絶対時刻への変換は配信層の責務（`docs/アーキテクチャ/model.md`: `TimeRange` は絶対値のみ、表示 tz は配信）。

## 現状コードの前提

- `packages/resource`（`@koma/resource`）が `Resource` / `ResourceRepository` / in-memory 実装を持ち、`packages/resource/src/index.ts` から export している。`@koma/shared` に `workspace:*` 依存、scripts `check-types` / `test` / `lint`。
- `@koma/shared` の `TimeRange`（`packages/shared/src/index.ts:23-`）は**絶対時刻（epoch ミリ秒）の半開区間**。日内の繰り返し時間帯はこれと別概念。
- `docs/アーキテクチャ/domain-model.md` が `Availability` を resource コンテキスト（`Resource` の稼働ルール）と定める。
- `packages/resource` に `Availability` 関連の型は未実装。

## 要件

<!-- 最重量部: 日内時間（分 from midnight）と絶対時刻の型分離、overlap 不変条件、曜日のカレンダー導出。 -->

1. **DailyTimeRange（日内時間帯・値オブジェクト）**。真夜中からの分で `open` / `close`（半開区間）を持つ。不変条件: `0 <= open < close <= 1440`。絶対時刻 `TimeRange` とは別型。

2. **Weekday**。曜日（`0=日曜 .. 6=土曜`、または同等の列挙）。

3. **Availability（値オブジェクト・immutable）**。週次稼働（各 `Weekday` → `DailyTimeRange[]`）＋ 例外（カレンダー日付 ISO `YYYY-MM-DD` → `DailyTimeRange[]`。**空配列＝その日は休業**）。不変条件: 各曜日 / 各例外の `DailyTimeRange[]` は相互に overlap しない。

4. **dailyHoursOn(availability, date): DailyTimeRange[]**（純関数）。`date`（ISO `YYYY-MM-DD`）に例外があれば例外を返す（空なら休業＝`[]`）、無ければその**曜日**の週次稼働を返す。曜日は**カレンダー日付から決定的に導出**する（tz 非依存）。

5. すべて immutable・vitest テスト付き。型・関数を `src/index.ts` から export する。

6. 禁止依存（`next` / `react` / `drizzle-orm` / `zod`）を増やさない（B-1〜B-4）。

## スコープ外

- `DailyTimeRange` → 絶対 `TimeRange` への変換（tz が必要＝配信層の責務）
- `Resource` 集約への `availability` フィールド配線（別 request / 必要時）
- 空き枠計算（`availableSlots`、scheduling、別 request）
- 複雑な繰り返し（隔週・毎月第 n 週等の recurrence）
- 永続化

## 受け入れ基準

<!-- 機械検証できる文にする。 -->

- [ ] `DailyTimeRange`: `open >= close` や範囲外（`< 0` / `> 1440`）で構築できないことをテストで固定する
- [ ] `Availability`: 同一曜日 / 同一例外日内で overlap する `DailyTimeRange` を与えると構築できないことをテストで固定する
- [ ] `dailyHoursOn`: 例外日は例外を返す（空例外 ＝ 休業 ＝ `[]`）／例外なしはその曜日の週次を返す／**既知の日付 → 曜日の導出が正しい**ことをテストで固定する
- [ ] `dailyHoursOn` が純関数（I/O を持たない）
- [ ] `grep -E '"(next|react|drizzle-orm|zod)"' packages/resource/package.json` が 0 件、追加型・関数が `@koma/resource` の `src/index.ts` から import 可能
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green

## architect 評価済みの設計判断

<!-- 採用案 + 却下案。 -->

- **日内時間（`DailyTimeRange`、分 from midnight）と絶対時刻（`TimeRange`、epoch ms）を別型に分ける**。週次稼働は特定日付に固定されない繰り返しのため。却下: 週次稼働を絶対 `TimeRange` で持つ（特定日付に固定され繰り返せない）。
- **絶対時刻への変換は配信層**（tz 依存）。domain は tz を持たない（`model.md`: `TimeRange` は絶対値のみ、表示 tz は配信）。`dailyHoursOn` は tz 非依存の日内時間帯まで。
- **例外は ISO カレンダー日付キー、空配列 ＝ 休業**。却下: 休業を別フラグで持つ（空配列で十分、特別営業と統一的に扱える）。
- **曜日はカレンダー日付から決定的に導出**（tz 非依存の暦計算。`Date` を使う場合は UTC で曜日のみ取り、時刻・tz に依存させない）。
- **`Resource` への配線は別 request**（`Availability` を独立に確立してから乗せる＝土台 → 上物）。
- **adr: false** の理由: resource コンテキスト内の値オブジェクト追加であり、新 port / パターンの導入ではない（日内/絶対の型分離は本節で記録）。
