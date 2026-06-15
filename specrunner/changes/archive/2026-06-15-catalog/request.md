# packages/catalog を新設し、Service 集約と ServiceRepository port（＋ in-memory 実装）を確立する

## Meta

- **type**: new-feature
- **slug**: catalog
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 新しい port/adapter 追加、既存パターンと異なる設計選択、振る舞い/契約を変える修正、構造的リファクタリング → true。いずれにも該当しない → false -->

## 背景

`catalog` コンテキスト（提供メニュー）を確立する。`Service` は所要時間（`Duration`）・料金（`Money`）・対応する `Resource` 種別を持ち、scheduling が「予約 = 顧客 × サービス × リソース × 時間枠」を組むときの**サービス定義**になる。
crm / resource で確立した **「ドメインパッケージ ＋ Repository port ＋ in-memory 実装」パターンを踏襲**する。単一テナント。

## 現状コードの前提

- crm / resource が「ドメインパッケージ ＋ Repository port（`src/port/`）＋ in-memory 実装」パターンを確立済み（`packages/resource/src/`: `resource.ts` / `port/resource-repository.ts` / `in-memory-resource-repository.ts` / `index.ts`）。`package.json` は `@koma/shared` に `workspace:*` 依存、scripts `check-types` / `test` / `lint`。
- `@koma/shared` が `Duration`（`packages/shared/src/index.ts:13`）と `Money`（同 `:4`）を export している。
- `docs/アーキテクチャ/domain-model.md` が `Service` を catalog コンテキストの集約とし、所要 `Duration` / 料金 `Money` / 対応する `Resource` 種別を持つと定める。
- `packages/` は `crm` / `resource` / `shared` のみで、`packages/catalog` は未作成。

## 要件

<!-- 最重量部: 所要時間が正であること、料金が Money であること、対応 Resource 種別の表現。 -->

1. **packages/catalog パッケージを新設する**。name `@koma/catalog`、純粋 TS、`@koma/shared` に `workspace:*` 依存。`next` / `react` / `drizzle-orm` / `zod` を入れない（B-1〜B-4）。package.json / tsconfig / vitest / eslint は既存ドメインパッケージに倣い、scripts `check-types` / `test` / `lint` を持つ。公開 API は `src/index.ts` から re-export する。

2. **Service 集約**。`id: Id<'Service'>` / `name` / `duration: Duration`（所要時間）/ `price: Money`（料金）/ `resourceKinds: readonly string[]`（**この Service を提供できる `Resource` の種別タグ**。resource の `kind` と突き合わせる疎結合な参照）。immutable に更新する（更新は新インスタンスを返す）。
   - **不変条件**: `duration` は **正**（0 / 負の長さは構築不可）。`price` は `Money`（`@koma/shared` の不変条件に従う）。

3. **ServiceRepository port（interface, `src/port/`）**。既存と同じ async 形で `save(service)` / `findById(id): Service | null` / `list(): Service[]`。具象は持たず interface のみ（B-2）。

4. **in-memory ServiceRepository 実装**（純粋・テスト/デフォルト用）。

5. すべて vitest テストを伴う。`Service` / `ServiceRepository` / in-memory 実装を `src/index.ts` から export する。

## スコープ外

- 料金の業種別算出（`PricingPolicy` 戦略 interface は拡張点。別 request）
- 税・オプション・割引・回数券
- `Resource` 実体との紐付け検証（catalog は種別タグで疎結合に参照するのみ。実在検証は scheduling/delivery）
- scheduling / Booking
- Drizzle 永続化（`packages/db` は後続）
- 検索 / 絞り込み / ページネーション
- マルチテナント

## 受け入れ基準

<!-- 機械検証できる文にする。 -->

- [ ] `packages/catalog/package.json` の name が `@koma/catalog` で、`grep -E '"(next|react|drizzle-orm|zod)"' packages/catalog/package.json` が 0 件、`@koma/shared` に依存している
- [ ] `pnpm -F @koma/catalog run check-types` が成功する
- [ ] `Service`: `duration` が正でないと構築できない（0 / 負で throw）ことをテストで固定する／`price` が `Money` として保持される
- [ ] `Service` は immutable（更新は新インスタンスを返し、元インスタンスを破壊しない）ことをテストで固定する
- [ ] `ServiceRepository` interface が `save` / `findById` / `list` を持つ
- [ ] in-memory 実装: `save` → `findById` で取得できる／未保存 id は `null`／`list` が保存分を返す、をテストで固定する
- [ ] 各型（Service / in-memory repo）に vitest テストがある
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green

## architect 評価済みの設計判断

<!-- 採用案 + 却下案。 -->

- **crm / resource のパターンを踏襲**（ドメインパッケージ ＋ Repository port(`src/port/`) ＋ in-memory 実装）。再発明しない。
- **`resourceKinds` で Resource を種別タグ参照**（疎結合）。却下: `Service` が `Resource` の id を直接持つ（catalog が resource の実体に強結合し、兄弟コンテキスト依存＝B-5 に近づく）。種別タグ（resource の `kind`）で突き合わせる。
- **`price` は `Money`（整数最小通貨単位）**を再利用。却下: number で金額（浮動小数・通貨欠落）。
- **`duration` は正の `Duration`**。`Duration` 自体は非負だが Service の所要時間は 0 を許さない（0 分のメニューは無意味）。
- **immutable 更新**（更新は新 `Service` を返す）。却下: 可変 setter。
- **adr: false** の理由: 確立済みパターンの適用であり、新パターン / 新 port 種別の導入ではないため。
