# packages/crm を新設し、Customer 集約と CustomerRepository port（＋ in-memory 実装）を確立する

## Meta

- **type**: new-feature
- **slug**: crm
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 新しい port/adapter 追加、既存パターンと異なる設計選択、振る舞い/契約を変える修正、構造的リファクタリング → true。いずれにも該当しない → false -->

## 背景

最初のドメインコンテキスト。顧客台帳（CRM）を業種中立の `Customer` 集約として確立し、以降の全ドメインパッケージ（resource / catalog / scheduling …）が踏襲する **「ドメインパッケージ ＋ Repository port ＋ in-memory 実装」のパターン**を敷く。
ヘキサゴナル（`docs/アーキテクチャ/model.md`）に従い、ドメインは永続化の port（interface）を定義し、具象実装は後続の `packages/db`（Drizzle）が担う。本 request は domain と port、テスト用の in-memory 実装までを範囲とする。単一テナント（tenantId を持たない）。

## 現状コードの前提

- `packages/shared`（`@koma/shared`）が値オブジェクト Id / Money 等を `packages/shared/src/index.ts:1-4` から export している。
- `pnpm-workspace.yaml:3` が `packages/*` を workspace として認識する。
- `packages/` には `shared` のみで、`packages/crm` は未作成。
- 既存ドメインパッケージの形（`packages/shared/package.json`）: `private` / `type: module` / `exports: { ".": "./src/index.ts" }` / scripts `check-types`(`tsc --noEmit`) `test`(`vitest run`) `lint`(`eslint .`) / devDeps eslint・typescript・vitest。

## 要件

<!-- 最重量部: ドメインパッケージの scaffold（workspace 配線・@koma/shared 依存・vitest）と、Repository port をドメインに置く境界。 -->

1. **packages/crm パッケージを新設する**。name `@koma/crm`、純粋 TS。`dependencies` に `@koma/shared`（`workspace:*`）。`next` / `react` / `drizzle-orm` / `zod` を入れない（`model.md` B-1〜B-4）。package.json / tsconfig / vitest / eslint は `@koma/shared` に倣い、scripts `check-types` / `test` / `lint` を持つ。公開 API は `src/index.ts` から re-export する。

2. **Customer 集約**。`id: Id<'Customer'>`、`name`、連絡先、`tags`、`notes`、`customFields`（拡張点）。
   - **連絡先 ContactInfo（値オブジェクト）**: 電話 / メール（いずれも任意）だが、**少なくとも 1 つを持つ**ことを不変条件とする。
   - **customFields**: キー → 値の**容れ物のみ**（スキーマ定義・検証は持たない＝拡張点。`model.md` B-6）。
   - 集約は immutable に更新する（更新は新インスタンスを返し、元を破壊しない）。

3. **CustomerRepository port（interface）**。ドメインが定義する永続化 seam。最小で `save(customer)` / `findById(id): Customer | null` / `list(): Customer[]`。具象は持たず interface のみ（`model.md` B-2: ドメインは ORM/DB を import しない）。

4. **in-memory CustomerRepository 実装**（純粋・テスト/デフォルト用）。

5. すべて vitest テストを伴う。`Customer` / `ContactInfo` / `CustomerRepository` / in-memory 実装を `src/index.ts` から export する。

## スコープ外

- Drizzle 永続化（`packages/db` は後続 request）
- 検索 / 絞り込み / ソート / ページネーション（後続。本 request は最小 `list` のみ）
- 認証・ユーザー（`iam` は別コンテキスト。`User` と `Customer` は別概念）
- マルチテナント（単一テナント方針 — tenantId を持たない）
- 来店履歴の集計（`reporting` は別）
- カスタムフィールドのスキーマ定義・検証（拡張点。値の容れ物のみ）

## 受け入れ基準

<!-- 機械検証できる文にする。 -->

- [ ] `packages/crm/package.json` の name が `@koma/crm` で、`grep -E '"(next|react|drizzle-orm|zod)"' packages/crm/package.json` が 0 件、`@koma/shared` に依存している
- [ ] `pnpm -F @koma/crm run check-types` が成功する
- [ ] `Customer`: 連絡先（電話・メール）が両方無いと構築できないことをテストで固定する／`customFields` が値の容れ物として機能する
- [ ] `Customer` は immutable（更新は新インスタンスを返し、元インスタンスを破壊しない）ことをテストで固定する
- [ ] `CustomerRepository` interface が `save` / `findById` / `list` を持つ
- [ ] in-memory 実装: `save` → `findById` で取得できる／未保存 id は `null`／`list` が保存分を返す、をテストで固定する
- [ ] 各型（Customer / ContactInfo / in-memory repo）に vitest テストがある
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green

## architect 評価済みの設計判断

<!-- 採用案 + 却下案。 -->

- **Customer は集約（整合性境界）**、参照は `Id<'Customer'>`。**ContactInfo を値オブジェクト**にし「電話/メールいずれか必須」を不変条件で持つ。却下: 連絡先を素の string フィールド（必須性・複数チャネルを型で表現できない）。
- **CustomerRepository は port（interface）をドメインに置き、in-memory をデフォルト実装に**。具象 DB は `packages/db`（後続）。却下: ドメインから直接 DB/ORM アクセス（`model.md` B-2 違反、永続化技術がドメインに漏れる）。
- **customFields は値の容れ物のみ**（`Map<string, value>` 相当）。スキーマ定義・検証はドメイン外（拡張点。delivery/設定が注入）。却下: 業種別フィールドをドメインに first-class で持つ（B-6 違反、業種中立を壊す）。
- **immutable 更新**（更新メソッドは新 `Customer` を返す）。却下: 可変 setter（共有参照経由の不変条件破壊）。
- **単一テナント**: `tenantId` を持たない。却下（現時点）: マルチテナント（ユーザー方針で単一店舗。将来 Organization を上流に足す移行で対応）。
- **adr: true** の理由: 最初のドメインコンテキストとして「ドメインパッケージ ＋ Repository port ＋ in-memory 実装」のパターンを確立する構造決定であり、resource / catalog / scheduling が踏襲するため記録する。
