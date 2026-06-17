# Design: packages/iam — User 集約・Role・Permission（認可）と UserRepository

## Context

generic コンテキスト `iam` のドメイン層を新設する。管理画面のスタッフ/オーナーのログイン identity（`User`）と、ロールに基づく認可（`Role` / `Permission`）を業種中立に持つ。`docs/アーキテクチャ/domain-model.md` の通り **`User`（ログイン identity）は `Resource`（予約資源）とは別概念**。

crm / resource / catalog / scheduling が確立済みの「ドメインパッケージ ＋ Repository port ＋ in-memory 実装」パターンを踏襲する。`@koma/shared` の `Id<Brand>` をそのまま利用し、純粋 TS パッケージとして構成する。

パスワードのハッシュ化・検証・ログイン UI・セッションはスコープ外（後続の配信スライス）。ドメインは `passwordHash` を不透明な文字列として保持するのみ。

## Goals / Non-Goals

**Goals**:

- `packages/iam` パッケージ（`@koma/iam`）を新設し、純粋 TS ドメインパッケージとして確立する
- `Role`（`'owner' | 'staff'`）と `Permission` 型を定義し、role → permission の単一マッピングを持つ
- `can(role, permission): boolean` 純関数で認可判定を提供する
- `User` 集約（`id` / `email` / `passwordHash` / `role`）を immutable に構築・更新する
- `UserRepository` port（`findById` / `findByEmail` / `save` / `list`）と in-memory 実装を提供する
- vitest テストで全公開 API の振る舞いを固定する

**Non-Goals**:

- パスワードのハッシュ化・検証（配信 / use-case の責務）
- ログイン UI・セッション・ルート保護
- Drizzle 永続化（後続で `packages/db` に実装）
- マルチテナント / 動的ロール定義
- メール検証フォーマットの厳密化（非空チェックのみ）

## Decisions

### D1: ファイル構成は crm パッケージを踏襲する

```
packages/iam/
├── package.json
├── tsconfig.json
├── eslint.config.js
├── vitest.config.ts
└── src/
    ├── index.ts
    ├── role.ts                         # Role, Permission, ROLE_PERMISSIONS, can()
    ├── role.test.ts
    ├── user.ts                         # User, createUser(), updateUser()
    ├── user.test.ts
    ├── port/
    │   └── user-repository.ts          # UserRepository interface
    ├── in-memory-user-repository.ts
    └── in-memory-user-repository.test.ts
```

**Rationale**: crm が確立したレイアウト（集約 `.ts` / `.test.ts` 隣接、`port/` にインターフェース、in-memory 実装はルート）をそのまま適用する。一貫性を優先し、iam 固有の構造は導入しない。

**Alternatives considered**: `authorization.ts` に Role・Permission・can を分離する案 → Role と Permission は密結合（role → permission マッピングが定義の核心）なので 1 ファイルに閉じるほうが凝集度が高い。

### D2: Role は TypeScript union literal、Permission も union literal

```ts
type Role = 'owner' | 'staff';
type Permission =
  | 'manage-customers'
  | 'manage-resources'
  | 'manage-services'
  | 'manage-bookings'
  | 'manage-users'
  | 'manage-settings';
```

**Rationale**: 当面 2 ロール・6 パーミッションで十分。union literal なら型安全かつ enum の余計なランタイムコードが不要。`as const` 配列から union を導出すれば、`can` のテストで全 Permission のイテレーションも可能。

**Alternatives considered**: TypeScript `enum` → ランタイムオブジェクトが生まれ純粋 TS パッケージの趣旨に合わない。`class Role` → YAGNI。

### D3: role → permission マッピングは `Record<Role, readonly Permission[]>` の定数

```ts
const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: ALL_PERMISSIONS,           // 全 Permission
  staff: [/* manage-users, manage-settings を除く */],
};
```

**Rationale**: 認可ルールの単一真実源。`can(role, permission)` はこのマップを参照するだけ。各所で `role === 'owner'` の分岐を書かせない。

### D4: User 集約は createUser / updateUser のファクトリ関数パターン

crm の `createCustomer` / `updateCustomer` と同一パターン。`Object.freeze` で immutable を保証する。

- `createUser`: `email` が空（空文字 / 空白のみ）なら `throw Error`
- `updateUser`: `id` を保持し、patch された新インスタンスを返す。`email` の変更も可能だが、同じ非空バリデーションを通す

**Rationale**: 確立済みパターンの一貫適用。`class` にしないことでシリアライズ・テストが軽量。

### D5: passwordHash はドメインでバリデーションしない

`passwordHash` は `string` として受け取り、保持するのみ。空文字チェックも行わない（ハッシュ生成は配信境界の責務であり、ドメインがハッシュの形式を知る必要はない）。

**Rationale**: 暗号ライブラリ依存をドメインに持ち込まない。テストが軽量に保てる。

### D6: UserRepository に findByEmail を追加

crm の `CustomerRepository`（`findById` / `save` / `list`）に加え、`findByEmail(email: string): Promise<User | null>` をポートに定義する。ログイン時の主経路であり、ドメインの port として正当。

**Rationale**: メールでのユーザー検索はログインの基本操作。adapter 側で効率的なインデックスを貼れるよう、port に明示する。

### D7: package.json の devDependencies は crm と同一

`@eslint/js`, `eslint`, `typescript`, `typescript-eslint`, `vitest` を同一バージョンで揃える。`next` / `react` / `drizzle-orm` / `zod` は含めない。

## Risks / Trade-offs

- **[Risk] Permission の拡張時にコンパイルエラーが広範囲に波及する** → union literal に追加すれば `ROLE_PERMISSIONS` の網羅性チェックが効くため、型システムが漏れを検出する。意図通りの動作。

- **[Risk] passwordHash を空文字で保持できる** → 意図的な設計判断（D5）。配信境界でバリデーションする。ドメインの責務外。

- **[Trade-off] Role が静的 union のため動的ロール追加不可** → YAGNI。当面 owner/staff で十分。動的ロールが必要になれば別 request で拡張する。

## Open Questions

なし。architect 評価済みの設計判断で全方針が確定している。
