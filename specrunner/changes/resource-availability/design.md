# Design: resource-availability

## Context

`packages/resource`（`@koma/resource`）は `Resource` 集約（`id` / `name` / `kind` / `capacity`）と `ResourceRepository` port + in-memory 実装を持つ。`domain-model.md` は `Availability` を resource コンテキストの値オブジェクト（`Resource` の稼働ルール）と定める。

`@koma/shared` の `TimeRange` は epoch ミリ秒の半開区間（絶対時刻）であり、曜日ごとに繰り返す営業時間帯という概念とは性質が異なる。週次稼働は特定日付に固定されない繰り返しのため、日内時間帯（真夜中からの分）を別の値オブジェクトとして導入する必要がある。

本変更は `Availability` の型定義・不変条件・日次導出関数（`dailyHoursOn`）までをスコープとし、`Resource` 集約への配線、絶対時刻への変換、空き枠計算は後続 request に委ねる。

## Goals / Non-Goals

**Goals**:

- `DailyTimeRange` 値オブジェクト（日内時間帯・分 from midnight）を `packages/resource` に追加する
- `Weekday` 型（曜日列挙 0=日曜..6=土曜）を定義する
- `Availability` 値オブジェクト（週次稼働 + 日付例外）を定義し、overlap 不変条件を構築時に強制する
- `dailyHoursOn` 純関数（`Availability` × ISO 日付 → `DailyTimeRange[]`）を実装する
- vitest テストで全不変条件・導出ロジックを固定する
- 全パブリック API を `src/index.ts` から export する

**Non-Goals**:

- `DailyTimeRange` → 絶対 `TimeRange` への変換（tz が必要＝配信層の責務）
- `Resource` 集約への `availability` フィールド配線（別 request）
- 空き枠計算（scheduling コンテキストの責務、別 request）
- 複雑な繰り返し（隔週・毎月第 n 週等の recurrence）
- 永続化

## Decisions

### D1: `DailyTimeRange` を `packages/resource` 内に配置する（shared に置かない）

`DailyTimeRange`（日内時間帯）は Availability の構成要素であり、resource コンテキスト固有の概念。shared-kernel の `TimeRange`（絶対時刻）とは別概念で、他コンテキストが直接消費する予定がない。

**Rationale**: `DailyTimeRange` は Availability のドメイン内概念であり、shared に置くと shared の責務（コンテキスト中立の値オブジェクト）を超える。将来他コンテキストが必要とすれば昇格できるが、現時点では resource 内に閉じるのが B-4（shared は最下層・純粋 TS）に沿う。

**Alternatives considered**: `@koma/shared` に置く → 却下。Availability を消費するのは現状 resource のみ。不要な共有は依存グラフを重くする。

### D2: 分 from midnight（整数）による日内時間の表現

`DailyTimeRange` は `open` / `close` を真夜中からの分数（0–1440）で持つ半開区間 `[open, close)`。

**Rationale**: 秒やミリ秒は営業時間の粒度に対して過剰。分精度は「9:00–17:30」のような営業時間を自然に表現でき、整数演算で overlap 判定が行える。`TimeRange`（epoch ms）との混同を型レベルで防ぐ。`0 <= open < close <= 1440` で夜越し（`open > close`）を禁止する（夜越しが必要な場合は 2 つの `DailyTimeRange` に分割する）。

**Alternatives considered**: epoch ms を共有する → 却下。絶対時刻と日内時間の型混同リスク。秒精度 → 却下。営業時間で秒は不要、整数が大きくなるだけ。

### D3: `Weekday` を数値リテラル union（`0 | 1 | 2 | 3 | 4 | 5 | 6`）とする

`0=Sunday .. 6=Saturday`。JavaScript `Date.getUTCDay()` の返り値と一致させる。

**Rationale**: `Date.getUTCDay()` との直接マッピングにより変換コードが不要。曜日の導出で ISO 日付文字列を UTC で解釈し `getUTCDay()` を使うだけで tz 非依存の暦計算が成立する。

**Alternatives considered**: 文字列 enum (`'monday'` 等) → 却下。`Date` API との変換が追加で必要になり、typo リスクも高い。`1=Monday` 開始の ISO 8601 形式 → 却下。JS Date API と不整合。

### D4: `Availability` の overlap 不変条件を構築時に強制する

`Availability` のファクトリ関数で、各曜日・各例外日付の `DailyTimeRange[]` が相互に overlap しないことを検証し、違反時は `throw` する。

**Rationale**: 不正な Availability インスタンスが存在し得ないことをランタイムで保証する。`Resource.createResource` の capacity 検証と同じパターン。overlap チェックは配列を `open` でソートして隣接比較すれば O(n log n) で済む。

**Alternatives considered**: 利用時（`dailyHoursOn`）に検証する → 却下。不正なデータが存在してから検出では遅い。構築時保証がドメイン層のパターン。

### D5: `dailyHoursOn` を純関数として実装する

`dailyHoursOn(availability, date)` は `Availability` と ISO 日付文字列を受け取り `DailyTimeRange[]` を返す。I/O なし、`Date.now()` なし。曜日導出は `new Date(date + 'T00:00:00Z').getUTCDay()` で UTC 決定的に行う。

**Rationale**: 純関数は単体テスト容易、I/O mock 不要。tz 非依存のため `Date` を UTC のみで使い、ローカルタイムゾーンに影響されない。関数を `Availability` のメソッドでなく独立関数にすることで、値オブジェクトの immutable 性を保つ。

**Alternatives considered**: `Availability` のメソッド → 却下。値オブジェクトにロジックを載せるのは可能だが、本コードベースのパターン（`createTimeRange` + `overlaps` 等の独立関数）と一致させる。

### D6: ファイル構成

```
packages/resource/src/
  daily-time-range.ts          — DailyTimeRange 型 + createDailyTimeRange
  daily-time-range.test.ts     — DailyTimeRange テスト
  availability.ts              — Weekday 型 + Availability 型 + createAvailability + dailyHoursOn
  availability.test.ts         — Availability + dailyHoursOn テスト
  index.ts                     — 既存 export に追加
```

**Rationale**: `DailyTimeRange` は `Availability` の構成要素だが独立した不変条件を持つため、ファイルを分離してテストの焦点を明確にする。`Weekday` は小さい型定義のため `availability.ts` に同居させる。既存の `resource.ts` / `port/` / `in-memory-resource-repository.ts` には変更を加えない。

## Risks / Trade-offs

- [Risk] `new Date(isoString + 'T00:00:00Z').getUTCDay()` が不正な日付文字列で `NaN` を返す → `dailyHoursOn` 内で `getUTCDay()` の結果を検証し、不正入力には例外を送出する。
- [Risk] `DailyTimeRange[]` の overlap チェックのコスト → 営業時間帯は通常 1–3 件であり、ソート + 隣接比較のコストは無視できる。
- [Trade-off] 夜越し営業（22:00–02:00）を単一 `DailyTimeRange` で表現できない → 2 つに分割（22:00–24:00, 00:00–02:00 を別日に配置）で対応可能。複雑な recurrence はスコープ外。

## Open Questions

なし。request の設計判断がすべて確定しており、実装方針は既存パターン（`TimeRange` の構造）に準ずる。
