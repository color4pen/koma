# packages/resource を新設し、capacity を持つ Resource 集約と ResourceRepository port（＋ in-memory 実装）を確立する

## Meta

- **type**: new-feature
- **slug**: resource
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 新しい port/adapter 追加、既存パターンと異なる設計選択、振る舞い/契約を変える修正、構造的リファクタリング → true。いずれにも該当しない → false -->

## 背景

`resource` コンテキスト（予約枠の主体）を確立する。`Resource` を業種中立に抽象化し（人 / 席 / 部屋 / 機材）、**capacity（同時に受けられる予約数）**を持たせる。これは scheduling の capacity-aware 二重予約不変条件（`docs/アーキテクチャ/domain-model.md`）の供給側パラメータになる。
crm で確立した **「ドメインパッケージ ＋ Repository port ＋ in-memory 実装」パターンを踏襲**する。稼働ルール（`Availability`）は 1 つの収束ループを超えるため別 request に分割する。単一テナント。

## 現状コードの前提

- `@koma/crm` が「ドメインパッケージ ＋ Repository port（`src/port/`）＋ in-memory 実装」パターンを確立済み（`packages/crm/src/`: `customer.ts` / `port/customer-repository.ts` / `in-memory-customer-repository.ts` / `index.ts`）。`packages/crm/package.json` は `@koma/shared` に `workspace:*` 依存、scripts `check-types` / `test` / `lint`。
- `@koma/shared` が `Id` を `packages/shared/src/index.ts:1-2` から export している。
- `docs/アーキテクチャ/domain-model.md` が `Resource` を resource コンテキストの集約とし、種別タグ・`capacity`（正整数・既定 1）・稼働ルール（`Availability`）を持つと定める。
- `packages/` は `crm` / `shared` のみで、`packages/resource` は未作成。

## 要件

<!-- 最重量部: capacity の正整数不変条件と、crm パターンの踏襲（再発明しない）。 -->

1. **packages/resource パッケージを新設する**。name `@koma/resource`、純粋 TS、`@koma/shared` に `workspace:*` 依存。`next` / `react` / `drizzle-orm` / `zod` を入れない（B-1〜B-4）。package.json / tsconfig / vitest / eslint は `@koma/crm` に倣い、scripts `check-types` / `test` / `lint` を持つ。公開 API は `src/index.ts` から re-export する。

2. **Resource 集約**。`id: Id<'Resource'>` / `name` / `kind`（**種別タグ＝人/席/部屋/機材を表す自由文字列**。業種語彙を enum で固定しない＝B-6）/ **`capacity`（同時受付数）**。immutable に更新する（更新は新インスタンスを返す）。
   - **不変条件**: `capacity` は **1 以上の整数**（0 / 負 / 非整数は構築不可）。省略時の既定は 1。

3. **ResourceRepository port（interface, `src/port/`）**。crm と同じ async 形で `save(resource)` / `findById(id): Resource | null` / `list(): Resource[]`。具象は持たず interface のみ（B-2）。

4. **in-memory ResourceRepository 実装**（純粋・テスト/デフォルト用）。

5. すべて vitest テストを伴う。`Resource` / `ResourceRepository` / in-memory 実装を `src/index.ts` から export する。

## スコープ外

- **`Availability`（稼働ルール・営業時間・休業・例外）** — 別 request（`resource-availability`）
- `Service` / catalog コンテキスト
- scheduling / Booking / 二重予約不変条件の強制（供給側 capacity を持つだけ）
- Drizzle 永続化（`packages/db` は後続）
- 検索 / 絞り込み / ページネーション
- マルチテナント

## 受け入れ基準

<!-- 機械検証できる文にする。 -->

- [ ] `packages/resource/package.json` の name が `@koma/resource` で、`grep -E '"(next|react|drizzle-orm|zod)"' packages/resource/package.json` が 0 件、`@koma/shared` に依存している
- [ ] `pnpm -F @koma/resource run check-types` が成功する
- [ ] `Resource`: `capacity` が 1 以上の整数でないと構築できない（0 / 負 / 小数で throw）ことをテストで固定する／`capacity` 省略時は 1
- [ ] `Resource` は immutable（更新は新インスタンスを返し、元インスタンスを破壊しない）ことをテストで固定する
- [ ] `ResourceRepository` interface が `save` / `findById` / `list` を持つ
- [ ] in-memory 実装: `save` → `findById` で取得できる／未保存 id は `null`／`list` が保存分を返す、をテストで固定する
- [ ] 各型（Resource / in-memory repo）に vitest テストがある
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green

## architect 評価済みの設計判断

<!-- 採用案 + 却下案。 -->

- **crm のパターンを踏襲**（ドメインパッケージ ＋ Repository port(`src/port/`) ＋ in-memory 実装）。再発明しない。
- **`kind` は自由な種別タグ（文字列）**。業種語彙を enum で固定しない（B-6）。却下: `kind` を `'staff' | 'room' | 'equipment'` 等の固定 enum（業種をまたぐ汎用性を壊す）。
- **`capacity` を Resource に持たせる**（供給側パラメータ）。scheduling の capacity-aware 二重予約不変条件（`domain-model.md`）が消費する。既定 1 で 1:1 を包含。却下: capacity をモデルしない（後付けで scheduling 集約と不変条件を作り直す高コスト）。
- **immutable 更新**（更新は新 `Resource` を返す）。却下: 可変 setter。
- **`Availability` は別 request に分割**。Resource scaffold ＋ capacity を土台（挙動不変の機構）にし、稼働ルールを上物として後続で乗せる（1 request = 1 収束ループ）。
- **adr: false** の理由: crm で確立済みのパターンの適用であり、新パターン / 新 port 種別の導入ではないため。
