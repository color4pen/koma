# Koma

予約・顧客管理の業務システム。小規模サロンを具体例に、**業種中立な予約コア**を Turborepo モノレポ ＋ ヘキサゴナルアーキテクチャで構築している。

> **Built by spec-runner** — 本リポジトリの全機能は、`request.md` を投入すると検証済み PR が返る AI パイプライン [spec-runner](https://github.com/color4pen/spec-runner) によって実装・レビュー・マージされた。各機能の spec → 実装 → レビュー → ADR → PR の全履歴は [`specrunner/changes/archive/`](specrunner/changes/archive/) に残っている。

## 何ができるか

- **顧客管理** — 顧客台帳の登録・一覧（カスタムフィールド対応）
- **リソース管理** — 予約枠の主体（人 / 席 / 部屋 / 機材）を `capacity`（同時受付数）つきで登録
- **メニュー管理** — サービス（所要時間・料金・対応リソース種別）の登録
- **予約作成** — 顧客 × サービス × リソース × 時刻で予約を作成。**capacity-aware な二重予約防止**（同一リソースで任意の時刻に重なる予約数が `capacity` を超えない）が効く
- **空き枠計算** — 稼働時間 × リソース × サービス × 既存予約から予約可能枠を導出（ドメイン層の純関数）

## アーキテクチャ

**Modular Monolith + Hexagonal（ports & adapters）**。依存は常に内向き。構造の定義は [`docs/アーキテクチャ/`](docs/アーキテクチャ/) が authority（[model](docs/アーキテクチャ/model.md) / [domain-model](docs/アーキテクチャ/domain-model.md) / [dynamic-model](docs/アーキテクチャ/dynamic-model.md)）。

```
apps/web              配信（Next.js）。入力検証は zod/mini。コンテキスト横断 use-case はここ
packages/shared       共有カーネル（値オブジェクト Id/Money/Duration/TimeRange・イベント契約）。純粋 TS
packages/crm          顧客（Customer）
packages/resource     リソース（Resource ＋ capacity ＋ 稼働時間 Availability）
packages/catalog      サービス（Service）
packages/scheduling   予約（Booking ＋ 状態機械 ＋ capacity-aware 整合性 ＋ 空き枠計算）
packages/db           Drizzle 永続化アダプタ（ドメインが定義した port を実装）
```

### 設計の要点

- **ドメインはフレームワーク非依存の純粋 TS** — `next` / `react` / `drizzle-orm` / `zod` を import しない。配信・永続化・検証ライブラリから独立
- **永続化はドメインが定義した port 越し** — 具象実装は `packages/db`（Drizzle）。同じ port の裏に in-memory 実装も在り、差し替え可能
- **コンテキストは互いに import しない** — 横断（予約作成など）は delivery 層の use-case が orchestrate する
- **業種固有は 4 つの拡張点に閉じる** — カスタムフィールド / 戦略 interface / イベント購読 / 通知テンプレート
- **capacity-aware スケジューリング** — 二重予約防止は「重なる active 予約 ≤ `capacity`」。1:1 予約は `capacity = 1` の特殊形

構造不変条件（依存方向 B-x など）の詳細は [model.md](docs/アーキテクチャ/model.md) を参照。

## 動かす

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

主な画面: `/customers`（顧客）・`/resources`（リソース）・`/services`（メニュー）・`/bookings`（予約作成）。
※ 既定では in-memory 永続化で動くため外部 DB は不要（再起動でデータはリセット）。

### 検証

```bash
pnpm -r run check-types   # 型チェック
pnpm -r run test          # vitest（DB アダプタは pglite ＝埋め込み Postgres で結合テスト）
pnpm -r run lint
pnpm build                # next build
```

## 技術スタック

- **モノレポ**: Turborepo + pnpm workspaces
- **言語**: TypeScript
- **配信**: Next.js（App Router・Server Actions）
- **永続化**: Drizzle ORM（PostgreSQL）／テストは pglite（埋め込み Postgres）
- **入力検証**: `zod/mini`（配信境界のみ）
- **テスト**: vitest

## 開発プロセス

各機能は 1 つの `request.md`（要件・現状前提・受け入れ基準・設計判断）から始まり、spec-runner が **design → spec-review → 実装 → verification → code-review → conformance → PR** を自動実行する。判定はエージェントの自己申告でなく検証から導出され、構造の不変条件（依存方向）は conformance が照合する。完了した変更の全アーティファクトは `specrunner/changes/archive/<date>-<slug>/` に保存されている。
