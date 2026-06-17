# Design: apps/web にサービス（メニュー）の一覧・登録 管理画面を追加する

## Context

予約デモに向け、提供メニュー `Service`（所要時間・料金・対応 Resource 種別）を管理する画面を `apps/web` に追加する。web-customers / web-resources で確立した delivery パターンを `Service` に適用する。

現状:

- `@koma/catalog` パッケージは `createService` / `ServiceRepository`（port）/ `createInMemoryServiceRepository` を export 済み。`Service` は `name`（string）/ `duration: Duration` / `price: Money` / `resourceKinds: readonly string[]` を持つ。`createService` は `duration.milliseconds <= 0` で throw、`price.amount < 0` で throw する。
- `@koma/shared` が `ofMinutes`（分 → `Duration`）と `createMoney`（amount, currency → `Money`）を export している。`ofMinutes` は内部で `ofMilliseconds` を呼び、整数でない ms は throw する。`createMoney` は整数でない amount を throw する。
- `apps/web` は `@koma/crm` / `@koma/resource` / `zod` に依存済み。`@koma/catalog` は未依存。
- `composition-root.ts` は `getCustomerRepository` / `getResourceRepository` を提供。`getServiceRepository` は存在しない。
- `apps/web/app/{customers,resources}/` 配下に `actions.ts` / `page.tsx` / `*-form.tsx` が delivery パターンの実例として存在する。
- `apps/web/lib/parse-{customer,resource}-input.ts` が `zod/v4/mini` 境界検証 → ドメイン factory 構築の実例として存在する。

## Goals / Non-Goals

**Goals**:

- `apps/web` に `@koma/catalog` 依存を追加し、Service の一覧表示・新規登録ができる管理画面を提供する。
- フォーム文字列入力からの境界変換（分 → `Duration`、円 → `Money`、カンマ区切り → `string[]`）を `parseServiceInput` 純関数で扱い、zod/mini 境界検証と `createService` ドメイン不変条件の二段防御を実現する。
- web-customers / web-resources の delivery パターンを忠実に踏襲し、コードベース全体の一貫性を維持する。

**Non-Goals**:

- Service の編集・削除（本スライスは一覧・登録のみ）。
- 料金の業種別算出（`PricingPolicy`）・税・オプション。
- Drizzle 永続化への配線（後続）。
- 認証・認可 / 検索 / ページネーション。

## Decisions

### D1: web-customers / web-resources の delivery パターンをそのまま踏襲する

**Rationale**: `Service` 管理画面は `Customer` / `Resource` 管理画面と構造的に等価（CRUD のうち CR）。パターンが確立済みであり、再発明のリスクを負う必要がない。composition root / server action / `zod/v4/mini` 境界検証 / 純関数 parse / server component page + client form の全要素を同一構造で適用する。

**Alternatives considered**:
- Service 専用のアーキテクチャを設計する → 却下。一貫性を損ない、メンテナンスコストが増加する。

### D2: 境界で「分 → Duration」「円 → Money」変換を行いドメインは VO で受け取る

`parseServiceInput` 内で `ofMinutes(durationMinutes)` → `Duration`、`createMoney(priceYen, 'JPY')` → `Money` に変換し、`createService` には VO を渡す。ドメイン層は number の分・円を直接受け取らない。

**Rationale**: Duration/Money は不変条件（正の時間、通貨タグ）を VO 生成時に強制する。delivery 層で変換を行うことで、ドメイン層は常に有効な VO を受け取る。

**Alternatives considered**:
- ドメインに number の分・円を直接渡す → 却下。VO の不変条件・通貨タグが付かない。`createService` が number を受け取る API を持っていない。

### D3: 二段防御 — zod/mini 境界検証 + createService ドメイン不変条件

`parseServiceInput` で zod/mini スキーマにより `durationMinutes` が正整数、`priceYen` が 0 以上の整数であることを検証し、ユーザーフレンドリーなフィールド別エラーを返す。その後 `ofMinutes` / `createMoney` / `createService` がドメイン不変条件を最終保証する。

**Rationale**: 境界検証で親切なエラーメッセージを返しつつ、ドメイン層の不変条件保護を二重に担保する。web-resources の capacity 二段防御と同じ戦略。

**Alternatives considered**:
- zod のみで検証しドメイン factory の throw に依存しない → 却下。ドメイン不変条件が delivery 層のバリデーション正確性に依存してしまう。
- `createService` の throw のみに依存する → 却下。フィールド別のユーザーフレンドリーなエラーメッセージを返せない。

### D4: durationMinutes / priceYen の文字列→整数変換はカスタム前処理で行う

web-resources の capacity 変換（D3 in web-resources design）と同じく、`Number()` + `Number.isInteger` チェックのカスタムロジックで文字列→整数変換を行う。`durationMinutes` は `Number(str)` → `isNaN` / `!Number.isInteger` / `< 1` でエラー。`priceYen` は `Number(str)` → `isNaN` / `!Number.isInteger` / `< 0` でエラー。

**Rationale**: `parseInt("1.5")` は `1` に丸めてしまい小数を検出できない。`Number("1.5")` は `1.5` を返し `Number.isInteger(1.5) === false` で小数を正しく検出する。`zod/v4/mini` の `z.coerce` は軽量ビルドでの利用可否が未検証。

**Alternatives considered**:
- `z.coerce.number()` を使う → リスクあり。mini ビルドでの利用可否が未検証。
- `parseInt` を使う → 却下。小数文字列を丸めてしまう。

### D5: resourceKinds はカンマ区切り文字列 → string[]

フォームからは単一テキスト入力でカンマ区切り文字列を受け取り、`split(',')` + `trim` + 空文字除去で `string[]` に変換する。空入力は `[]`（= 任意の Resource）。

**Rationale**: UI 入力の素朴な形であり、本スライスでは種別の複雑な選択 UI は不要。`createService` は `resourceKinds` を optional（デフォルト `[]`）で受け取るため、空配列で問題ない。

**Alternatives considered**:
- multi-select UI を実装する → 却下。本スライスのスコープを超える。

### D6: composition root の globalThis 単一生成パターンを踏襲

`getServiceRepository` を `composition-root.ts` に追加し、`globalThis` に `serviceRepository` を lazy 生成する。`getCustomerRepository` / `getResourceRepository` と同一のパターン。

**Rationale**: 具象生成を 1 箇所に集約することで、後続の Drizzle 永続化への切り替えがこの 1 箇所の変更で完了する。HMR による再生成も防止される。

**Alternatives considered**:
- 各 action/page で直接 `createInMemoryServiceRepository()` を呼ぶ → 却下。具象生成が分散し、永続化切り替えが困難になる。

### D7: 一覧ページで所要時間・料金を読みやすく表示する

`toMinutes(service.duration)` で分数を取得し「{n}分」と表示。`service.price.amount` で金額を取得し `toLocaleString('ja-JP')` + 「円」と表示。

**Rationale**: Duration / Money は VO であり内部表現（milliseconds / amount + currency）から表示用の値を取り出す必要がある。`@koma/shared` の `toMinutes` を使用し VO の内部構造に直接依存しない。

**Alternatives considered**:
- `service.duration.milliseconds / 60000` で直接計算する → 却下。`toMinutes` が提供されているのに内部構造に依存する必要がない。

## Risks / Trade-offs

- **[Risk] `zod/v4/mini` の API 互換性** → Mitigation: `z.coerce` を避け、カスタム前処理（`Number()` + `Number.isInteger` チェック）で変換する（D4）。
- **[Risk] in-memory repository はプロセス再起動で消失** → Mitigation: 本スライスはデモ用途。Drizzle 永続化は後続スライスで対応予定。composition root の 1 箇所を差し替えるだけで移行可能（D6）。
- **[Risk] `ofMinutes` に小数を渡すと内部で `ms = minutes * 60000` が非整数になり throw する** → Mitigation: zod/mini 層で `Number.isInteger(durationMinutes)` を事前検証するため、`ofMinutes` には常に整数が渡る（D3, D4）。

## Open Questions

なし。設計判断はすべて architect が評価済み。
