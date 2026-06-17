# Tasks: web-customers — delivery 層の顧客一覧・登録管理画面

## T-01: 依存追加とプロジェクト設定

- [ ] `apps/web/package.json` の `dependencies` に以下を追加する:
  - `"@koma/crm": "workspace:*"`
  - `"zod": "^3.25.0"`（`zod/mini` サブパスを使用するため v3.25+ が必要。もし v4 系が利用可能ならそちらを使用。`pnpm add` で最新安定版を入れて `zod/mini` の import が解決することを確認する）
- [ ] `apps/web/package.json` の `devDependencies` に以下を追加する:
  - `"vitest": "^2.1.8"`（他パッケージと同一バージョン）
- [ ] `apps/web/package.json` の `scripts` に `"test": "vitest run"` を追加する
- [ ] `apps/web/next.config.ts` を更新する:
  - `transpilePackages: ['@koma/crm', '@koma/shared']` を追加する
  - `@koma/shared` は `@koma/crm` の推移的依存であり、webpack が `@koma/crm` ソース内の import を解決する際に必要
- [ ] `apps/web/vitest.config.ts` を新規作成する:
  - `test.include`: `['lib/**/*.test.ts', 'app/**/*.test.ts']`
  - `resolve.alias`: `{ '@': path.resolve(__dirname, '.') }`（tsconfig.json のパスエイリアスに合わせる）
- [ ] `pnpm install` を実行してワークスペースリンクを確立する
- [ ] `drizzle-orm` が `apps/web/package.json` に含まれていないことを確認する

**Acceptance Criteria**:
- `apps/web/package.json` の `dependencies` に `@koma/crm`（`workspace:*`）と `zod` が存在する
- `apps/web/package.json` の `devDependencies` に `vitest` が存在する
- `apps/web/package.json` の `scripts` に `"test": "vitest run"` が存在する
- `grep -E '"drizzle-orm"' apps/web/package.json` が 0 件
- `pnpm -F web run check-types` が成功する

## T-02: composition root

- [ ] `apps/web/lib/composition-root.ts` を新規作成する:
  - `@koma/crm` から `type CustomerRepository` と `createInMemoryCustomerRepository` を import する
  - `globalThis` にキャストした `globalForApp` オブジェクトに `customerRepository: CustomerRepository | undefined` を保持する
  - `getCustomerRepository(): CustomerRepository` 関数を export する:
    - `globalForApp.customerRepository` が未初期化なら `createInMemoryCustomerRepository()` で生成して代入する
    - 初期化済みならそのまま返す
  - 具象生成（`createInMemoryCustomerRepository`）はこの関数内の 1 箇所のみ
  - 戻り値型は port 型 `CustomerRepository`（具象型を外部に漏らさない）

**Acceptance Criteria**:
- `getCustomerRepository()` を複数回呼び出して同一参照が返ることをコードレビューで確認できる
- `createInMemoryCustomerRepository` の呼び出しがこのファイルの 1 箇所のみ
- `pnpm -F web run check-types` が成功する

## T-03: `parseCustomerInput` 純関数

- [ ] `apps/web/lib/parse-customer-input.ts` を新規作成する:
  - `zod/mini` から schema API を import する
  - `@koma/crm` から `createContactInfo`, `createCustomer`, `type Customer` を import する
  - 戻り値型を定義する:
    - `type ParseSuccess = { ok: true; customer: Customer }`
    - `type ParseFailure = { ok: false; errors: Record<string, string[]> }`
    - `type ParseCustomerInputResult = ParseSuccess | ParseFailure` を export する
  - `zod/mini` スキーマを定義する:
    - `name`: 文字列、trim 後に非空であることを検証する
    - `phone`: 任意の文字列（optional）
    - `email`: 任意の文字列（optional）
    - オブジェクトレベルの refinement: `phone` または `email` の少なくとも一方が非空文字列であることを検証する
  - `parseCustomerInput(raw: unknown): ParseCustomerInputResult` 関数を export する:
    - `safeParse(raw)` でスキーマ検証を行う
    - 失敗時: zod のイシュー配列をフィールド名別の `Record<string, string[]>` に変換して `{ ok: false, errors }` を返す。オブジェクトレベルのイシュー（path が空）は適切なキー（例: `_form` または `contact`）に割り当てる
    - 成功時: `createContactInfo({ phone, email })` → `createCustomer({ name, contact })` でドメイン Customer を構築する。ドメインファクトリが throw した場合は catch して `{ ok: false, errors: { _form: [message] } }` を返す
    - repo には一切触れない（純関数）

**Acceptance Criteria**:
- `parseCustomerInput({ name: "山田", phone: "090-1234-5678" })` が `{ ok: true, customer: Customer }` を返す
- `parseCustomerInput({ name: "", phone: "090-1234-5678" })` が `{ ok: false, errors: { name: [...] } }` を返す
- `parseCustomerInput({ name: "山田" })` が `{ ok: false, errors }` を返す（連絡先不足）
- `pnpm -F web run check-types` が成功する

## T-04: `parseCustomerInput` の vitest テスト

- [ ] `apps/web/lib/parse-customer-input.test.ts` を新規作成する:
  - `parseCustomerInput` を import する
  - **有効入力のテスト**:
    - 名前と電話のみで `ok: true` と妥当な Customer が返る（`customer.name` / `customer.contact.phone` / `customer.contact.email === null`）
    - 名前とメールのみで `ok: true` と妥当な Customer が返る
    - 名前・電話・メール全てで `ok: true` と妥当な Customer が返る
    - 返された Customer が `id` を持つことを検証する（`createCustomer` 経由で自動生成）
    - 返された Customer の `tags` が空配列、`notes` が空文字、`customFields` が空オブジェクトであることを検証する
  - **名前バリデーションのテスト**:
    - `name` が空文字の場合に `ok: false` かつ `errors.name` が存在する
    - `name` がスペースのみの場合に `ok: false` かつ `errors.name` が存在する
  - **連絡先バリデーションのテスト**:
    - `phone` も `email` も未指定の場合に `ok: false` かつ連絡先エラーが存在する
    - `phone` と `email` が両方空文字の場合に `ok: false` かつ連絡先エラーが存在する
  - **型ガードのテスト**:
    - `raw` が文字列（オブジェクトでない）の場合に `ok: false` を返す
    - `raw` が `null` の場合に `ok: false` を返す

**Acceptance Criteria**:
- `pnpm -F web run test` で全テストが pass
- 有効入力テストが 3 件以上存在する
- 名前バリデーションテストが 2 件以上存在する
- 連絡先バリデーションテストが 2 件以上存在する

## T-05: `createCustomerAction` server action

- [ ] `apps/web/app/customers/actions.ts` を新規作成する:
  - ファイル先頭に `'use server';` ディレクティブを記述する
  - `@/lib/parse-customer-input` から `parseCustomerInput` を import する
  - `@/lib/composition-root` から `getCustomerRepository` を import する
  - `next/cache` から `revalidatePath` を import する
  - action の状態型を定義する:
    - `type ActionState = { ok: true } | { ok: false; errors: Record<string, string[]> }`
    - export する（client component が参照するため）
  - `createCustomerAction(prevState: ActionState | null, formData: FormData): Promise<ActionState>` を export する:
    - `FormData` から `name` / `phone` / `email` を取得し、plain object に変換する
    - `parseCustomerInput(raw)` を呼ぶ
    - 失敗時: `{ ok: false, errors: result.errors }` を返す
    - 成功時: `getCustomerRepository().save(result.customer)` を `await` し、`revalidatePath('/customers')` を呼び、`{ ok: true }` を返す

**Acceptance Criteria**:
- ファイル先頭が `'use server';`
- `parseCustomerInput` を呼んでいる（検証ロジックを直書きしていない）
- `getCustomerRepository()` 経由で repo を取得している（具象生成していない）
- 成功時に `revalidatePath('/customers')` を呼んでいる
- `pnpm -F web run check-types` が成功する

## T-06: `CustomerForm` client component

- [ ] `apps/web/app/customers/customer-form.tsx` を新規作成する:
  - ファイル先頭に `'use client';` ディレクティブを記述する
  - `react` から `useActionState` を import する
  - `./actions` から `createCustomerAction` と `type ActionState` を import する
  - `CustomerForm` コンポーネントを default export する:
    - `useActionState(createCustomerAction, null)` で `[state, formAction, isPending]` を取得する
    - `<form action={formAction}>` で送信する
    - 入力フィールド: `name`（必須）、`phone`（任意）、`email`（任意）。各フィールドに `<label>` と `<input>` を配置する
    - エラー表示: `state` が `{ ok: false }` の場合、各フィールド名に対応する `errors[field]` を表示する。オブジェクトレベルエラー（`_form` / `contact`）も表示する
    - 送信ボタン: `isPending` 中は disabled にし、テキストを「登録中...」に変更する
    - 成功表示: `state` が `{ ok: true }` の場合、登録完了メッセージを表示する
  - スタイリングは最小限（素の HTML + インラインスタイルまたは style なし）

**Acceptance Criteria**:
- ファイル先頭が `'use client';`
- `useActionState` を使用している
- `name` / `phone` / `email` の入力フィールドが存在する
- フィールドエラーを表示する仕組みがある
- `pnpm -F web run check-types` が成功する

## T-07: `app/customers/page.tsx` 顧客一覧ページ

- [ ] `apps/web/app/customers/page.tsx` を新規作成する:
  - server component（`'use client'` を記述しない）
  - `@/lib/composition-root` から `getCustomerRepository` を import する
  - `./customer-form` から `CustomerForm` を import する
  - `export default async function CustomersPage()` として定義する:
    - `const repo = getCustomerRepository()` で repo を取得
    - `const customers = await repo.list()` で一覧を取得
    - ページ構成:
      - `<h1>` でページタイトル（例: 「顧客管理」）
      - `<CustomerForm />` で登録フォームを配置
      - 顧客一覧セクション:
        - `customers.length === 0` の場合は「顧客がありません」等の空状態メッセージ
        - 1 件以上の場合は `<table>` または `<ul>` で顧客を一覧表示する
        - 各顧客について `name`、`contact.phone`、`contact.email` を表示する
  - スタイリングは最小限（素の HTML）

**Acceptance Criteria**:
- `'use client'` が存在しない（server component）
- `getCustomerRepository()` 経由で repo を取得している
- `await repo.list()` で一覧を取得している
- `CustomerForm` を描画している
- 空状態と一覧表示の両方の分岐がある
- `pnpm -F web run check-types` が成功する

## T-08: 全体検証

- [ ] `pnpm -F web run check-types` が成功することを確認する
- [ ] `pnpm -F web run test` で全テストが pass することを確認する
- [ ] `pnpm -F web run build`（`next build`）が成功することを確認する
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test && pnpm -r --if-present run build` が green であることを確認する（他パッケージへの影響がない）
- [ ] `grep -E '"drizzle-orm"' apps/web/package.json` が 0 件であることを確認する
- [ ] `apps/web/package.json` に `@koma/crm` と `zod` が `dependencies` に、`vitest` が `devDependencies` に、`test` スクリプトが存在することを確認する
- [ ] composition root 内で `createInMemoryCustomerRepository` の呼び出しが 1 箇所のみであることを確認する

**Acceptance Criteria**:
- 全受け入れ基準が green:
  - `apps/web` の check-types / test / build が pass
  - monorepo 全体の check-types / test / build が green
  - 禁止依存（`drizzle-orm`）が 0 件
  - composition root の具象生成が 1 箇所
