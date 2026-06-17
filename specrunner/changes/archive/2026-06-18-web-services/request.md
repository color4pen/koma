# apps/web にサービス（メニュー）の一覧・登録 管理画面を追加する（web-customers パターン踏襲）

## Meta

- **type**: new-feature
- **slug**: web-services
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 新しい port/adapter 追加、既存パターンと異なる設計選択、振る舞い/契約を変える修正、構造的リファクタリング → true。いずれにも該当しない → false -->

## 背景

予約デモに向け、提供メニュー `Service`（所要時間・料金・対応 `Resource` 種別）を管理する画面を追加する。web-customers / web-resources で確立した **delivery パターン**を `Service` に適用する。フォームは**所要時間（分）→ `Duration`**、**料金（円）→ `Money`** の境界変換を扱う。

## 現状コードの前提

- web-customers / web-resources が delivery パターンを確立済み: `apps/web/lib/composition-root.ts`（`getCustomerRepository` / `getResourceRepository`、`globalThis` 単一生成）/ `apps/web/lib/parse-*-input.ts`（`zod/v4/mini` 境界検証 → ドメイン factory 構築）/ `apps/web/app/{customers,resources}/`（server action / page / client form）。
- `@koma/catalog` が `createService` / `ServiceRepository`（port）/ `createInMemoryServiceRepository` を `packages/catalog/src/index.ts` から export している。
- `Service` は `name` / `duration: Duration` / `price: Money` / `resourceKinds: readonly string[]`。`createService` は `duration` が正でないと throw、`price` が負だと throw。
- `@koma/shared` が `ofMinutes`（分 → `Duration`）と `createMoney`（→ `Money`）を export している。
- `apps/web` は `@koma/crm` / `@koma/resource` / `zod` に依存済み。`@koma/catalog` は未依存。

## 要件

<!-- 最重量部: 分→Duration・円→Money の境界変換と、確立済みパターンの踏襲。 -->

1. **依存追加**。`apps/web` に `@koma/catalog`（`workspace:*`）を dependencies に追加する。`drizzle-orm` は入れない。

2. **composition root 拡張**。`apps/web/lib/composition-root.ts` に **`getServiceRepository()`** を追加する（in-memory `ServiceRepository` を単一 lazy 生成、既存と同じ `globalThis` パターン）。

3. **`parseServiceInput(raw)`（純関数）** を `apps/web/lib/parse-service-input.ts` に追加。`zod/v4/mini` で `name`（非空）/ `durationMinutes`（正整数、分）/ `priceYen`（0 以上の整数、円）/ `resourceKinds`（カンマ区切り文字列 → `string[]`、空は `[]`）を検証 → `ofMinutes(durationMinutes)` で `Duration`・`createMoney(priceYen, 'JPY')` で `Money` を作り、`createService` で `Service` を構築して返す。失敗時はフィールド別エラー。

4. **server action** `createServiceAction`（`'use server'`、`apps/web/app/services/actions.ts`）。`parseServiceInput` → 成功時 `getServiceRepository().save` → `revalidatePath('/services')`。既存 action と同じ薄さ・シグネチャ。

5. **ページ** `app/services/page.tsx`（server component）。`list()` で一覧表示（所要分・料金を読みやすく表示）＋ 登録フォーム（`service-form.tsx` client component）。

6. **vitest テスト**: `parseServiceInput`（有効入力 → `Service`、`name` 空 → エラー、`durationMinutes` が 0 / 負 / 小数 → エラー、`priceYen` が負 → エラー）。

## スコープ外

- `Service` の編集・削除（本スライスは一覧・登録のみ）
- 料金の業種別算出（`PricingPolicy`）・税・オプション
- Drizzle 永続化への配線（後続）
- 認証・認可 / 検索 / ページネーション

## 受け入れ基準

<!-- 機械検証できる文にする。 -->

- [ ] `apps/web/package.json` が `@koma/catalog` に依存し、`grep -E '"drizzle-orm"' apps/web/package.json` が 0 件
- [ ] `pnpm -F web run build`（`next build`）が成功する
- [ ] `parseServiceInput`: 有効入力で `ok: true` と妥当な `Service`（`ofMinutes` / `createMoney` / `createService` 経由）／`name` 空で `ok: false`／`durationMinutes` が `0` / 負 / 小数で `ok: false`／`priceYen` が負で `ok: false`、をテストで固定する
- [ ] composition root が in-memory `ServiceRepository` を**単一**生成し、`getServiceRepository` を介して使う
- [ ] `app/services/page.tsx` が一覧と登録フォームを描画し、`createServiceAction` が成功時に `save` する
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test && pnpm -r --if-present run build` が green

## architect 評価済みの設計判断

<!-- 採用案 + 却下案。 -->

- **web-customers / web-resources の delivery パターンを踏襲**（composition root / server action / `zod/mini` 境界 / 純関数 parse / server component page ＋ client form）。再発明しない。
- **境界で「分 → `Duration`」「円 → `Money`」変換**を行い、ドメインは VO で受け取る。却下: ドメインに number の分・円を直接渡す（VO の不変条件・通貨タグが付かない）。
- **二段防御**: `zod/mini` で正整数等を境界検証＋親切エラー、`createService` で不変条件（`duration` 正・`price` 非負）を最終保証。
- **`resourceKinds` はカンマ区切り文字列 → `string[]`**（UI 入力の素朴な形）。空は `[]`（= 任意の Resource）。
- **adr: false** の理由: 確立済み delivery パターンの適用。
