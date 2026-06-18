# Tasks: packages/iam — User 集約・Role・Permission（認可）と UserRepository

## T-01: パッケージスキャフォールド（package.json / tsconfig.json / eslint / vitest）

- [x] `packages/iam/package.json` を作成する。`name: "@koma/iam"`, `private: true`, `type: "module"`, `exports: { ".": "./src/index.ts" }`。scripts に `check-types`, `test`, `lint`。dependencies に `"@koma/shared": "workspace:*"`。devDependencies は crm と同一バージョン（`@eslint/js`, `eslint`, `typescript`, `typescript-eslint`, `vitest`）。`next` / `react` / `drizzle-orm` / `zod` を含めない
- [x] `packages/iam/tsconfig.json` を crm と同一内容で作成する（`target: ES2022`, `module: ES2022`, `moduleResolution: bundler`, `strict: true`, `noEmit: true`, `skipLibCheck: true`, `include: ["src"]`）
- [x] `packages/iam/eslint.config.js` を crm と同一内容で作成する
- [x] `packages/iam/vitest.config.ts` を crm と同一内容で作成する
- [x] `packages/iam/src/index.ts` を空の barrel ファイルとして作成する（後続タスクで export を追加）
- [x] ワークスペースルートで `pnpm install` を実行し、ワークスペースのリンクを確立する
- [x] `pnpm -F @koma/iam run check-types` が成功することを確認する

**Acceptance Criteria**:
- `packages/iam/package.json` の name が `@koma/iam`
- `grep -E '"(next|react|drizzle-orm|zod)"' packages/iam/package.json` が 0 件
- `@koma/shared` に `workspace:*` で依存している
- `pnpm -F @koma/iam run check-types` が成功する

## T-02: Role・Permission 型と can() 純関数

- [x] `packages/iam/src/role.ts` を作成する
- [x] `Permission` union literal 型を定義する: `'manage-customers' | 'manage-resources' | 'manage-services' | 'manage-bookings' | 'manage-users' | 'manage-settings'`
- [x] `ALL_PERMISSIONS` を `as const` 配列で定義し、`Permission` 型を配列から導出する（網羅性を型で保証）
- [x] `Role` union literal 型を定義する: `'owner' | 'staff'`
- [x] `ROLE_PERMISSIONS: Record<Role, readonly Permission[]>` 定数を定義する。`owner` は `ALL_PERMISSIONS`（全 Permission）。`staff` は `manage-users` と `manage-settings` を除く Permission
- [x] `can(role: Role, permission: Permission): boolean` 純関数を実装する。`ROLE_PERMISSIONS[role]` に `permission` が含まれるかを返す
- [x] `src/index.ts` から `Role`, `Permission`, `can`, `ALL_PERMISSIONS` を export する

**Acceptance Criteria**:
- `can('owner', p)` が全 Permission で `true`
- `can('staff', 'manage-users')` が `false`
- `can('staff', 'manage-settings')` が `false`
- `can('staff', 'manage-customers')` が `true`
- `can('staff', 'manage-resources')` が `true`
- `can('staff', 'manage-services')` が `true`
- `can('staff', 'manage-bookings')` が `true`
- `pnpm -F @koma/iam run check-types` が成功する

## T-03: Role・Permission のテスト

- [x] `packages/iam/src/role.test.ts` を作成する
- [x] owner が全 Permission で `can` が `true` を返すことを真理値表で固定するテストを書く（`ALL_PERMISSIONS` をイテレートして各 Permission を検証）
- [x] staff が `manage-users` / `manage-settings` で `can` が `false` を返すテストを書く
- [x] staff が `manage-customers` / `manage-resources` / `manage-services` / `manage-bookings` で `can` が `true` を返すテストを書く
- [x] `pnpm -F @koma/iam run test` が green

**Acceptance Criteria**:
- 真理値表テスト（owner × 全 Permission = true、staff × 業務系 = true、staff × 管理系 = false）が全て pass
- `pnpm -F @koma/iam run test` が green

## T-04: User 集約（createUser / updateUser）

- [x] `packages/iam/src/user.ts` を作成する
- [x] `User` 型を定義する: `{ readonly id: Id<'User'>; readonly email: string; readonly passwordHash: string; readonly role: Role }`
- [x] `createUser(params: { id?: Id<'User'>; email: string; passwordHash: string; role: Role }): User` を実装する。`email` が空文字または `.trim()` が空なら `throw Error`。`id` 省略時は `createId<'User'>()` で自動生成。`Object.freeze` で返す
- [x] `updateUser(user: User, patch: Partial<Pick<User, 'email' | 'passwordHash' | 'role'>>): User` を実装する。`createUser` を内部で呼び出して `id` を引き継ぐ（email の非空バリデーションも再適用される）
- [x] `src/index.ts` から `User`, `createUser`, `updateUser` を export する

**Acceptance Criteria**:
- `createUser` で `email: ''` を渡すと Error が throw される
- `createUser` で `email: '   '` を渡すと Error が throw される
- `createUser` で `passwordHash` / `role` が保持される
- `updateUser` が新インスタンスを返し、元の User は変更されない
- `updateUser` で `id` が保持される
- `User` オブジェクトが frozen である
- `pnpm -F @koma/iam run check-types` が成功する

## T-05: User 集約のテスト

- [x] `packages/iam/src/user.test.ts` を作成する
- [x] `createUser` で必須フィールドのみで構築できるテスト
- [x] `createUser` で `id` 省略時に自動生成されるテスト
- [x] `createUser` で `email` が空文字のとき Error が throw されるテスト
- [x] `createUser` で `email` が空白のみのとき Error が throw されるテスト
- [x] `createUser` で `passwordHash` / `role` が保持されるテスト
- [x] `createUser` で返される User が frozen であるテスト
- [x] `updateUser` で新インスタンスが返り、元が不変であるテスト
- [x] `updateUser` で `id` が保持されるテスト
- [x] `updateUser` で `email` を空文字に変更しようとすると Error が throw されるテスト
- [x] `pnpm -F @koma/iam run test` が green

**Acceptance Criteria**:
- 全テストケースが pass
- `pnpm -F @koma/iam run test` が green

## T-06: UserRepository port

- [x] `packages/iam/src/port/user-repository.ts` を作成する
- [x] `UserRepository` 型を定義する: `{ save(user: User): Promise<void>; findById(id: Id<'User'>): Promise<User | null>; findByEmail(email: string): Promise<User | null>; list(): Promise<User[]> }`
- [x] `src/index.ts` から `UserRepository` を type export する

**Acceptance Criteria**:
- `UserRepository` が `findById`, `findByEmail`, `save`, `list` の 4 メソッドを持つ
- `pnpm -F @koma/iam run check-types` が成功する

## T-07: InMemoryUserRepository 実装

- [x] `packages/iam/src/in-memory-user-repository.ts` を作成する
- [x] `createInMemoryUserRepository(): UserRepository` を実装する。内部に `Map<string, User>` を持つ
- [x] `save`: `store.set(user.id, user)` で upsert
- [x] `findById`: `store.get(id) ?? null`
- [x] `findByEmail`: `store.values()` をイテレートし、`email` が一致する User を返す（なければ `null`）
- [x] `list`: `[...store.values()]`
- [x] `src/index.ts` から `createInMemoryUserRepository` を export する

**Acceptance Criteria**:
- `createInMemoryUserRepository` が `UserRepository` 型を満たす
- `pnpm -F @koma/iam run check-types` が成功する

## T-08: InMemoryUserRepository のテスト

- [x] `packages/iam/src/in-memory-user-repository.test.ts` を作成する
- [x] `save` → `findById` で保存した User が取得できるテスト
- [x] 未保存 id で `findById` が `null` を返すテスト
- [x] `save` → `findByEmail` で保存した User が取得できるテスト
- [x] 未登録メールで `findByEmail` が `null` を返すテスト
- [x] `save` → `list` で全件返るテスト
- [x] 空の状態で `list` が空配列を返すテスト
- [x] 同一 id で `save` 2 回で upsert されるテスト
- [x] 複数 User を save し `list` が全件返すテスト
- [x] `pnpm -F @koma/iam run test` が green

**Acceptance Criteria**:
- 全テストケースが pass
- `pnpm -F @koma/iam run test` が green

## T-09: 最終検証（全体 green 確認）

- [x] `pnpm -F @koma/iam run check-types` が成功する
- [x] `pnpm -F @koma/iam run test` が成功する
- [x] `pnpm -F @koma/iam run lint` が成功する
- [x] `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green
- [x] `src/index.ts` から以下が export されていることを確認する: `Role`, `Permission`, `ALL_PERMISSIONS`, `can`, `User`, `createUser`, `updateUser`, `UserRepository`（type）, `createInMemoryUserRepository`

**Acceptance Criteria**:
- 受け入れ基準の全項目を満たす
- `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green
