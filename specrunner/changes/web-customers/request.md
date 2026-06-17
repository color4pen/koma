# apps/web に顧客の一覧・登録 管理画面を追加する（delivery 層 ＋ zod/mini 境界検証）

## Meta

- **type**: new-feature
- **slug**: web-customers
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 新しい port/adapter 追加、既存パターンと異なる設計選択、振る舞い/契約を変える修正、構造的リファクタリング → true。いずれにも該当しない → false -->

## 背景

delivery 層（`apps/web`）の最初のスライスとして、**顧客の一覧・登録**ができる管理画面を追加する。同時に、以降の全 delivery 機能が踏襲する**パターン**を確立する: (1) **composition root**（ドメイン port にアダプタを注入）/ (2) **server action**（ユースケース）/ (3) **`zod/mini` による入力境界検証**（`docs/アーキテクチャ/model.md` B-3: 検証は配信境界、ドメインは zod を import しない）。
最初は永続化に **in-memory CustomerRepository** を使い out-of-the-box で動く形にする（Drizzle 配線は後続スライス。両実装が同一 port の裏に在ることで swappability を実証）。

## 現状コードの前提

- `apps/web` は最小 scaffold（`apps/web/app/layout.tsx` / `app/page.tsx` / `next.config.ts` / `package.json`）。dependencies は `next` / `react` / `react-dom` のみ。
- `@koma/crm` が `createCustomer` / `createContactInfo` / `CustomerRepository`（port）/ `createInMemoryCustomerRepository` を `packages/crm/src/index.ts` から export している。
- `Customer` は `name` / `contact: ContactInfo`（`phone|null` / `email|null`、≥1 必須）/ `tags` / `notes` / `customFields`。`createContactInfo` は電話・メールが両方無いと throw する。
- `apps/web/package.json` に `@koma/crm` / `zod` / `vitest` は無い。

## 要件

<!-- 最重量部: zod/mini 境界検証 → ドメイン集約構築の橋渡し、composition root の単一性、next build を通す server/client 境界。 -->

1. **依存追加**。`apps/web` に `@koma/crm`（`workspace:*`）と `zod`（`zod/mini` サブパスを使用）を dependencies に、`vitest` を devDependencies に追加し、`apps/web/package.json` に `test`（`vitest run`）スクリプトを追加する。`drizzle-orm` は入れない（delivery は db を直接 import しない）。

2. **composition root**。アプリ存続期間で単一の **in-memory `CustomerRepository`** を生成・保持するモジュール（`createInMemoryCustomerRepository` を 1 度だけ生成）。server action / page はこれを介して repo を得る。ドメインの port 型に依存する（具象生成はこの 1 箇所に閉じる）。

3. **入力境界検証（`zod/mini`）＋ 集約構築**を行う**テスト可能な純関数** `parseCustomerInput(raw): { ok: true; customer } | { ok: false; errors }`。`zod/mini` schema で `name`（非空）/ `phone?` / `email?` を検証し、**電話・メールの少なくとも一方**を要求する。成功時は `createContactInfo` ＋ `createCustomer` でドメイン `Customer` を構築して返す。失敗時はフィールド別エラーを返す（repo には触らない）。

4. **server action** `createCustomerAction`（`'use server'`）。`parseCustomerInput` を呼び、成功時のみ composition root の repo に `save` し、一覧を revalidate する。失敗時はエラーを返す。

5. **ページ** `app/customers/page.tsx`（server component）。repo の `list()` で顧客一覧を表示し、`createCustomerAction` を呼ぶ登録フォームを表示する。

6. **vitest テスト**: `parseCustomerInput` の単体テスト（有効入力 → `Customer`、`name` 空 → エラー、連絡先ゼロ → エラー）。

## スコープ外

- 顧客の編集・削除（本スライスは一覧・登録のみ）
- Drizzle 永続化への配線（後続スライス。本スライスは in-memory）
- 認証・認可（`iam` は別。本スライスは保護なし）
- 検索 / 絞り込み / ページネーション
- Resource / Service / 予約の画面（後続）
- スタイリングの作り込み（最小限の素の HTML で可）

## 受け入れ基準

<!-- 機械検証できる文にする。 -->

- [ ] `apps/web/package.json` が `@koma/crm` / `zod` に依存し、`grep -E '"drizzle-orm"' apps/web/package.json` が 0 件、`test` スクリプトがある
- [ ] `pnpm -F web run build`（`next build`）が成功する
- [ ] `parseCustomerInput`: 有効入力で `ok: true` と妥当な `Customer`（`createContactInfo`/`createCustomer` 経由）を返す／`name` 空で `ok: false`／電話・メール両方空で `ok: false`、をテストで固定する
- [ ] composition root が in-memory `CustomerRepository` を**単一**生成し、server action / page がそれを介して repo を使う（具象生成が 1 箇所）
- [ ] `app/customers/page.tsx` が一覧と登録フォームを描画し、`createCustomerAction` が成功時に `save` する
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test && pnpm -r --if-present run build` が green

## architect 評価済みの設計判断

<!-- 採用案 + 却下案。 -->

- **検証は `zod/mini` で配信境界に置き、ドメインは zod を import しない**（B-3）。`zod/mini` は tree-shakeable variant でバンドルを小さく保つ。却下: ドメインに zod スキーマを持たせる（B-3 違反・検証都合がドメインに漏れる）。
- **二段の防御**: `zod/mini` が**ユーザー向けの分かりやすいフィールドエラー**を境界で返し、`createContactInfo`/`createCustomer` が**集約の不変条件**（≥1 連絡先等）を最終的に保証する。却下: どちらか一方のみ（境界だけ＝不変条件が緩む / ドメインだけ＝UX が悪い）。
- **composition root に具象生成を 1 箇所集約**。port 型に依存し、in-memory を注入。Drizzle へは後続でこの 1 箇所を差し替えるだけ（swappability の実証）。却下: page / action で直接 `createInMemoryCustomerRepository`（生成が散らばり差し替え困難）。
- **検証+構築を純関数 `parseCustomerInput` に抽出**してテスト可能にする。server action は薄く（純関数 ＋ `save` ＋ revalidate）。却下: server action 内に検証ロジックを直書き（テスト不能）。
- **adr: true** の理由: delivery 層の最初のスライスとして composition root / server action / zod-mini 境界検証のパターンを確立する構造決定であり、以降の全画面が踏襲するため記録する。
