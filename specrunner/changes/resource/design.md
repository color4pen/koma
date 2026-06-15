# Design: packages/resource

## Context

`@koma/crm` が確立した「ドメインパッケージ + Repository port(`src/port/`) + in-memory 実装」パターンを `resource` コンテキストに適用する。`Resource` は予約枠の主体（人/席/部屋/機材）を業種中立に抽象化する集約で、`capacity`（同時受付数）を供給側パラメータとして持つ。`capacity` は後続の scheduling コンテキストで capacity-aware 二重予約不変条件が消費する。

現状 `packages/` には `crm` と `shared` のみが存在し、`resource` パッケージは未作成。`@koma/shared` が `Id<Brand>` / `createId` を提供しており、`Resource` の identity はこれを利用する。

## Goals / Non-Goals

**Goals**:

- `@koma/resource` パッケージを `@koma/crm` と同一構造で新設する
- `Resource` 集約を `id` / `name` / `kind`（自由文字列）/ `capacity`（正整数、既定 1）で定義する
- `capacity >= 1`（整数）の不変条件を構築時に強制する
- immutable 更新パターン（`updateResource` は新インスタンスを返す）を適用する
- `ResourceRepository` port interface を `src/port/` に定義する
- in-memory 実装を提供する
- 全パブリック API を vitest テストで固定する

**Non-Goals**:

- `Availability`（稼働ルール）の導入 — 別 request `resource-availability`
- Drizzle 永続化 — `packages/db` で後続対応
- `Service` / catalog / scheduling / Booking との連携
- 検索・絞り込み・ページネーション
- マルチテナント

## Decisions

### D1: crm パターンの完全踏襲

`@koma/crm` のファイル構造・命名・エクスポートパターンをそのまま適用する。

- `src/resource.ts` — 集約型 + `createResource` + `updateResource`
- `src/port/resource-repository.ts` — Repository interface
- `src/in-memory-resource-repository.ts` — in-memory 実装
- `src/index.ts` — re-export barrel

**Rationale**: 再発明を避け、コードベース全体の一貫性を維持する。crm で検証済みのパターンなので設計リスクが低い。

**Alternatives considered**: 独自の構造やファクトリパターン → 却下。一貫性が崩れ、後続コンテキスト（catalog 等）の手本にならない。

### D2: `kind` は自由文字列

種別タグ `kind` を `string` 型とし、`'staff' | 'room'` のような固定 enum にしない。

**Rationale**: 業種をまたぐ汎用性を維持する（B-6）。サロンの「スタッフ」、レストランの「席」、会議室予約の「部屋」は利用者が自由に命名する。

**Alternatives considered**: union 型 enum → 却下。業種固有の語彙がドメイン層に漏れる（B-6 違反）。

### D3: `capacity` の不変条件を構築時に強制

`createResource` で `capacity` が 1 以上の整数でない場合に `throw` する。`Resource` 型上は `number` だが、ランタイムガードで正整数を保証する。

**Rationale**: 不正な capacity の `Resource` インスタンスが存在し得ないことを型+ランタイムで保証する。scheduling が `Resource.capacity` を信頼して使える前提を作る。

**Alternatives considered**: branded number 型 → 過剰。TS の型システムでは整数制約を静的に表現できず、結局ランタイムチェックが必要。crm の `ContactInfo`（≥1 必須）と同じアプローチで十分。

### D4: immutable 更新

`updateResource` は `createResource` を内部で呼び出し、新しい frozen オブジェクトを返す。`crm` の `updateCustomer` と同じ手法。

**Rationale**: crm パターンの踏襲。不変条件（capacity >= 1）が更新後も再検証される。

**Alternatives considered**: mutable setter → 却下。不変条件の再検証漏れリスク。

### D5: パッケージ設定は crm のコピー

`package.json` / `tsconfig.json` / `vitest.config.ts` / `eslint.config.js` は `@koma/crm` のものをコピーし、名前のみ変更する。devDependencies のバージョンも揃える。

**Rationale**: monorepo 内の一貫性。ツール設定の差異は保守コストになる。

## Risks / Trade-offs

- [Risk] `kind` が自由文字列のため、typo や表記揺れが起きうる → 構築時のバリデーション（空文字チェック）で最低限防ぐ。表記統一は delivery 層の UI/UX の責務。
- [Risk] `capacity` の上限がない → 現時点では不要。実運用で問題になれば上限を追加できる（後方互換）。

## Open Questions

なし。crm で確立済みパターンの適用であり、未決定事項はない。
