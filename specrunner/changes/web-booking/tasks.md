# Tasks: apps/web に予約作成フローを追加する（capacity-aware 二重予約防止・コンテキスト横断 use-case）

## T-01: apps/web に @koma/scheduling 依存を追加する

- [x] `apps/web/package.json` の `dependencies` に `"@koma/scheduling": "workspace:*"` を追加する
- [x] `pnpm install` を実行してロックファイルを更新する
- [x] `drizzle-orm` が `apps/web/package.json` に含まれていないことを確認する

**Acceptance Criteria**:
- `apps/web/package.json` の `dependencies` に `"@koma/scheduling": "workspace:*"` が存在する
- `grep -E '"drizzle-orm"' apps/web/package.json` が 0 件
- `pnpm install` がエラーなく完了する

## T-02: composition-root.ts に getBookingRepository を追加する

- [x] `apps/web/lib/composition-root.ts` に `import type { BookingRepository } from '@koma/scheduling'` と `import { createInMemoryBookingRepository } from '@koma/scheduling'` を追加する
- [x] `globalForApp` の型拡張に `bookingRepository?: BookingRepository` を追加する
- [x] `getCustomerRepository` / `getResourceRepository` / `getServiceRepository` と同じ `globalThis` lazy singleton パターンで `getBookingRepository()` 関数を実装・export する

**Acceptance Criteria**:
- `getBookingRepository()` を複数回呼んでも同一インスタンス（`===`）が返る
- 具象 `createInMemoryBookingRepository()` の呼び出しは `composition-root.ts` 内の 1 箇所のみ
- `pnpm -F web run check-types` が成功する

## T-03: parse-booking-input.ts を作成する

- [x] `apps/web/lib/parse-booking-input.ts` を新規作成する
- [x] `ParseBookingInputSuccess = { ok: true; input: { customerId: string; serviceId: string; resourceId: string; startMillis: number } }` / `ParseBookingInputFailure = { ok: false; errors: Record<string, string[]> }` / `ParseBookingInputResult = ParseBookingInputSuccess | ParseBookingInputFailure` の型を定義・export する
- [x] `zod/v4/mini` で `bookingInputSchema` を定義する:
  - `customerId`: `z.string()` + `z.minLength(1, '顧客を選択してください')`
  - `serviceId`: `z.string()` + `z.minLength(1, 'サービスを選択してください')`
  - `resourceId`: `z.string()` + `z.minLength(1, 'リソースを選択してください')`
  - `startAt`: `z.string()` + `z.minLength(1, '開始日時を入力してください')`
- [x] `parseBookingInput(raw: unknown): ParseBookingInputResult` 関数を実装・export する:
  1. `bookingInputSchema.safeParse(raw)` でバリデーション
  2. 失敗時: 既存の parse 関数と同じフィールド別エラー集約ロジックで `{ ok: false, errors }` を返す
  3. 成功後、`startAt` を `new Date(startAt).getTime()` で epoch ミリ秒に変換。`Number.isNaN(startMillis)` の場合は `{ ok: false, errors: { startAt: ['有効な日時を入力してください'] } }` を返す
  4. `{ ok: true, input: { customerId, serviceId, resourceId, startMillis } }` を返す

**Acceptance Criteria**:
- `parseBookingInput({ customerId: "c1", serviceId: "s1", resourceId: "r1", startAt: "2026-07-01T10:00" })` → `{ ok: true, input }` で `input.startMillis` が `new Date("2026-07-01T10:00").getTime()` と等しい
- 各 ID が空文字で `ok: false` かつ対応する `errors` キーが存在する
- `startAt` が `"not-a-date"` で `ok: false` かつ `errors.startAt` が存在する
- `startAt` が空文字で `ok: false` かつ `errors.startAt` が存在する
- `pnpm -F web run check-types` が成功する

## T-04: parse-booking-input.test.ts を作成する

- [x] `apps/web/lib/parse-booking-input.test.ts` を新規作成する
- [x] 以下のテストケースを記述する:
  - **有効入力**:
    - 全フィールド有効で `ok: true` かつ `input.customerId` / `input.serviceId` / `input.resourceId` / `input.startMillis` が正しい
  - **customerId バリデーション**:
    - `customerId` が空文字で `ok: false` かつ `errors.customerId` が存在
  - **serviceId バリデーション**:
    - `serviceId` が空文字で `ok: false` かつ `errors.serviceId` が存在
  - **resourceId バリデーション**:
    - `resourceId` が空文字で `ok: false` かつ `errors.resourceId` が存在
  - **startAt バリデーション**:
    - `startAt` が空文字で `ok: false` かつ `errors.startAt` が存在
    - `startAt` が `"not-a-date"` で `ok: false` かつ `errors.startAt` が存在
    - `startAt` が `"abc"` で `ok: false` かつ `errors.startAt` が存在
  - **型ガード**:
    - `raw` が `null` で `ok: false` を返す

**Acceptance Criteria**:
- `pnpm -F web run test` で全テストケースが green
- テストファイルが `apps/web/lib/parse-booking-input.test.ts` に配置されている（sibling 配置）

## T-05: create-booking-use-case.ts を作成する

- [x] `apps/web/lib/create-booking-use-case.ts` を新規作成する
- [x] `CreateBookingDeps` 型を定義する: `{ serviceRepo: ServiceRepository; resourceRepo: ResourceRepository; bookingRepo: BookingRepository }`（各型は `@koma/catalog` / `@koma/resource` / `@koma/scheduling` から import）
- [x] `CreateBookingInput` 型を定義する: `{ customerId: Id<'Customer'>; serviceId: Id<'Service'>; resourceId: Id<'Resource'>; startMillis: number }`
- [x] `CreateBookingResult` 型を定義する: `{ ok: true; booking: Booking } | { ok: false; reason: 'service-not-found' | 'resource-not-found' | 'no-capacity' }`
- [x] `createBookingUseCase(deps: CreateBookingDeps, input: CreateBookingInput): Promise<CreateBookingResult>` を実装・export する:
  1. `deps.serviceRepo.findById(input.serviceId)` — `null` なら `{ ok: false, reason: 'service-not-found' }` を返す。`service.duration` を取得する
  2. `deps.resourceRepo.findById(input.resourceId)` — `null` なら `{ ok: false, reason: 'resource-not-found' }` を返す。`resource.capacity` を取得する
  3. `createTimeRange(input.startMillis, input.startMillis + service.duration.milliseconds)` で `slot` を構築する（`@koma/shared` から import）
  4. `deps.bookingRepo.findActiveByResource(input.resourceId)` で active 予約一覧を取得する
  5. `canAccommodate(active, slot, resource.capacity)` が `false` なら `{ ok: false, reason: 'no-capacity' }` を返す（`@koma/scheduling` から import）
  6. `createBooking({ customerId: input.customerId, serviceId: input.serviceId, resourceId: input.resourceId, slot })` で `Booking` を作成する（`@koma/scheduling` から import）
  7. `deps.bookingRepo.save(booking)` で保存する
  8. `{ ok: true, booking }` を返す

**Acceptance Criteria**:
- `pnpm -F web run check-types` が成功する
- use-case は `deps` パラメータ経由で repo にアクセスし、`composition-root` を直接 import しない
- `canAccommodate` / `createBooking` / `createTimeRange` を正しく使用している

## T-06: create-booking-use-case.test.ts を作成する

- [x] `apps/web/lib/create-booking-use-case.test.ts` を新規作成する
- [x] テストの deps として `createInMemoryServiceRepository`（`@koma/catalog`）/ `createInMemoryResourceRepository`（`@koma/resource`）/ `createInMemoryBookingRepository`（`@koma/scheduling`）を使用する
- [x] テスト用ヘルパー: `createService`（`@koma/catalog`）で `duration: ofMinutes(60)` のサービスを、`createResource`（`@koma/resource`）で `capacity` 指定のリソースを、それぞれ作成して repo に save する
- [x] 以下のテストケースを記述する:
  - **正常系: 有効な入力で予約が作成される**
    - `capacity: 1` の Resource、60 分の Service を作成して repo に save
    - `createBookingUseCase` 呼び出し → `{ ok: true, booking }`
    - `booking.status` が `"pending"`
    - `booking.slot` の長さが 60 分相当（`end - start === 3600000`）
    - `bookingRepo.list()` に 1 件
  - **二重予約防止: capacity=1 で同一 Resource・重なる時刻の 2 件目は no-capacity**
    - `capacity: 1` の Resource に対し、10:00〜11:00 の予約を 1 件作成
    - 10:30〜11:30 の予約を作成 → `{ ok: false, reason: 'no-capacity' }`
  - **隣接時刻: capacity=1 で [a,b)+[b,c) は ok**
    - `capacity: 1` の Resource に対し、10:00〜11:00 の予約を 1 件作成
    - 11:00〜12:00 の予約を作成 → `{ ok: true, booking }`
  - **capacity=2 で 2 件 ok、3 件目は no-capacity**
    - `capacity: 2` の Resource に対し、同一時刻で 2 件作成 → 両方 `ok: true`
    - 3 件目を同一時刻で作成 → `{ ok: false, reason: 'no-capacity' }`
  - **service-not-found: 存在しない serviceId**
    - `serviceRepo` にサービスを save しない
    - `createBookingUseCase` 呼び出し → `{ ok: false, reason: 'service-not-found' }`
  - **resource-not-found: 存在しない resourceId**
    - `serviceRepo` にサービスを save するが `resourceRepo` にリソースを save しない
    - `createBookingUseCase` 呼び出し → `{ ok: false, reason: 'resource-not-found' }`

**Acceptance Criteria**:
- `pnpm -F web run test` で全テストケースが green
- テストは in-memory repo のみを使用し、モックを使用しない（use-case の純粋性を活用）
- テストファイルが `apps/web/lib/create-booking-use-case.test.ts` に配置されている（sibling 配置）

## T-07: server action createBookingAction を作成する

- [x] `apps/web/app/bookings/actions.ts` を新規作成する
- [x] ファイル先頭に `'use server'` directive を記述する
- [x] `ActionState` 型を定義する（既存 action と同じ `{ ok: true } | { ok: false; errors: Record<string, string[]> }`）
- [x] `createBookingAction(_prevState: ActionState | null, formData: FormData): Promise<ActionState>` を実装する:
  1. `formData` から `customerId`, `serviceId`, `resourceId`, `startAt` を取得し `raw` オブジェクトを構築
  2. `parseBookingInput(raw)` を呼び出す。`ok: false` なら `{ ok: false, errors: result.errors }` を返す
  3. `composition-root` から `getServiceRepository()` / `getResourceRepository()` / `getBookingRepository()` を取得し `deps` を構築
  4. `createBookingUseCase(deps, { customerId: result.input.customerId as Id<'Customer'>, serviceId: result.input.serviceId as Id<'Service'>, resourceId: result.input.resourceId as Id<'Resource'>, startMillis: result.input.startMillis })` を呼び出す
  5. `useCaseResult.ok === false` の場合、`reason` に応じたエラーメッセージを `errors._form` で返す:
     - `'service-not-found'` → `'指定されたサービスが見つかりません'`
     - `'resource-not-found'` → `'指定されたリソースが見つかりません'`
     - `'no-capacity'` → `'この時間帯は予約が埋まっています'`
  6. 成功時は `revalidatePath('/bookings')` → `{ ok: true }` を返す

**Acceptance Criteria**:
- `actions.ts` の先頭に `'use server'` がある
- 既存 action と同じシグネチャ（`_prevState`, `formData`）
- `pnpm -F web run check-types` が成功する

## T-08: actions.test.ts（bookings）を作成する

- [x] `apps/web/app/bookings/actions.test.ts` を新規作成する
- [x] 既存の `services/actions.test.ts` と同じ構造で以下を記述する:
  - `vi.mock('next/cache', ...)` で `revalidatePath` をモック
  - `vi.mock('@/lib/composition-root', ...)` で `getBookingRepository` / `getServiceRepository` / `getResourceRepository` をモック（テスト毎に in-memory repo を新インスタンス生成）
  - テスト前に Service / Resource を repo に save しておく
  - **有効なフォーム送信で予約が保存される**: `FormData` に有効値 → `ok: true`、`bookingRepo.list()` に 1 件
  - **不正なフォーム送信でエラーが返り save が呼ばれない**: `customerId` 空 → `ok: false`、`bookingRepo.list()` が 0 件
  - **capacity 不足でエラーメッセージが返る**: 同一 Resource に 2 件目の重なる予約 → `ok: false`、`errors._form` にメッセージ
  - **成功時に `revalidatePath('/bookings')` が呼ばれる**

**Acceptance Criteria**:
- `pnpm -F web run test` で全テストケースが green
- テストファイルが `apps/web/app/bookings/actions.test.ts` に配置されている（sibling 配置）

## T-09: booking-form.tsx クライアントコンポーネントを作成する

- [x] `apps/web/app/bookings/booking-form.tsx` を新規作成する
- [x] ファイル先頭に `'use client'` directive を記述する
- [x] Props として `customers: Array<{ id: string; name: string }>`, `services: Array<{ id: string; name: string }>`, `resources: Array<{ id: string; name: string }>` を受け取る
- [x] `useActionState` で `createBookingAction` をバインドする（既存 form と同じパターン）
- [x] フォームフィールドを実装する:
  - `customerId`（`<select>`、ラベル「顧客（必須）」、`customers` props から `<option>` を生成、先頭に空の選択肢）
  - `serviceId`（`<select>`、ラベル「サービス（必須）」、`services` props から `<option>` を生成、先頭に空の選択肢）
  - `resourceId`（`<select>`、ラベル「リソース（必須）」、`resources` props から `<option>` を生成、先頭に空の選択肢）
  - `startAt`（`<input type="datetime-local">`、ラベル「開始日時（必須）」、`required`）
- [x] 各フィールド下にフィールド別エラーメッセージを表示する（既存 form と同じパターン）
- [x] フォーム全体エラー（`errors._form`）を表示する
- [x] 成功時メッセージ「予約が完了しました。」を表示する
- [x] 送信ボタンの `isPending` 制御（「予約中...」/「予約する」）

**Acceptance Criteria**:
- `'use client'` directive がファイル先頭にある
- `customerId`, `serviceId`, `resourceId` が `<select>` で実装されている
- `startAt` が `<input type="datetime-local">` で実装されている
- フィールドごとのエラー表示が動作する
- `pnpm -F web run check-types` が成功する

## T-10: page.tsx サーバーコンポーネント（bookings）を作成する

- [x] `apps/web/app/bookings/page.tsx` を新規作成する
- [x] `getBookingRepository` / `getCustomerRepository` / `getServiceRepository` / `getResourceRepository` を `composition-root` から import する
- [x] server component として実装する（`'use client'` なし）
- [x] 予約一覧表示を実装する:
  - `bookingRepo.list()` で全予約を取得する
  - `customerRepo.list()` / `serviceRepo.list()` / `resourceRepo.list()` で全エンティティを取得し、`id → entity` の Map を構築する
  - 予約が 0 件の場合「予約がありません。」を表示する
  - 予約がある場合、テーブルで「顧客」「サービス」「リソース」「開始日時」「ステータス」カラムを表示する
  - 顧客名・サービス名・リソース名は Map から解決する（見つからない場合は「不明」等のフォールバック）
  - 開始日時は `new Date(booking.slot.start).toLocaleString('ja-JP')` で表示する
- [x] 作成フォーム用データを取得する:
  - `customerRepo.list()` / `serviceRepo.list()` / `resourceRepo.list()` の結果から `{ id, name }` の配列を作成し、`BookingForm` に props として渡す
- [x] `BookingForm` コンポーネントを配置する
- [x] ページ構造は `<main>` > `<h1>予約管理</h1>` + `<BookingForm>` + `<section>` > `<h2>予約一覧</h2>` + table（既存ページと同じ構造）

**Acceptance Criteria**:
- `page.tsx` が server component である（`'use client'` がない）
- テーブルカラムは「顧客」「サービス」「リソース」「開始日時」「ステータス」
- 0 件表示と一覧表示の両方が実装されている
- 顧客 / サービス / リソース名が各 repo から解決されている
- `BookingForm` に `customers` / `services` / `resources` の props が渡されている
- `pnpm -F web run check-types` が成功する

## T-11: ビルド・型チェック・テスト全体確認

- [x] `pnpm -r --if-present run check-types` が成功する
- [x] `pnpm -r --if-present run test` が成功する
- [x] `pnpm -r --if-present run build` が成功する

**Acceptance Criteria**:
- `pnpm -r --if-present run check-types && pnpm -r --if-present run test && pnpm -r --if-present run build` が green
