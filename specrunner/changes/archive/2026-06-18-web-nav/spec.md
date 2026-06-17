# Spec: apps/web に管理ナビゲーションとダッシュボード home を追加する

## Requirements

### Requirement: 全ページに共通ナビゲーションヘッダを表示する

アプリケーション内の全ページに、5 セクションへのリンクを持つヘッダナビゲーションを表示しなければならない（SHALL）。ナビゲーションは `next/link` の `Link` コンポーネントを使用し、server component として描画する。

#### Scenario: layout にナビゲーションリンクが存在する

**Given** `app/layout.tsx` が全ページの共通レイアウトである
**When** いずれかのページが描画される
**Then** `<header>` 内に `/`（ホーム）・`/customers`・`/resources`・`/services`・`/bookings` への `Link` が表示される

#### Scenario: ナビゲーションは server component である

**Given** `app/layout.tsx` のナビゲーション
**When** ファイルを確認する
**Then** `'use client'` ディレクティブが存在しない

### Requirement: getDashboardCounts は 4 セクションの件数を正しく集計する

`getDashboardCounts(deps)` は repo 注入を受け取り、各 `list()` の件数を `{ customers, resources, services, bookings }` として返さなければならない（SHALL）。

#### Scenario: 空の repo で全 0 を返す

**Given** 4 つの repo がいずれも空（エンティティ 0 件）
**When** `getDashboardCounts({ customerRepo, resourceRepo, serviceRepo, bookingRepo })` を呼び出す
**Then** `{ customers: 0, resources: 0, services: 0, bookings: 0 }` を返す

#### Scenario: 各 repo に既知件数がある場合に正しい件数を返す

**Given** customerRepo に 2 件、resourceRepo に 1 件、serviceRepo に 3 件、bookingRepo に 1 件のエンティティが save 済み
**When** `getDashboardCounts({ customerRepo, resourceRepo, serviceRepo, bookingRepo })` を呼び出す
**Then** `{ customers: 2, resources: 1, services: 3, bookings: 1 }` を返す

### Requirement: ダッシュボード home が 4 セクションの件数とリンクを表示する

`app/page.tsx` は placeholder ではなく、composition root の repo から `getDashboardCounts` で取得した件数と、各セクションへのリンクを表示しなければならない（SHALL）。

#### Scenario: ダッシュボード home に 4 セクションのカードが表示される

**Given** composition root の各 repo にエンティティが存在する
**When** `app/page.tsx`（`/`）が描画される
**Then** 顧客・リソース・サービス・予約の 4 セクションについて、件数と対応ページへの `Link` が表示される

#### Scenario: ダッシュボード home は server component である

**Given** `app/page.tsx`
**When** ファイルを確認する
**Then** `'use client'` ディレクティブが存在せず、`getDashboardCounts` を使用している

### Requirement: ビルドとテストが通る

変更後、型チェック・テスト・ビルドの全てが成功しなければならない（SHALL）。

#### Scenario: monorepo 全体の検証が green

**Given** 全変更が適用された状態
**When** `pnpm -r --if-present run check-types && pnpm -r --if-present run test && pnpm -r --if-present run build` を実行する
**Then** 全コマンドが exit code 0 で完了する
