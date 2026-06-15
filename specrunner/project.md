# Koma

予約・顧客管理の業務システム。具体例として小規模サロンを置きつつ、業務システムの典型要素（認証/RBAC・マスタ CRUD・検索/絞り込み・集計・監査ログ・通知・状態機械・同時実行制御）を備える。spec-runner で開発する。

## 構造 authority

構造（層・依存・集約・状態機械）の定義は **`docs/アーキテクチャ/` が正典**。実装はこれに従う:

- `model.md` — 様式・層・依存（DSM）・構造不変条件 B-1〜B-6
- `domain-model.md` — 集約・エンティティ・値オブジェクト・拡張点・型の所在
- `dynamic-model.md` — 状態機械・モジュール間束縛

構造を変える場合は docs を更新する。振る舞い（アルゴリズム・手順・routing）は request / spec 側に置き、docs には書かない。

## Stack

Turborepo + pnpm workspaces / TypeScript / Next.js（App Router・配信層のみ）/ Drizzle（PostgreSQL・adapter）/ `zod/mini`（配信境界の入力検証）/ vitest。

## 依存規律（要点 — 詳細は model.md §4）

- ドメイン（`packages/scheduling` `crm` `notification` …）と共有カーネル（`packages/shared`）は `next` / `react` / `drizzle-orm` / `zod` を import しない（純粋 TS）。
- 永続化はドメインが定義する **port 越し**、実装は `packages/db` のみ。
- 兄弟ドメイン同士は直接 import せず、連携は shared のイベント契約か配信の composition 経由。
- 業種固有の語彙・振る舞いは 4 つの拡張点（カスタムフィールド / 戦略 interface / イベント購読 / 通知テンプレート）に閉じる。

## テスト

- 配置は sibling（`src/foo.ts` → `src/foo.test.ts`）。
- 検証は `.specrunner/config.json` の `verification.commands`（`pnpm -r --if-present run {check-types,test,lint,build}`）。
