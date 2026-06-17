# Design: apps/web に管理ナビゲーションとダッシュボード home を追加する

## Context

`apps/web` は Next.js 15 App Router ベースの管理画面。`/customers`・`/resources`・`/services`・`/bookings` の 4 セクションが実装済みだが、相互リンクがなく URL 直打ちが必要。`app/layout.tsx` は `<html>` / `<body>` のみでナビゲーションを持たず、`app/page.tsx` は "Koma" テキストだけの placeholder。

現状コードの前提:

- `app/layout.tsx` は最小構成（`<html lang="ja"><body>{children}</body></html>`）。
- `app/page.tsx` は `<h1>Koma</h1>` と説明文のみの placeholder。
- 各機能ページ（customers / resources / services / bookings）は `<main>` 直下に `<h1>` + フォーム + 一覧テーブルを配置する構造。server component で composition root の repo を使って一覧取得する。
- `apps/web/lib/composition-root.ts` に `getCustomerRepository` / `getResourceRepository` / `getServiceRepository` / `getBookingRepository` が存在し、いずれも `list(): Promise<T[]>` を持つ port を返す。
- `next/link` が利用可能。`zod` / `vitest` は導入済み。

## Goals / Non-Goals

**Goals**:

- 全ページ共通のナビゲーションヘッダを `app/layout.tsx`（またはヘッダ component）に追加し、`/`・`/customers`・`/resources`・`/services`・`/bookings` 間を `next/link` で遷移可能にする
- ダッシュボード集計の純関数 `getDashboardCounts(deps)` を `apps/web/lib/dashboard.ts` に追加し、4 セクションの件数を返す
- `app/page.tsx` を placeholder から、各セクションの件数カードとリンクを表示するダッシュボード home に置き換える
- `getDashboardCounts` の vitest テスト（既知件数で正しい値を返す、空なら全 0）を in-memory repo で固定する
- `next build` を通す

**Non-Goals**:

- 認証・認可（`iam` は別コンテキスト）
- スタイリングフレームワーク導入（最小の素 HTML / インラインスタイルで可）
- グラフ・期間集計・KPI（`reporting` は別コンテキスト）
- 編集・削除・検索機能
- アクティブリンクのハイライト（後続で追加可能だが本スライスではスコープ外）

## Decisions

### D1: ナビゲーションを server-rendered な `next/link` ヘッダとして layout に配置する

`app/layout.tsx` の `<body>` 内に `<header>` 要素を追加し、5 つのリンク（ホーム・顧客・リソース・サービス・予約）を `next/link` で配置する。ナビゲーションロジックは server component のみで完結し、client component 化しない。

ヘッダは `layout.tsx` に直接記述する。コンポーネント抽出（`components/header.tsx` 等）は、ナビが複雑化した時点で行う。現時点ではリンク 5 本のみであり、layout に直書きする方がファイル数を抑えられ見通しが良い。

**Rationale**: architect 評価済み。client state が不要（クリック時に Next.js の client-side navigation が `next/link` の標準動作として処理される）。server component として描画するのが最もシンプル。

**Alternatives considered**:
- `'use client'` でナビを実装し `usePathname` でアクティブリンクをハイライト → 却下。本スライスでは不要な複雑化。アクティブリンクは後続で必要になった時点で追加する。
- `components/header.tsx` に分離する → 却下。現時点ではリンク 5 本のみで、別ファイルに分離するメリットが薄い。

### D2: ダッシュボード集計を純関数 `getDashboardCounts(deps)` に分離する

```typescript
// lib/dashboard.ts
type DashboardDeps = {
  customerRepo: { list(): Promise<unknown[]> };
  resourceRepo: { list(): Promise<unknown[]> };
  serviceRepo: { list(): Promise<unknown[]> };
  bookingRepo: { list(): Promise<unknown[]> };
};

type DashboardCounts = {
  customers: number;
  resources: number;
  services: number;
  bookings: number;
};

async function getDashboardCounts(deps: DashboardDeps): Promise<DashboardCounts>
```

- deps の各プロパティは `{ list(): Promise<unknown[]> }` の構造型で受け取る。具体的なドメイン型（`CustomerRepository` 等）への依存を避けることで、テスト時にモック構築が容易になる。実際の composition root の repo は構造的にこの型を満たす。
- `Promise.all` で 4 つの `list()` を並行呼び出しし、各配列の `.length` を返す。
- 関数は async（repo の `list()` が async のため）。

**Rationale**: architect 評価済み。home server component に集計ロジックを直書きするとテスト不能になる。純関数に抽出し repo を注入することで vitest テストが容易になる。

**Alternatives considered**:
- `app/page.tsx` に集計ロジックを直書き → 却下（テスト不能）。architect が却下済み。
- 各 repo の count メソッドを使う → 却下。現状の port に `count()` はなく、`list().length` で十分。

### D3: ダッシュボード home は server component で薄く実装する

`app/page.tsx` を server component のまま、composition root から 4 つの repo を取得し `getDashboardCounts` に渡して件数を取得、4 つのカードを `next/link` でリンク付きで描画する。

カードは素の HTML（`<section>` / `<div>` + インラインスタイル）で、各カードにセクション名・件数・リンクを表示する。

**Rationale**: server component で完結するため client JavaScript が不要。データ取得と描画のみの薄い配信層として、composition root → 純関数 → 描画のパイプラインを維持する。

**Alternatives considered**:
- client component にしてリアルタイム更新 → 却下。不要な複雑化。

### D4: composition root の既存 getter を再利用する

`composition-root.ts` の `getCustomerRepository` / `getResourceRepository` / `getServiceRepository` / `getBookingRepository` をそのまま使う。新しい getter や変更は不要。

**Rationale**: architect 評価済み。具象生成は引き続き composition root の 1 箇所に閉じる。

### D5: テストは in-memory repo を直接使い、getDashboardCounts の振る舞いを固定する

`lib/dashboard.test.ts` で `createInMemory*Repository` を使って各 repo を生成し、既知件数の save 後に `getDashboardCounts` が正しい件数を返すことを検証する。空状態（save なし）で全 0 を返すことも検証する。

テストではドメインファクトリ（`createCustomer` 等）を使って有効なエンティティを生成して save する。これにより composition root のモックが不要になり、テストが安定する。

**Rationale**: `getDashboardCounts` は repo の `list()` の `.length` を返すだけの関数。in-memory repo の実体を注入する方がモックより実装に密結合しない。既存テスト（`create-booking-use-case.test.ts`）が同じパターンを採用している。

**Alternatives considered**:
- `vi.mock` で repo をモック → 却下。in-memory repo が利用可能で、より実装に密結合しないテストが書ける。

## Risks / Trade-offs

[Risk] **`list()` 全件取得のスケーラビリティ** — ダッシュボード件数取得で 4 つの `list()` を呼び、全エンティティを取得してから `.length` を返す。件数が多い場合に非効率。
→ Mitigation: 現時点では in-memory repo でデモ用途。将来 Drizzle 永続化後に `count()` メソッドを port に追加する際は `getDashboardCounts` の deps 型を拡張すれば対応可能。本スライスでは YAGNI。

[Risk] **ナビの layout 直書き** — ナビが複雑化（ドロワー、認証メニュー等）した際に layout.tsx が肥大化する。
→ Mitigation: 現時点ではリンク 5 本のみ。複雑化した時点でコンポーネント抽出する。

## Open Questions

なし。request の architect 評価済み設計判断に従い、未決定事項はない。
