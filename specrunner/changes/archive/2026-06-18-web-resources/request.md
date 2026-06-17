# apps/web にリソースの一覧・登録 管理画面を追加する（web-customers パターン踏襲）

## Meta

- **type**: new-feature
- **slug**: web-resources
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 新しい port/adapter 追加、既存パターンと異なる設計選択、振る舞い/契約を変える修正、構造的リファクタリング → true。いずれにも該当しない → false -->

## 背景

予約デモに向け、予約枠の主体 `Resource`（人 / 席 / 部屋 / 機材）を管理する画面を追加する。web-customers で確立した **delivery パターン**（composition root / server action / `zod/mini` 境界検証 / 純関数 parse）をそのまま `Resource` に適用する。`Resource` は `capacity`（同時受付数）を持つため、フォームでその入力・検証を扱う。

## 現状コードの前提

- web-customers が delivery パターンを確立済み: `apps/web/lib/composition-root.ts`（`getCustomerRepository`、`globalThis` 単一生成）/ `apps/web/lib/parse-customer-input.ts`（`zod/v4/mini` で境界検証 → crm factory 構築）/ `apps/web/app/customers/`（`actions.ts` server action / `page.tsx` server component / `customer-form.tsx` client form）。
- `@koma/resource` が `createResource` / `ResourceRepository`（port）/ `createInMemoryResourceRepository` を `packages/resource/src/index.ts` から export している。
- `Resource` は `name` / `kind`（自由文字列タグ）/ `capacity`（正整数・既定 1）。`createResource` は `capacity` が 1 以上の整数でないと throw する。
- `apps/web` は `@koma/crm` / `zod` に依存済み。`@koma/resource` は未依存。`composition-root.ts` に `getResourceRepository` は無い。

## 要件

<!-- 最重量部: capacity（文字列フォーム入力 → 正整数）の境界検証と、確立済みパターンの踏襲。 -->

1. **依存追加**。`apps/web` に `@koma/resource`（`workspace:*`）を dependencies に追加する。`drizzle-orm` は入れない。

2. **composition root 拡張**。`apps/web/lib/composition-root.ts` に **`getResourceRepository()`** を追加する。in-memory `ResourceRepository` を**単一 lazy 生成**（`getCustomerRepository` と同じ `globalThis` パターン）。

3. **`parseResourceInput(raw)`（純関数）** を `apps/web/lib/parse-resource-input.ts` に追加。`zod/v4/mini` で `name`（非空）/ `kind`（非空）/ `capacity`（**フォーム文字列から正整数に coerce、`>= 1`**）を検証 → 成功時 `createResource` で `Resource` を構築して返す。失敗時はフィールド別エラー。web-customers の `parse-customer-input.ts` と同じ構造。

4. **server action** `createResourceAction`（`'use server'`、`apps/web/app/resources/actions.ts`）。`parseResourceInput` → 成功時 `getResourceRepository().save` → `revalidatePath('/resources')`。`createCustomerAction` と同じ薄さ・シグネチャ。

5. **ページ** `app/resources/page.tsx`（server component）。`list()` で一覧表示 ＋ 登録フォーム（`resource-form.tsx` client component）。

6. **vitest テスト**: `parseResourceInput`（有効入力 → `Resource`、`name` 空 → エラー、`capacity` が 0 / 負 / 小数 → エラー）。

## スコープ外

- `Availability`（稼働時間）編集 — 複雑なため後続スライス
- `Resource` の編集・削除（本スライスは一覧・登録のみ）
- Drizzle 永続化への配線（後続）
- 認証・認可
- 検索 / 絞り込み / ページネーション

## 受け入れ基準

<!-- 機械検証できる文にする。 -->

- [ ] `apps/web/package.json` が `@koma/resource` に依存し、`grep -E '"drizzle-orm"' apps/web/package.json` が 0 件
- [ ] `pnpm -F web run build`（`next build`）が成功する
- [ ] `parseResourceInput`: 有効入力で `ok: true` と妥当な `Resource`（`createResource` 経由）／`name` 空で `ok: false`／`capacity` が `0` / 負 / 小数で `ok: false`、をテストで固定する
- [ ] composition root が in-memory `ResourceRepository` を**単一**生成し、`getResourceRepository` を介して使う（具象生成が 1 箇所）
- [ ] `app/resources/page.tsx` が一覧と登録フォームを描画し、`createResourceAction` が成功時に `save` する
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test && pnpm -r --if-present run build` が green

## architect 評価済みの設計判断

<!-- 採用案 + 却下案。 -->

- **web-customers の delivery パターンを踏襲**（composition root / server action / `zod/mini` 境界 / 純関数 parse / server component page ＋ client form）。再発明しない。
- **`capacity` は二段防御**: `zod/mini` でフォーム文字列を正整数に coerce＋親切エラー、`createResource` で不変条件（`>= 1` 整数）を最終保証。却下: どちらか一方。
- **具象生成は composition root に集約**（`getResourceRepository` を追加）。port 型に依存、in-memory を注入、Drizzle へは後続でこの 1 箇所を差し替える。
- **`kind` はフォームの自由文字列**（業種語彙を UI に enum で固定しない＝B-6 の精神）。
- **adr: false** の理由: web-customers で確立済みの delivery パターンの適用であり、新パターン / 構造変更ではない。
