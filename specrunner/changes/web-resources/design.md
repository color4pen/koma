# Design: apps/web にリソースの一覧・登録 管理画面を追加する

## Context

予約デモに向けて `Resource`（人 / 席 / 部屋 / 機材）の管理画面を `apps/web` に追加する。`web-customers` で確立した delivery パターン（composition root / server action / `zod/v4/mini` 境界検証 / 純関数 parse / server component + client form）をそのまま適用する。

現状:

- `@koma/resource` パッケージは `createResource` / `ResourceRepository`（port）/ `createInMemoryResourceRepository` を export 済み。`Resource` は `name`（string）/ `kind`（string）/ `capacity`（正整数、既定 1）を持つ。`createResource` は `capacity` が 1 以上の整数でなければ throw する。
- `apps/web` は `@koma/crm` と `zod` に依存済み。`@koma/resource` は未依存。
- `composition-root.ts` は `getCustomerRepository` のみ提供。`getResourceRepository` は存在しない。
- `apps/web/app/customers/` 配下に `actions.ts` / `page.tsx` / `customer-form.tsx` が delivery パターンの実例として存在する。

## Goals / Non-Goals

**Goals**:

- `apps/web` に `@koma/resource` 依存を追加し、Resource の一覧表示・新規登録ができる管理画面を提供する。
- `capacity` フィールドについて、フォーム文字列入力から正整数への変換・検証を zod/mini 境界と `createResource` ドメイン不変条件の二段で防御する。
- web-customers の delivery パターンを忠実に踏襲し、コードベース全体の一貫性を維持する。

**Non-Goals**:

- Resource の編集・削除（本スライスは一覧・登録のみ）。
- `Availability`（稼働時間）の管理。
- Drizzle 永続化への配線（composition root の差し替えは後続）。
- 認証・認可。
- 検索 / 絞り込み / ページネーション。

## Decisions

### D1: web-customers の delivery パターンをそのまま踏襲する

**Rationale**: `Resource` 管理画面は `Customer` 管理画面と構造的に等価（CRUD のうち CR）。パターンが確立済みであり、再発明のリスクを負う必要がない。

**Alternatives considered**:
- Resource 専用のアーキテクチャを設計する → 却下。一貫性を損ない、メンテナンスコストが増加する。

### D2: `capacity` はフォーム文字列 → 正整数の二段防御

`parseResourceInput` 内の zod/mini スキーマで文字列を数値に変換し `>= 1` の整数であることを検証する（ユーザー向け親切エラー）。その後 `createResource` がドメイン不変条件として同じ制約を最終保証する。

**Rationale**: 境界検証（delivery 層）でユーザーフレンドリーなエラーを返しつつ、ドメイン層の不変条件保護を二重に担保する。

**Alternatives considered**:
- zod のみで検証し `createResource` の throw に依存しない → 却下。ドメイン不変条件が delivery 層のバリデーション正確性に依存してしまう。
- `createResource` の throw のみに依存する → 却下。フィールド別のユーザーフレンドリーなエラーメッセージを返せない。

### D3: `capacity` の文字列→数値変換はカスタム前処理で行う

`zod/v4/mini` では `z.coerce` API の利用可否が不確実なため（request-review Finding #2）、`Number()` + `Number.isInteger` チェックのカスタムロジックで文字列→整数変換を行う。具体的には `const n = Number(capStr); if (isNaN(n) || !Number.isInteger(n) || n < 1)` でエラーを返す。

**Rationale**: `parseInt` は小数文字列 `"1.5"` を `1` に丸めてしまい、`Number.isInteger(1) === true` のため spec が要求する「小数文字列 → errors.capacity」を実現できない。`Number("1.5")` は `1.5` を返し、`Number.isInteger(1.5) === false` となるため小数を正しく検出できる。`zod/v4/mini` は軽量ビルドであり `z.coerce` が使えない可能性があるため、カスタム前処理が確実。

**Alternatives considered**:
- `z.coerce.number()` を使う → リスクあり。mini ビルドでの利用可否が未検証。
- `parseInt` を使う → 却下。`parseInt("1.5") === 1` となり小数エラー要件を満たせない。

### D4: `kind` はフォーム上の自由文字列入力

**Rationale**: 業種語彙を UI に enum で固定しない方針（B-6 の精神：業種固有の語彙は拡張点に閉じる）。ユーザーが「スタイリスト」「個室」「機材A」など自由に入力できる。

**Alternatives considered**:
- `kind` を定義済みの enum から選択させる → 却下。業種ごとに語彙が異なるため、汎用的な enum を定義する意味がない。

### D5: composition root の `globalThis` 単一生成パターンを踏襲

`getResourceRepository` を `composition-root.ts` に追加し、`globalThis` に `resourceRepository` を lazy 生成する。`getCustomerRepository` と同一のパターン。

**Rationale**: 具象生成を 1 箇所に集約することで、後続の Drizzle 永続化への切り替えがこの 1 箇所の変更で完了する。HMR による再生成も防止される。

**Alternatives considered**:
- 各 action/page で直接 `createInMemoryResourceRepository()` を呼ぶ → 却下。具象生成が分散し、永続化切り替えが困難になる。

## Risks / Trade-offs

- **[Risk] `zod/v4/mini` の API 互換性** → Mitigation: `z.coerce` を避け、カスタム前処理（`Number()` + `Number.isInteger` チェック）で変換する（D3）。
- **[Risk] in-memory repository はプロセス再起動で消失** → Mitigation: 本スライスはデモ用途。Drizzle 永続化は後続スライスで対応予定。composition root の 1 箇所を差し替えるだけで移行可能（D5）。

## Open Questions

なし。設計判断はすべて architect が評価済み。
