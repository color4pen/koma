# Tasks: apps/web にリソースの一覧・登録 管理画面を追加する

## T-01: apps/web に @koma/resource 依存を追加する

- [ ] `apps/web/package.json` の `dependencies` に `"@koma/resource": "workspace:*"` を追加する
- [ ] `pnpm install` を実行してロックファイルを更新する
- [ ] `drizzle-orm` が `apps/web/package.json` に含まれていないことを確認する

**Acceptance Criteria**:
- `apps/web/package.json` の `dependencies` に `"@koma/resource": "workspace:*"` が存在する
- `grep -E '"drizzle-orm"' apps/web/package.json` が 0 件
- `pnpm install` がエラーなく完了する

## T-02: composition-root.ts に getResourceRepository を追加する

- [ ] `apps/web/lib/composition-root.ts` に `import type { ResourceRepository } from '@koma/resource'` と `import { createInMemoryResourceRepository } from '@koma/resource'` を追加する
- [ ] `globalForApp` の型拡張に `resourceRepository?: ResourceRepository` を追加する
- [ ] `getCustomerRepository` と同じ `globalThis` lazy singleton パターンで `getResourceRepository()` 関数を実装・export する

**Acceptance Criteria**:
- `getResourceRepository()` を複数回呼んでも同一インスタンス（`===`）が返る
- 具象 `createInMemoryResourceRepository()` の呼び出しは `composition-root.ts` 内の 1 箇所のみ
- `pnpm -F web run check-types` が成功する

## T-03: parse-resource-input.ts を作成する

- [ ] `apps/web/lib/parse-resource-input.ts` を新規作成する
- [ ] `ParseSuccess = { ok: true; resource: Resource }` / `ParseFailure = { ok: false; errors: Record<string, string[]> }` / `ParseResourceInputResult = ParseSuccess | ParseFailure` の型を定義する
- [ ] `zod/v4/mini` で `resourceSchema` を定義する:
  - `name`: `z.string()` + `z.trim()` + `z.minLength(1, '名前は必須です')`
  - `kind`: `z.string()` + `z.trim()` + `z.minLength(1, '種別は必須です')`
  - `capacity`: `z.optional(z.string())` — スキーマ段階では文字列として受け取る
- [ ] `parseResourceInput(raw: unknown): ParseResourceInputResult` 関数を実装する:
  1. `resourceSchema.safeParse(raw)` でバリデーション
  2. 失敗時: `parse-customer-input.ts` と同じフィールド別エラー集約ロジックで `{ ok: false, errors }` を返す
  3. 成功後、`capacity` 文字列を `Number()` で数値変換。`capacity` が未指定または空文字の場合は `undefined`（`createResource` のデフォルト 1 に委ねる）。変換結果が `NaN`、`Number.isInteger` で false（小数を含む）、または `< 1` の場合は `{ ok: false, errors: { capacity: [...] } }` を返す（例: `const n = Number(capStr); if (isNaN(n) || !Number.isInteger(n) || n < 1) { return error }`）
  4. `createResource({ name, kind, capacity })` を `try/catch` で呼び出し、成功時は `{ ok: true, resource }` を返す。catch 時は `{ ok: false, errors: { _form: [message] } }` を返す

**Acceptance Criteria**:
- `parseResourceInput({ name: "田中", kind: "スタイリスト", capacity: "3" })` → `{ ok: true, resource }` で `resource.capacity === 3`
- `parseResourceInput({ name: "個室A", kind: "個室" })` → `{ ok: true, resource }` で `resource.capacity === 1`（デフォルト）
- `parseResourceInput({ name: "", kind: "x", capacity: "1" })` → `{ ok: false }` で `errors.name` 存在
- `parseResourceInput({ name: "x", kind: "", capacity: "1" })` → `{ ok: false }` で `errors.kind` 存在
- `parseResourceInput({ name: "x", kind: "y", capacity: "0" })` → `{ ok: false }` で `errors.capacity` 存在
- `parseResourceInput({ name: "x", kind: "y", capacity: "-1" })` → `{ ok: false }` で `errors.capacity` 存在
- `parseResourceInput({ name: "x", kind: "y", capacity: "1.5" })` → `{ ok: false }` で `errors.capacity` 存在
- `pnpm -F web run check-types` が成功する

## T-04: parse-resource-input.test.ts を作成する

- [ ] `apps/web/lib/parse-resource-input.test.ts` を新規作成する
- [ ] `parse-customer-input.test.ts` と同じ構造で以下のテストケースを記述する:
  - **有効入力**:
    - 全フィールド指定で `ok: true` と妥当な `Resource` を返す（`name`, `kind`, `capacity` が正しい）
    - `capacity` 省略時にデフォルト `1` で `ok: true` を返す
    - `capacity` が `"1"` で正常に数値変換される
    - 返された `Resource` は `id` を持つ
    - 前後の空白が trim された `name` で `ok: true` を返す
  - **name バリデーション**:
    - `name` が空文字で `ok: false` かつ `errors.name` が存在
    - `name` がスペースのみで `ok: false` かつ `errors.name` が存在
  - **kind バリデーション**:
    - `kind` が空文字で `ok: false` かつ `errors.kind` が存在
  - **capacity バリデーション**:
    - `capacity` が `"0"` で `ok: false` かつ `errors.capacity` が存在
    - `capacity` が `"-1"` で `ok: false` かつ `errors.capacity` が存在
    - `capacity` が `"1.5"` で `ok: false` かつ `errors.capacity` が存在
    - `capacity` が `"abc"` で `ok: false` かつ `errors.capacity` が存在
  - **型ガード**:
    - `raw` が文字列で `ok: false` を返す
    - `raw` が `null` で `ok: false` を返す

**Acceptance Criteria**:
- `pnpm -F web run test` で全テストケースが green
- テストファイルが `apps/web/lib/parse-resource-input.test.ts` に配置されている（sibling 配置）

## T-05: server action createResourceAction を作成する

- [ ] `apps/web/app/resources/actions.ts` を新規作成する
- [ ] ファイル先頭に `'use server'` directive を記述する
- [ ] `ActionState` 型を定義する（`createCustomerAction` と同じ `{ ok: true } | { ok: false; errors: Record<string, string[]> }`）
- [ ] `createResourceAction(_prevState: ActionState | null, formData: FormData): Promise<ActionState>` を実装する:
  1. `formData` から `name`, `kind`, `capacity` を取得
  2. `parseResourceInput(raw)` を呼び出す
  3. `result.ok === false` なら `{ ok: false, errors: result.errors }` を返す
  4. 成功時は `getResourceRepository().save(result.resource)` → `revalidatePath('/resources')` → `{ ok: true }` を返す

**Acceptance Criteria**:
- `actions.ts` の先頭に `'use server'` がある
- `createCustomerAction` と同じシグネチャ（`_prevState`, `formData`）
- `pnpm -F web run check-types` が成功する

## T-06: resource-form.tsx クライアントコンポーネントを作成する

- [ ] `apps/web/app/resources/resource-form.tsx` を新規作成する
- [ ] ファイル先頭に `'use client'` directive を記述する
- [ ] `useActionState` で `createResourceAction` をバインドする（`customer-form.tsx` と同じパターン）
- [ ] フォームフィールドを実装する:
  - `name`（テキスト入力、必須、ラベル「名前（必須）」）
  - `kind`（テキスト入力、必須、ラベル「種別（必須）」）
  - `capacity`（数値入力、ラベル「同時受付数」、`min="1"` `step="1"` `defaultValue="1"`）
- [ ] 各フィールド下にフィールド別エラーメッセージを表示する（`customer-form.tsx` と同じパターン）
- [ ] フォーム全体エラー（`errors._form`）を表示する
- [ ] 成功時メッセージ「登録が完了しました。」を表示する
- [ ] 送信ボタンの `isPending` 制御（「登録中...」/「登録」）

**Acceptance Criteria**:
- `'use client'` directive がファイル先頭にある
- `name`, `kind`, `capacity` の 3 フィールドが存在する
- `capacity` の input は `type="number"` で `min="1"` `step="1"` `defaultValue="1"`
- フィールドごとのエラー表示が動作する
- `pnpm -F web run check-types` が成功する

## T-07: page.tsx サーバーコンポーネントを作成する

- [ ] `apps/web/app/resources/page.tsx` を新規作成する
- [ ] `getResourceRepository` から `list()` を呼び出しリソース一覧を取得する
- [ ] `ResourceForm` コンポーネントを配置する
- [ ] 一覧セクションを実装する:
  - リソースが 0 件の場合「リソースがありません。」を表示
  - リソースがある場合、テーブルで `名前` / `種別` / `同時受付数` カラムを表示
- [ ] `customer/page.tsx` と同じ構造（`<main>` > `<h1>` + `<Form>` + `<section>` > `<h2>` + table）

**Acceptance Criteria**:
- `page.tsx` が server component である（`'use client'` がない）
- テーブルカラムは「名前」「種別」「同時受付数」
- 0 件表示と一覧表示の両方が実装されている
- `pnpm -F web run check-types` が成功する

## T-08: ビルド・型チェック・テスト全体確認

- [ ] `pnpm -r --if-present run check-types` が成功する
- [ ] `pnpm -r --if-present run test` が成功する
- [ ] `pnpm -r --if-present run build` が成功する

**Acceptance Criteria**:
- `pnpm -r --if-present run check-types && pnpm -r --if-present run test && pnpm -r --if-present run build` が green
