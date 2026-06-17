# Architecture Model — Koma の構造 authority（定義）

> **これは構造の定規（the structural authority）**。「コードがどう組まれているべきか」（層・依存方向）を positive・self-standing に宣言する。
> **対になるもの**: 本書（構造の authority）= **コードがどう構造化されているか** ／ test suite（振る舞いの authority）= **振る舞いがどう確定しているか**。
> **被覆スコープ**: 本書は静的構造（層・依存・配置の不変条件）のみを縛る。

---

## 1. 様式

> **Modular Monolith + Hexagonal（ports & adapters）** ／ 物理境界は **Turborepo + pnpm workspaces**

- **モジュール境界 = パッケージ境界**: 業務能力（予約 / 顧客 / 通知）を別パッケージに分け、依存を package.json の `dependencies` と lint で物理強制する。規約でなく境界そのもので守る。
- **Hexagonal**: 外部 I/O（永続化・通知送信・時刻）の seam だけを domain 側の `port`（interface）＋ `db` / 配信側の adapter（実装）で引く。
- **domain は純粋 TS**: `next` / `react` / `drizzle-orm` / `zod` を import しない。フレームワーク・ORM・検証ライブラリから独立に保つ。これが業種・配信・永続化をまたぐ汎用性の物理的担保。
- **配信 = composition root**: `apps/web` が実装を組み立て、依存を注入し、入力を検証する唯一の層。
- 制約: solo 開発・TS・重い ceremony（DI コンテナ / フル DDD / 未使用 port）を入れない。

---

## 2. 層（nodes）と責務 / mapping

| 層 | 責務 | 含む（mapping）|
|---|---|---|
| **delivery / composition-root** | Next.js 配信。実装を組み立て依存を注入。入力検証（`zod/mini`）。業種固有の product 選択 | `apps/web` |
| **domain** | 各業務コンテキストのロジック・判定・集約。業種中立・単一テナント | `packages/{scheduling, crm, resource, catalog, iam, notification, audit, reporting}`（`domain-model.md` のコンテキスト分類）|
| **ports** | domain が要求する外部 I/O の interface（Repository / 通知送信 / 時刻 等） | 各 domain パッケージ内の `src/port/` |
| **adapters / persistence** | ports の実装。Drizzle・外部 SDK はここだけ | `packages/db` |
| **shared-kernel** | 全 domain が参照する値オブジェクト・共有契約（イベント契約含む） | `packages/shared` |

```
delivery(apps/web) ─→ (all)
   domain ─→ own-ports, shared-kernel
   ports  ─→ shared-kernel(型)
   adapters/persistence(db) ─→ domain-ports(型), shared-kernel, external(drizzle-orm)
   shared-kernel ─→ (none)
```

---

## 3. 許可された依存（the closure model）

**✓ の edge だけ allowed。表に無い（✗）edge が actual に現れたら divergence。**

> コンテキストが増えても規則は一様なので、**役割（role）ベース**で示す（per-package 列挙はしない）。

| from \ to | delivery(web) | domain-context | shared | db | ext¹ |
|---|:--:|:--:|:--:|:--:|:--:|
| **delivery（web）** | — | ✓ | ✓ | ✓ | ✓ |
| **domain-context²** | ✗ | ✗³ | ✓ | ✗ | ✗ |
| **shared** | ✗ | ✗ | — | ✗ | ✗ |
| **db** | ✗ | △⁴ | ✓ | — | ✓⁵ |

- ¹ **ext** = `next` / `react` / `drizzle-orm` / `zod` 等の外部フレームワーク。許可は **delivery**（`next`/`react`/`zod/mini`）と **db**（`drizzle-orm`）のみ。
- ² **domain-context** = `scheduling` / `crm` / `resource` / `catalog` / `iam` / `notification` / `audit` / `reporting` のいずれか。全コンテキストが同一規則に従う。各コンテキストは自分の `src/port/` には依存してよい。
- ³ **兄弟コンテキスト非依存**: あるコンテキストは他コンテキストを import しない（B-5）。連携は shared のイベント契約か delivery の composition 経由。
- ⁴ db → domain は **port interface / 型 / 集約ファクトリ（anti-corruption 用の行 → 集約再構成）**を参照可とする。domain のユースケース・ビジネスロジックは import しない。
- ⁵ db のみ `drizzle-orm` を import してよい。
- **closure rule**: 上表で ✗ の edge が actual に存在したら divergence。未知の逆流も自動的に divergence。

---

## 4. Load-bearing 構造不変条件（the「must」＋ なぜ）

> ここは**構造**（層・依存・配置）の不変条件のみ。データの不変条件（二重予約等）は `domain-model.md`、状態遷移の不変条件は `dynamic-model.md`。

| # | invariant | なぜ |
|---|---|---|
| **B-1** | domain（各コンテキスト）と shared は `next` / `react` を import しない | ドメインを配信・UI から独立に保つ。配信の差し替え（別フレームワーク・別チャネル）の影響を web に閉じる |
| **B-2** | domain と shared は `drizzle-orm`（および具象 DB ドライバ）を import しない。永続化は domain が定義する **port（Repository interface）越し**。実装は db のみ | ORM/DB の差し替え・スキーマ変更の blast radius を db に封じる。ドメインを永続化技術から独立に保つ |
| **B-3** | domain と shared は `zod` を import しない。入力検証は delivery 境界（`apps/web`）で `zod/mini` により行う | 検証スキーマ・外部入力の都合をドメインに漏らさない。ドメインは値オブジェクトで自分の不変条件を守る |
| **B-4** | shared（共有カーネル）は他のどのパッケージも import しない（最下層・純粋 TS） | 依存グラフの底を固定し非循環に保つ。共有カーネルの業種中立を構造的に保証する |
| **B-5** | domain コンテキストは兄弟コンテキスト（`scheduling` / `crm` / `resource` / `catalog` / `iam` / `notification` / `audit` / `reporting` の相互）を直接 import しない。連携は shared のイベント契約（`dynamic-model.md`）または web の composition 経由 | モジュールを独立に保ち、業種固有の差し込みでコア間が密結合しないようにする |
| **B-6** | 業種固有の語彙（menu / 指名 / 会員 / 問診 等）を domain / shared の型・公開 API に置かない。業種固有は **4 つの拡張点**（カスタムフィールド / 戦略 interface / イベント購読 / 通知テンプレート、`domain-model.md`）に閉じる | ユビキタス言語の業種中立を構造的に守る。コアは `Service` / `Resource` で語る |

---

## 5. 強制（歯）

- 依存方向（B-1〜B-5）は **package.json の `dependencies`**（domain / shared に禁止依存を入れない）＋ **import 境界 lint**（dependency-cruiser もしくは eslint の境界ルール）で assert する。許可されない edge / 禁止 import を足すと red にする。
- 業種語彙の封じ込め（B-6）は review 観点（判断レビュー）で見る。
- 歯の実体は本リポジトリに歯が入った時点で確定する。それまで本書は定義（定規）であり、actual の収束度は持たない。

---

## 付録: 読み方

nodes（§2）＋ allowed edges + closure（§3）＋ mapping（§2）＋ why（§4）で構造の high-level model を成す。型/集約は `domain-model.md`、状態遷移・モジュール間束縛は `dynamic-model.md`。
