# packages/iam を新設し、User 集約・Role・Permission（認可）と UserRepository を確立する

## Meta

- **type**: new-feature
- **slug**: iam
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 新しい port/adapter 追加、既存パターンと異なる設計選択、振る舞い/契約を変える修正、構造的リファクタリング → true。いずれにも該当しない → false -->

## 背景

generic コンテキスト `iam`（認証・認可）のドメイン層を確立する。管理画面のスタッフ/オーナーのログイン identity（`User`）と、ロールに基づく認可（`Role` / `Permission`）を業種中立に持つ。`docs/アーキテクチャ/domain-model.md` の通り **`User`（ログイン identity）は `Resource`（予約資源）とは別概念**。
crm 等で確立した「ドメインパッケージ ＋ Repository port ＋ in-memory 実装」パターンを踏襲する。**パスワードのハッシュ化・検証・ログイン UI・セッションはスコープ外**（後続の配信スライス）。

## 現状コードの前提

- crm / resource / catalog / scheduling がドメインパッケージパターンを確立済み（`packages/crm/src/`: 集約 / `port/` / in-memory / `index.ts`）。`@koma/shared` が `Id` を export。
- `docs/アーキテクチャ/domain-model.md` が `iam` を generic コンテキスト（`User` / Role / Permission）とし、`User` ≠ `Resource` を定める。
- `packages/iam` は未作成。

## 要件

<!-- 最重量部: 認可（role → permission）の単一真実源と、パスワードハッシュをドメインに持ち込まない境界。 -->

1. **packages/iam パッケージを新設する**。name `@koma/iam`、純粋 TS、`@koma/shared` に `workspace:*` 依存。`next` / `react` / `drizzle-orm` / `zod` を入れない。crm に倣い scripts `check-types` / `test` / `lint`。公開 API は `src/index.ts`。

2. **Role**。管理者ロール `'owner' | 'staff'`。

3. **Permission ＋ 認可（純関数）**。操作を表す `Permission` の集合（例: `manage-customers` / `manage-resources` / `manage-services` / `manage-bookings` / `manage-users` / `manage-settings`）を定義し、**role → 許可 Permission の対応**を単一の真実源に持つ。`can(role, permission): boolean` を提供する（例: `owner` は全 Permission、`staff` は `manage-users` / `manage-settings` を持たない）。

4. **User 集約**。`id: Id<'User'>` / `email` / **`passwordHash`（不透明な文字列。ハッシュ化・検証は配信の責務でドメインは保持のみ）** / `role: Role`。不変条件: `email` は非空。immutable に更新（更新は新インスタンス）。

5. **UserRepository port（`src/port/`）**。`findById` / **`findByEmail(email): User | null`**（ログイン用）/ `save` / `list`（async）。＋ in-memory 実装。

6. すべて vitest テストを伴う。`User` / `Role` / `Permission` / `can` / `UserRepository` / in-memory 実装を `src/index.ts` から export する。

## スコープ外

- パスワードのハッシュ化・検証（配信 / use-case の責務。ドメインは `passwordHash` を不透明に保持）
- ログイン UI・セッション・ルート保護（後続の配信スライス）
- Drizzle 永続化（後続）
- マルチテナント / 動的なロール定義
- メール検証フォーマットの厳密化（非空のみ。詳細検証は配信境界）

## 受け入れ基準

<!-- 機械検証できる文にする。 -->

- [ ] `packages/iam/package.json` の name が `@koma/iam`、`grep -E '"(next|react|drizzle-orm|zod)"' packages/iam/package.json` が 0 件、`@koma/shared` に依存
- [ ] `pnpm -F @koma/iam run check-types` が成功する
- [ ] `can`: `owner` が全 Permission で `true`／`staff` が `manage-users` / `manage-settings` で `false` かつ `manage-customers` 等で `true`、を真理値表でテストに固定する
- [ ] `User`: `email` 空で構築不可、`passwordHash` / `role` を保持、immutable（更新は新インスタンス）、をテストで固定する
- [ ] `UserRepository`: `findByEmail` で該当 `User`／未登録は `null`、`save` → `findById`、`list`、を in-memory でテストに固定する
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green

## architect 評価済みの設計判断

<!-- 採用案 + 却下案。 -->

- **パスワードのハッシュ化・検証は配信の責務、ドメインは `passwordHash` を不透明に保持**。却下: ドメインでハッシュ化（暗号ライブラリ依存がドメインに漏れる・テストが重くなる）。
- **認可は `can(role, permission)` 純関数 ＋ role → permission の単一マップ**。却下: 各所で `role === 'owner'` を直接 if 分岐（認可ルールが散らばり乖離する）。
- **`User` ≠ `Resource`**（ログイン identity と予約資源は別集約・別コンテキスト）。スタッフが `User` と `Resource` の両方に対応しても別物。
- **`Role` は当面 enum（owner / staff）**。動的ロール定義は YAGNI。
- **`findByEmail` を port に置く**（ログインの主経路）。
- **adr: false** の理由: 確立済みドメインパッケージパターンの適用（認可モデルは本節で記録）。
