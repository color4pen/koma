# apps/web の予約一覧にステータス操作（確定 / キャンセル / 完了 / 来店なし）を追加する

## Meta

- **type**: new-feature
- **slug**: web-booking-status
- **base-branch**: main
- **adr**: false

<!-- adr 判断基準: 新しい port/adapter 追加、既存パターンと異なる設計選択、振る舞い/契約を変える修正、構造的リファクタリング → true。いずれにも該当しない → false -->

## 背景

予約のライフサイクルを UI で完成させる。`scheduling` の **BookingStatus 状態機械**（`transitionBooking` ＋ `ALLOWED_TRANSITIONS`）を予約一覧に露出し、各予約に対し**現在の状態から許可された遷移のみ**を操作ボタンとして出す。不正な遷移は `transitionBooking` が throw して構造的に弾く。web-booking で確立した delivery パターンに乗せる。

## 現状コードの前提

- `apps/web/app/bookings/`（`actions.ts` / `page.tsx` / `booking-form.tsx`）で予約の一覧・作成が動く。composition root に `getBookingRepository`（in-memory）。
- `@koma/scheduling` が `transitionBooking(booking, to)`（不正遷移は throw、許可なら新 Booking を返す）/ `ALLOWED_TRANSITIONS`（`Map<BookingStatus, ReadonlySet<BookingStatus>>`）/ `isTerminal` / `BookingStatus`（`pending` / `confirmed` / `cancelled` / `completed` / `no-show`）を export している。
- 許可遷移: `pending → confirmed | cancelled`、`confirmed → cancelled | completed | no-show`、terminal は遷移なし。
- `BookingRepository` は `findById` / `save` を持つ。

## 要件

<!-- 最重量部: 現在状態から許可遷移を導出する純関数と、transitionBooking 経由の遷移 action。 -->

1. **`allowedTransitions(status): BookingStatus[]`（純関数）** を `apps/web/lib/booking-transitions.ts` に追加。`ALLOWED_TRANSITIONS` から現在状態の遷移先一覧を返す（terminal は空配列）。各遷移先に表示ラベル（確定 / キャンセル / 完了 / 来店なし）を対応づけるヘルパも置く。

2. **server action** `transitionBookingAction`（`'use server'`、`apps/web/app/bookings/actions.ts` に追加）。`bookingId` と `toStatus` を受け、`getBookingRepository().findById` → 無ければエラー、`transitionBooking(booking, toStatus)`（不正遷移は throw → catch して分かりやすいエラー）→ `save` → `revalidatePath('/bookings')`。

3. **予約一覧の拡張**。各予約に現在ステータスを表示し、`allowedTransitions(status)` から**許可された操作のみ**ボタンを出す（terminal は操作なし）。ボタンは `transitionBookingAction` を呼ぶ（`booking-status-actions.tsx` client component）。

4. **vitest テスト**: `allowedTransitions`（`pending` → `[confirmed, cancelled]`、`confirmed` → `[cancelled, completed, no-show]`、terminal → `[]`）＋ `transitionBookingAction`（許可遷移で status が更新され save される／不正遷移でエラー／不在 id でエラー、in-memory repo で固定）。

## スコープ外

- 予約の編集（時刻・リソース変更）・削除
- 状態遷移の履歴・監査ログ（`audit` は別コンテキスト）
- Drizzle 配線・認証
- 一覧の検索 / 絞り込み / ページネーション

## 受け入れ基準

<!-- 機械検証できる文にする。 -->

- [ ] `pnpm -F web run build`（`next build`）が成功する
- [ ] `allowedTransitions`: `pending` → `[confirmed, cancelled]`、`confirmed` → `[cancelled, completed, no-show]`、各 terminal → `[]`、をテストで固定する
- [ ] `transitionBookingAction`: 許可遷移（例 `pending → confirmed`）で予約の status が更新され `save` される／不正遷移（例 `pending → completed`）でエラーを返し save しない／不在 id でエラー、を in-memory repo でテストに固定する
- [ ] 予約一覧が各予約の status と**許可された操作のみ**のボタンを描画し、terminal な予約には操作ボタンが出ない
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test && pnpm -r --if-present run build` が green

## architect 評価済みの設計判断

<!-- 採用案 + 却下案。 -->

- **許可遷移の導出を純関数 `allowedTransitions` に分離**（`ALLOWED_TRANSITIONS` を単一の真実源として UI のボタン可視性を導く）。却下: UI に遷移可否を直書き（状態機械と二重定義になり乖離する）。
- **遷移は必ず `transitionBooking` 経由**（不正遷移はドメインが throw して弾く）。UI のボタン制御（許可遷移のみ表示）は UX、ドメインの `transitionBooking` が**最終的な構造ガード**＝二段防御。却下: UI 制御だけに頼る（API 直叩き等で不正遷移が通る）。
- **server action は薄く**（findById → transitionBooking → save）。orchestration ロジックは無く単一集約の操作なので use-case 層は設けない。
- **adr: false** の理由: 確立済み delivery パターンの適用＋既存状態機械の UI 露出であり、新パターン / 構造変更ではない。
