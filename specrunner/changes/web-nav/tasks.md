# Tasks: apps/web に管理ナビゲーションとダッシュボード home を追加する

## T-01: app/layout.tsx に共通ナビゲーションヘッダを追加する

- [ ] `apps/web/app/layout.tsx` を編集する
- [ ] `next/link` から `Link` を import する
- [ ] `<body>` 内、`{children}` の前に `<header>` 要素を追加する
- [ ] `<header>` 内に `<nav>` を配置し、以下の 5 つの `<Link>` を含める:
  - `href="/"`、テキスト「ホーム」
  - `href="/customers"`、テキスト「顧客」
  - `href="/resources"`、テキスト「リソース」
  - `href="/services"`、テキスト「サービス」
  - `href="/bookings"`、テキスト「予約」
- [ ] ナビゲーションに最小限のインラインスタイルを適用する（横並び・リンク間のスペーシング程度）
- [ ] `<header>` にアプリ名「Koma」を含める（ロゴ相当、`<Link href="/">` で home に遷移）
- [ ] `'use client'` は追加しない（server component のまま）

**Acceptance Criteria**:
- `app/layout.tsx` に `import Link from 'next/link'` が存在する
- `<header>` 内に `/`・`/customers`・`/resources`・`/services`・`/bookings` の 5 つの `Link` が存在する
- `'use client'` が存在しない
- `pnpm -F web run check-types` が成功する

## T-02: getDashboardCounts 純関数を作成する

- [ ] `apps/web/lib/dashboard.ts` を新規作成する
- [ ] `DashboardDeps` 型を定義する:
  ```
  type DashboardDeps = {
    customerRepo: { list(): Promise<unknown[]> };
    resourceRepo: { list(): Promise<unknown[]> };
    serviceRepo: { list(): Promise<unknown[]> };
    bookingRepo: { list(): Promise<unknown[]> };
  };
  ```
  - 各プロパティは `{ list(): Promise<unknown[]> }` の構造型。具体的なドメイン型に依存しない
- [ ] `DashboardCounts` 型を定義・export する:
  ```
  export type DashboardCounts = {
    customers: number;
    resources: number;
    services: number;
    bookings: number;
  };
  ```
- [ ] `getDashboardCounts(deps: DashboardDeps): Promise<DashboardCounts>` 関数を export する:
  - `Promise.all` で 4 つの `deps.*.list()` を並行呼び出しする
  - 各配列の `.length` を対応するキーに設定して返す
- [ ] repo への副作用（save 等）は一切行わない（純粋な読み取り専用関数）

**Acceptance Criteria**:
- `getDashboardCounts` が export されている
- `DashboardCounts` 型が export されている
- `Promise.all` で 4 つの list を並行呼び出ししている
- `pnpm -F web run check-types` が成功する

## T-03: getDashboardCounts の vitest テストを作成する

- [ ] `apps/web/lib/dashboard.test.ts` を新規作成する（sibling 配置）
- [ ] `getDashboardCounts` を `@/lib/dashboard` から import する
- [ ] in-memory repo と各ドメインファクトリを import する:
  - `createInMemoryCustomerRepository`, `createCustomer` from `@koma/crm`
  - `createInMemoryResourceRepository`, `createResource` from `@koma/resource`
  - `createInMemoryServiceRepository`, `createService` from `@koma/catalog`
  - `createInMemoryBookingRepository`, `createBooking` from `@koma/scheduling`
  - `createContactInfo` from `@koma/crm`（Customer 生成に必要）
  - `ofMinutes`, `createMoney` from `@koma/shared`（Service 生成に必要）
  - `createId` from `@koma/shared`（エンティティ生成に必要）
- [ ] **テストケース: 空の repo で全 0 を返す**
  - 4 つの in-memory repo を生成（save なし）
  - `getDashboardCounts({ customerRepo, resourceRepo, serviceRepo, bookingRepo })` を呼ぶ
  - 結果が `{ customers: 0, resources: 0, services: 0, bookings: 0 }` であることを検証
- [ ] **テストケース: 各 repo に既知件数を save した状態で正しい件数を返す**
  - 各 repo に既知数のエンティティを save する（例: customers 2件、resources 1件、services 3件、bookings 1件）
  - Customer は `createCustomer({ name, contact: createContactInfo({ phone }) })` で生成
  - Resource は `createResource({ name, kind, capacity })` で生成
  - Service は `createService({ name, duration: ofMinutes(60), price: createMoney(1000, 'JPY'), resourceKinds: [] })` で生成
  - Booking は `createBooking({ customerId, serviceId, resourceId, slot: { start, end } })` で生成（customerId / serviceId / resourceId は save 済みエンティティの id を使用）
  - `getDashboardCounts` の結果が各 save 件数と一致することを検証

**Acceptance Criteria**:
- `pnpm -F web run test` で dashboard.test.ts の全テストが pass
- 空状態テストと既知件数テストの 2 ケース以上が存在する
- テストファイルが `apps/web/lib/dashboard.test.ts` に配置されている

## T-04: app/page.tsx をダッシュボード home に書き換える

- [ ] `apps/web/app/page.tsx` を編集する（既存の placeholder を完全に置き換える）
- [ ] `next/link` から `Link` を import する
- [ ] `@/lib/composition-root` から `getCustomerRepository`, `getResourceRepository`, `getServiceRepository`, `getBookingRepository` を import する
- [ ] `@/lib/dashboard` から `getDashboardCounts` を import する
- [ ] `export default async function Home()` として server component を定義する:
  - composition root から 4 つの repo を取得する
  - `getDashboardCounts({ customerRepo, resourceRepo, serviceRepo, bookingRepo })` で件数を取得する
  - 4 つのカードを描画する。各カードは:
    - セクション名（「顧客」「リソース」「サービス」「予約」）
    - 件数（`counts.customers` 等）
    - 対応ページへの `<Link>`（`/customers` 等）
  - カードは素の HTML（`<section>` / `<div>`）とインラインスタイルで横並びまたはグリッド状に配置
- [ ] `'use client'` は追加しない（server component のまま）
- [ ] ページタイトル（例: `<h1>ダッシュボード</h1>`）を含める

**Acceptance Criteria**:
- `app/page.tsx` が placeholder ではなく、4 セクションの件数とリンクを描画している
- `getDashboardCounts` を使用している（page に集計ロジックを直書きしていない）
- composition root の getter 経由で repo を取得している
- 各カードに `next/link` の `<Link>` が `/customers`・`/resources`・`/services`・`/bookings` へのリンクとして存在する
- `'use client'` が存在しない
- `pnpm -F web run check-types` が成功する

## T-05: 全体検証

- [ ] `pnpm -F web run check-types` が成功することを確認する
- [ ] `pnpm -F web run test` で全テストが pass することを確認する（dashboard.test.ts を含む既存テスト全て）
- [ ] `pnpm -F web run build`（`next build`）が成功することを確認する
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test && pnpm -r --if-present run build` が green であることを確認する（他パッケージへの影響がない）
- [ ] 全ページに共通ナビ（`/`・`/customers`・`/resources`・`/services`・`/bookings` への `Link`）が `layout.tsx` 経由で表示されることをコードレビューで確認する
- [ ] `app/page.tsx` が 4 セクションの件数カード + リンクを描画していることをコードレビューで確認する

**Acceptance Criteria**:
- 全受け入れ基準が green:
  - `pnpm -F web run build`（`next build`）が成功する
  - 全ページに共通ナビ（`/customers`・`/resources`・`/services`・`/bookings`・home への `next/link`）が表示される
  - `getDashboardCounts`: 各 repo に既知件数を save した状態で `{ customers, resources, services, bookings }` を正しく返し、空なら全 0、をテストで固定する
  - `app/page.tsx` が 4 セクションの件数とリンクを描画する（placeholder ではなくなる）
  - `pnpm -r --if-present run check-types && pnpm -r --if-present run test && pnpm -r --if-present run build` が green
