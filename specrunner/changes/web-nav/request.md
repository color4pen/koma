# apps/web に管理ナビゲーションとダッシュボード home を追加する

## Meta

- **type**: new-feature
- **slug**: web-nav
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 新しい port/adapter 追加、既存パターンと異なる設計選択、振る舞い/契約を変える修正、構造的リファクタリング → true。いずれにも該当しない → false -->

## 背景

管理画面（顧客 / リソース / サービス / 予約）は実装済みだが相互にリンクされておらず、URL 直打ちが必要。**全画面共通のナビゲーション**と、各セクションの件数を表示する**ダッシュボード home** を追加し、navigable で一体感のある管理アプリにする。新しいドメイン・パターンは導入しない。

## 現状コードの前提

- `apps/web/app/layout.tsx` は最小（`html` / `body` のみ、ナビなし）。`app/page.tsx` は placeholder（"Koma" のみ）。
- 機能ページ: `/customers`・`/resources`・`/services`・`/bookings` が実装済み。
- `apps/web/lib/composition-root.ts` に `getCustomerRepository` / `getResourceRepository` / `getServiceRepository` / `getBookingRepository`（各 `list()` を持つ port）。
- `next/link` が利用可能（Next.js App Router）。

## 要件

<!-- 最重量部: ダッシュボード件数の集計関数（テスト可能）と、共通ナビの全ページ適用。 -->

1. **共通ナビゲーション**。`app/layout.tsx`（または共通ヘッダ component）に、`/`（ホーム）・`/customers`・`/resources`・`/services`・`/bookings` への `next/link` を持つヘッダを追加し、全ページに表示する。最小限の素の HTML/インラインスタイルで可。

2. **ダッシュボード集計（純関数）** `getDashboardCounts(deps)` を `apps/web/lib/dashboard.ts` に追加。`deps`（customer / resource / service / booking の各 repo）から各 `list()` の件数を集計し `{ customers, resources, services, bookings }` を返す。

3. **ダッシュボード home**。`app/page.tsx`（server component）を、composition root の各 repo から `getDashboardCounts` で件数を取り、4 セクションの件数とリンクをカード状に並べるダッシュボードにする。

4. **vitest テスト**: `getDashboardCounts`（各 repo に既知件数を save した状態で正しい件数を返す、空なら全 0）を in-memory repo で固定する。

## スコープ外

- 認証・認可（`iam` は別）
- スタイリングフレームワーク導入（最小の素スタイルで可）
- グラフ・期間集計・KPI（`reporting` は別コンテキスト）
- 編集 / 削除 / 検索

## 受け入れ基準

<!-- 機械検証できる文にする。 -->

- [ ] `pnpm -F web run build`（`next build`）が成功する
- [ ] 全ページに共通ナビ（`/customers`・`/resources`・`/services`・`/bookings`・home への `next/link`）が表示される
- [ ] `getDashboardCounts`: 各 repo に既知件数を save した状態で `{ customers, resources, services, bookings }` を正しく返し、空なら全 0、をテストで固定する
- [ ] `app/page.tsx` が 4 セクションの件数とリンクを描画する（placeholder ではなくなる）
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test && pnpm -r --if-present run build` が green

## architect 評価済みの設計判断

<!-- 採用案 + 却下案。 -->

- **件数集計を純関数 `getDashboardCounts(deps)` に分離**（repo 注入でテスト可能）。home server component は薄く（repo を渡して描画）。却下: home に集計ロジックを直書き（テスト不能）。
- **ナビは server-rendered な `next/link`**（client state 不要）。却下: client component 化（不要な複雑化）。
- **composition root の既存 getter を再利用**（具象生成は引き続き 1 箇所）。
- **adr: false** の理由: 既存 delivery パターンの範囲内の UI 追加であり、新パターン / 構造変更ではない。
