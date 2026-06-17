# Tasks: web-booking-status

## T-01: allowedTransitions 純関数とラベルヘルパの追加

- [x] `apps/web/lib/booking-transitions.ts` を新規作成
- [x] `allowedTransitions(status: BookingStatus): BookingStatus[]` を実装 — `ALLOWED_TRANSITIONS.get(status)` から `Array.from()` で配列を返す。該当なしは空配列
- [x] `transitionLabel(status: BookingStatus): string` を実装 — `confirmed` → `'確定'`、`cancelled` → `'キャンセル'`、`completed` → `'完了'`、`no-show` → `'来店なし'`、`pending` → `'保留'` を返す

**Acceptance Criteria**:
- `allowedTransitions('pending')` が `['confirmed', 'cancelled']` を返す
- `allowedTransitions('confirmed')` が `['cancelled', 'completed', 'no-show']` を返す
- `allowedTransitions('cancelled')` / `allowedTransitions('completed')` / `allowedTransitions('no-show')` が `[]` を返す
- `transitionLabel('confirmed')` が `'確定'` を返す（他のステータスも同様）

## T-02: allowedTransitions のユニットテスト

- [x] `apps/web/lib/booking-transitions.test.ts` を新規作成
- [x] `pending` → `[confirmed, cancelled]` をテスト
- [x] `confirmed` → `[cancelled, completed, no-show]` をテスト
- [x] 各 terminal（`cancelled`, `completed`, `no-show`）→ `[]` をテスト
- [x] `transitionLabel` の各ステータスの戻り値をテスト

**Acceptance Criteria**:
- `pnpm -F web run test -- booking-transitions` が全パス

## T-03: transitionBookingAction server action の追加

- [x] `apps/web/app/bookings/actions.ts` に `transitionBookingAction` を追加
- [x] シグネチャ: `(bookingId: string, toStatus: BookingStatus) => Promise<ActionState>`
- [x] `getBookingRepository().findById(bookingId as Id<'Booking'>)` で予約を取得。null なら `{ ok: false, errors: { _form: ['予約が見つかりません'] } }` を返す
- [x] `transitionBooking(booking, toStatus)` を呼ぶ。throw を catch して `{ ok: false, errors: { _form: [error.message or '不正な状態遷移です'] } }` を返す
- [x] 遷移成功なら `repo.save(updated)` → `revalidatePath('/bookings')` → `{ ok: true }` を返す

**Acceptance Criteria**:
- 許可遷移（`pending` → `confirmed`）で `{ ok: true }` が返り、repo に更新された予約が保存される
- 不正遷移（`pending` → `completed`）で `{ ok: false }` が返り、repo の予約は変更されない
- 存在しない ID で `{ ok: false }` が返る
- 成功時に `revalidatePath('/bookings')` が呼ばれる

## T-04: transitionBookingAction のユニットテスト

- [x] `apps/web/app/bookings/actions.test.ts` に `transitionBookingAction` のテストを追加
- [x] 既存テストの mock 構成（`vi.mock('next/cache')`, `vi.mock('@/lib/composition-root')`）を共有する
- [x] テストケース: 許可遷移（`pending` → `confirmed`）で status が更新され save される
- [x] テストケース: 不正遷移（`pending` → `completed`）でエラーが返り save されない（status が `pending` のまま）
- [x] テストケース: 存在しない bookingId でエラーが返る
- [x] テストケース: 成功時に `revalidatePath('/bookings')` が呼ばれる
- [x] テスト用の予約セットアップに `createBooking` + `repo.save` を使用し、`transitionBookingAction` に `booking.id` を渡す

**Acceptance Criteria**:
- `pnpm -F web run test -- actions` が全パス（既存テストを壊さない）

## T-05: BookingStatusActions client component の新規作成

- [x] `apps/web/app/bookings/booking-status-actions.tsx` を新規作成（`'use client'`）
- [x] props: `{ bookingId: string; status: BookingStatus }`
- [x] `allowedTransitions(status)` で遷移先を取得
- [x] 遷移先が空なら何も描画しない
- [x] 各遷移先に対しボタンを描画。ボタンテキストは `transitionLabel(toStatus)`
- [x] ボタンクリックで `transitionBookingAction(bookingId, toStatus)` を呼ぶ
- [x] 送信中は `disabled` にする（`useTransition` または `useState` で pending 管理）

**Acceptance Criteria**:
- `pending` な予約に対し「確定」「キャンセル」ボタンが描画される
- `cancelled` な予約に対しボタンが描画されない
- ボタンクリックで `transitionBookingAction` が呼ばれる

## T-06: 予約一覧テーブルに操作列を追加

- [x] `apps/web/app/bookings/page.tsx` の `<thead>` に「操作」列を追加
- [x] `<tbody>` の各行に `<BookingStatusActions bookingId={booking.id} status={booking.status} />` を追加
- [x] ステータス列の表示を `transitionLabel(booking.status)` で日本語化する

**Acceptance Criteria**:
- 予約一覧テーブルに「操作」列が表示される
- 各行に status に応じた操作ボタンが表示される
- terminal な予約の操作列にはボタンがない
- `pnpm -F web run build` が成功する

## T-07: 全体検証

- [x] `pnpm -r --if-present run check-types` が成功する
- [x] `pnpm -r --if-present run test` が成功する
- [x] `pnpm -r --if-present run build` が成功する

**Acceptance Criteria**:
- `pnpm -r --if-present run check-types && pnpm -r --if-present run test && pnpm -r --if-present run build` が green
