# Tasks: apps/web にサービス（メニュー）の一覧・登録 管理画面を追加する

## T-01: apps/web に @koma/catalog 依存を追加する

- [x] `apps/web/package.json` の `dependencies` に `"@koma/catalog": "workspace:*"` を追加する
- [x] `pnpm install` を実行してロックファイルを更新する
- [x] `drizzle-orm` が `apps/web/package.json` に含まれていないことを確認する

**Acceptance Criteria**:
- `apps/web/package.json` の `dependencies` に `"@koma/catalog": "workspace:*"` が存在する
- `grep -E '"drizzle-orm"' apps/web/package.json` が 0 件
- `pnpm install` がエラーなく完了する

## T-02: composition-root.ts に getServiceRepository を追加する

- [x] `apps/web/lib/composition-root.ts` に `import type { ServiceRepository } from '@koma/catalog'` と `import { createInMemoryServiceRepository } from '@koma/catalog'` を追加する
- [x] `globalForApp` の型拡張に `serviceRepository?: ServiceRepository` を追加する
- [x] `getCustomerRepository` / `getResourceRepository` と同じ `globalThis` lazy singleton パターンで `getServiceRepository()` 関数を実装・export する

**Acceptance Criteria**:
- `getServiceRepository()` を複数回呼んでも同一インスタンス（`===`）が返る
- 具象 `createInMemoryServiceRepository()` の呼び出しは `composition-root.ts` 内の 1 箇所のみ
- `pnpm -F web run check-types` が成功する

## T-03: parse-service-input.ts を作成する

- [x] `apps/web/lib/parse-service-input.ts` を新規作成する
- [x] `ParseSuccess = { ok: true; service: Service }` / `ParseFailure = { ok: false; errors: Record<string, string[]> }` / `ParseServiceInputResult = ParseSuccess | ParseFailure` の型を定義する
- [x] `zod/v4/mini` で `serviceSchema` を定義する:
  - `name`: `z.string()` + `z.trim()` + `z.minLength(1, 'メニュー名は必須です')`
  - `durationMinutes`: `z.string()` — スキーマ段階では文字列として受け取る
  - `priceYen`: `z.string()` — スキーマ段階では文字列として受け取る
  - `resourceKinds`: `z.optional(z.string())` — カンマ区切り文字列
- [x] `parseServiceInput(raw: unknown): ParseServiceInputResult` 関数を実装する:
  1. `serviceSchema.safeParse(raw)` でバリデーション
  2. 失敗時: `parse-resource-input.ts` と同じフィールド別エラー集約ロジックで `{ ok: false, errors }` を返す
  3. 成功後、`durationMinutes` 文字列を `Number()` で数値変換。`NaN` / `!Number.isInteger` / `< 1` の場合は `{ ok: false, errors: { durationMinutes: ['所要時間は 1 以上の整数を入力してください'] } }` を返す
  4. 成功後、`priceYen` 文字列を `Number()` で数値変換。`NaN` / `!Number.isInteger` / `< 0` の場合は `{ ok: false, errors: { priceYen: ['料金は 0 以上の整数を入力してください'] } }` を返す
  5. `resourceKinds` 文字列を `split(',')` + `map(s => s.trim())` + `filter(s => s.length > 0)` で `string[]` に変換。未指定・空文字は `[]`
  6. `ofMinutes(durationMinutes)` で `Duration` を生成、`createMoney(priceYen, 'JPY')` で `Money` を生成
  7. `createService({ name, duration, price, resourceKinds })` を `try/catch` で呼び出し、成功時は `{ ok: true, service }` を返す。catch 時は `{ ok: false, errors: { _form: [message] } }` を返す

**Acceptance Criteria**:
- `parseServiceInput({ name: "カット", durationMinutes: "60", priceYen: "5000", resourceKinds: "スタイリスト" })` → `{ ok: true, service }` で `service.duration.milliseconds === 3600000`、`service.price.amount === 5000`、`service.price.currency === "JPY"`、`service.resourceKinds` が `["スタイリスト"]`
- `parseServiceInput({ name: "無料相談", durationMinutes: "15", priceYen: "0", resourceKinds: "" })` → `{ ok: true, service }` で `service.price.amount === 0`、`service.resourceKinds` が `[]`
- `parseServiceInput({ name: "", ... })` → `{ ok: false }` で `errors.name` 存在
- `parseServiceInput({ ..., durationMinutes: "0" })` → `{ ok: false }` で `errors.durationMinutes` 存在
- `parseServiceInput({ ..., durationMinutes: "-1" })` → `{ ok: false }` で `errors.durationMinutes` 存在
- `parseServiceInput({ ..., durationMinutes: "30.5" })` → `{ ok: false }` で `errors.durationMinutes` 存在
- `parseServiceInput({ ..., priceYen: "-100" })` → `{ ok: false }` で `errors.priceYen` 存在
- `pnpm -F web run check-types` が成功する

## T-04: parse-service-input.test.ts を作成する

- [x] `apps/web/lib/parse-service-input.test.ts` を新規作成する
- [x] `parse-resource-input.test.ts` と同じ構造で以下のテストケースを記述する:
  - **有効入力**:
    - 全フィールド指定で `ok: true` と妥当な `Service` を返す（`name`, `duration`, `price`, `resourceKinds` が正しい）
    - `resourceKinds` 空文字で `ok: true` かつ `resourceKinds` が `[]` を返す
    - `resourceKinds` がカンマ区切りで複数種別に分割される（各要素 trim 済み）
    - `priceYen` が `"0"` で `ok: true`（無料メニュー）
    - 返された `Service` は `id` を持つ
    - 前後の空白が trim された `name` で `ok: true` を返す
  - **name バリデーション**:
    - `name` が空文字で `ok: false` かつ `errors.name` が存在
    - `name` がスペースのみで `ok: false` かつ `errors.name` が存在
  - **durationMinutes バリデーション**:
    - `durationMinutes` が `"0"` で `ok: false` かつ `errors.durationMinutes` が存在
    - `durationMinutes` が `"-30"` で `ok: false` かつ `errors.durationMinutes` が存在
    - `durationMinutes` が `"30.5"` で `ok: false` かつ `errors.durationMinutes` が存在
    - `durationMinutes` が `"abc"` で `ok: false` かつ `errors.durationMinutes` が存在
  - **priceYen バリデーション**:
    - `priceYen` が `"-100"` で `ok: false` かつ `errors.priceYen` が存在
    - `priceYen` が `"1000.5"` で `ok: false` かつ `errors.priceYen` が存在
    - `priceYen` が `"無料"` で `ok: false` かつ `errors.priceYen` が存在
  - **型ガード**:
    - `raw` が文字列で `ok: false` を返す
    - `raw` が `null` で `ok: false` を返す

**Acceptance Criteria**:
- `pnpm -F web run test` で全テストケースが green
- テストファイルが `apps/web/lib/parse-service-input.test.ts` に配置されている（sibling 配置）

## T-05: server action createServiceAction を作成する

- [x] `apps/web/app/services/actions.ts` を新規作成する
- [x] ファイル先頭に `'use server'` directive を記述する
- [x] `ActionState` 型を定義する（`createResourceAction` と同じ `{ ok: true } | { ok: false; errors: Record<string, string[]> }`）
- [x] `createServiceAction(_prevState: ActionState | null, formData: FormData): Promise<ActionState>` を実装する:
  1. `formData` から `name`, `durationMinutes`, `priceYen`, `resourceKinds` を取得
  2. `parseServiceInput(raw)` を呼び出す
  3. `result.ok === false` なら `{ ok: false, errors: result.errors }` を返す
  4. 成功時は `getServiceRepository().save(result.service)` → `revalidatePath('/services')` → `{ ok: true }` を返す

**Acceptance Criteria**:
- `actions.ts` の先頭に `'use server'` がある
- `createResourceAction` と同じシグネチャ（`_prevState`, `formData`）
- `pnpm -F web run check-types` が成功する

## T-06: actions.test.ts を作成する

- [x] `apps/web/app/services/actions.test.ts` を新規作成する
- [x] `resources/actions.test.ts` と同じ構造で以下のテストケースを記述する:
  - `vi.mock('next/cache', ...)` で `revalidatePath` をモック
  - `vi.mock('@/lib/composition-root', ...)` で `getServiceRepository` をモック（テスト毎に `createInMemoryServiceRepository` で新インスタンス生成）
  - **有効なフォーム送信で Service が保存される**: `FormData` に有効値 → `ok: true`、`repo.list()` に 1 件
  - **不正なフォーム送信でエラーが返り save が呼ばれない**: `name` 空 → `ok: false`、`repo.list()` が 0 件
  - **成功時に `revalidatePath('/services')` が呼ばれる**

**Acceptance Criteria**:
- `pnpm -F web run test` で全テストケースが green
- テストファイルが `apps/web/app/services/actions.test.ts` に配置されている（sibling 配置）

## T-07: service-form.tsx クライアントコンポーネントを作成する

- [x] `apps/web/app/services/service-form.tsx` を新規作成する
- [x] ファイル先頭に `'use client'` directive を記述する
- [x] `useActionState` で `createServiceAction` をバインドする（`resource-form.tsx` と同じパターン）
- [x] フォームフィールドを実装する:
  - `name`（テキスト入力、必須、ラベル「メニュー名（必須）」）
  - `durationMinutes`（数値入力、必須、ラベル「所要時間（分）（必須）」、`min="1"` `step="1"`）
  - `priceYen`（数値入力、必須、ラベル「料金（円）（必須）」、`min="0"` `step="1"`）
  - `resourceKinds`（テキスト入力、任意、ラベル「対応リソース種別（カンマ区切り）」）
- [x] 各フィールド下にフィールド別エラーメッセージを表示する（`resource-form.tsx` と同じパターン）
- [x] フォーム全体エラー（`errors._form`）を表示する
- [x] 成功時メッセージ「登録が完了しました。」を表示する
- [x] 送信ボタンの `isPending` 制御（「登録中...」/「登録」）

**Acceptance Criteria**:
- `'use client'` directive がファイル先頭にある
- `name`, `durationMinutes`, `priceYen`, `resourceKinds` の 4 フィールドが存在する
- `durationMinutes` の input は `type="number"` で `min="1"` `step="1"`
- `priceYen` の input は `type="number"` で `min="0"` `step="1"`
- フィールドごとのエラー表示が動作する
- `pnpm -F web run check-types` が成功する

## T-08: page.tsx サーバーコンポーネントを作成する

- [x] `apps/web/app/services/page.tsx` を新規作成する
- [x] `getServiceRepository` から `list()` を呼び出しサービス一覧を取得する
- [x] `@koma/shared` から `toMinutes` を import し、`Duration` → 分表示に使用する
- [x] `ServiceForm` コンポーネントを配置する
- [x] 一覧セクションを実装する:
  - サービスが 0 件の場合「サービスがありません。」を表示
  - サービスがある場合、テーブルで `メニュー名` / `所要時間` / `料金` / `対応リソース種別` カラムを表示
  - 所要時間は `toMinutes(service.duration)` + `分` で表示
  - 料金は `service.price.amount.toLocaleString('ja-JP')` + `円` で表示
  - `resourceKinds` は `join(', ')` で表示（空配列は空欄）
- [x] `resources/page.tsx` と同じ構造（`<main>` > `<h1>` + `<Form>` + `<section>` > `<h2>` + table）

**Acceptance Criteria**:
- `page.tsx` が server component である（`'use client'` がない）
- テーブルカラムは「メニュー名」「所要時間」「料金」「対応リソース種別」
- 0 件表示と一覧表示の両方が実装されている
- 所要時間が「{n}分」、料金が「{n,nnn}円」形式で表示される
- `pnpm -F web run check-types` が成功する

## T-09: ビルド・型チェック・テスト全体確認

- [x] `pnpm -r --if-present run check-types` が成功する
- [x] `pnpm -r --if-present run test` が成功する
- [x] `pnpm -r --if-present run build` が成功する

**Acceptance Criteria**:
- `pnpm -r --if-present run check-types && pnpm -r --if-present run test && pnpm -r --if-present run build` が green
