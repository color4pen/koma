# apps/web に予約作成フローを追加する（capacity-aware 二重予約防止・コンテキスト横断 use-case）

## Meta

- **type**: new-feature
- **slug**: web-booking
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 新しい port/adapter 追加、既存パターンと異なる設計選択、振る舞い/契約を変える修正、構造的リファクタリング → true。いずれにも該当しない → false -->

## 背景

看板機能。**顧客 × サービス × リソース × 時刻**から予約を作る画面を追加する。所要時間は `Service` から、`capacity` は `Resource` から取り、scheduling の `canAccommodate` で **capacity-aware 二重予約を防ぐ**。
**コンテキストを跨ぐ orchestration は delivery 層（application use-case）の責務**（ドメインは互いを import しない＝`docs/アーキテクチャ/model.md` B-5）。本スライスは設計の payoff（純粋ドメイン ＋ 横断は delivery）を最も可視化する。空き枠表示（`availableSlots`）は `Availability` UI 依存のため別スライス。

## 現状コードの前提

- web-{customers,resources,services} が delivery パターンを確立済み。`apps/web/lib/composition-root.ts` に `getCustomerRepository` / `getResourceRepository` / `getServiceRepository`。`apps/web` は `@koma/crm` / `@koma/resource` / `@koma/catalog` / `zod` に依存済み。
- `@koma/scheduling` が `createBooking` / `canAccommodate` / `BookingRepository`（port）/ `createInMemoryBookingRepository` を export。`@koma/shared` が `createTimeRange` を export。
- `createBooking` は `pending` 開始で `{ customerId, serviceId, resourceId, slot: TimeRange }` から Booking を作る。`canAccommodate(existingActive, slot, capacity)`。`BookingRepository.findActiveByResource(resourceId)` は対象 Resource の active 予約を返す。`Service` は `duration: Duration`、`Resource` は `capacity: number`。
- `apps/web` は `@koma/scheduling` 未依存。`composition-root.ts` に `getBookingRepository` は無い。

## 要件

<!-- 最重量部: コンテキスト横断 use-case（service/resource/booking repo を束ねる）と canAccommodate による二重予約防止。 -->

1. **依存追加**。`apps/web` に `@koma/scheduling`（`workspace:*`）を dependencies に追加する。`drizzle-orm` は入れない。

2. **composition root 拡張**。`getBookingRepository()` を追加（in-memory `BookingRepository` を単一 lazy 生成、既存と同じ `globalThis` パターン）。

3. **`parseBookingInput(raw)`（純関数）** を `apps/web/lib/parse-booking-input.ts` に追加。`zod/v4/mini` で `customerId` / `serviceId` / `resourceId`（非空）・`startAt`（`datetime-local` 文字列 → epoch ミリ秒に変換、不正は error）を検証し `{ customerId, serviceId, resourceId, startMillis }` を返す（ドメイン構築は use-case に委ねる）。

4. **`createBookingUseCase(deps, input)`（コンテキスト横断 use-case）** を `apps/web/lib/create-booking-use-case.ts` に追加。`deps`（`serviceRepo` / `resourceRepo` / `bookingRepo`）と `input` を受け、次を行う純粋オーケストレーション（I/O は repo 越し）:
   - (a) `serviceRepo.findById(serviceId)` — 無ければ `{ ok: false, reason: 'service-not-found' }`。`duration` を得る。
   - (b) `resourceRepo.findById(resourceId)` — 無ければ `{ ok: false, reason: 'resource-not-found' }`。`capacity` を得る。
   - (c) `slot = createTimeRange(startMillis, startMillis + duration.milliseconds)`。
   - (d) `active = bookingRepo.findActiveByResource(resourceId)`。
   - (e) `canAccommodate(active, slot, capacity)` が false なら `{ ok: false, reason: 'no-capacity' }`。
   - (f) `createBooking({ customerId, serviceId, resourceId, slot })` → `bookingRepo.save` → `{ ok: true, booking }`。

5. **server action** `createBookingAction`（`'use server'`）。`parseBookingInput` → 失敗ならフィールドエラー、成功なら composition root の repo を `deps` に `createBookingUseCase` を呼び、結果（容量不足は分かりやすいメッセージ）を返す。`revalidatePath('/bookings')`。

6. **ページ** `app/bookings/page.tsx`（server component）。予約一覧（customer / service / resource 名を各 repo から解決して表示）＋ 作成フォーム（customer / service / resource を各 repo の `list()` でドロップダウン化、`datetime-local` 入力）。`booking-form.tsx` client component。

7. **vitest テスト**: `parseBookingInput`（有効 → ok、各 id 空 → error、`startAt` 不正 → error）＋ **`createBookingUseCase`**（in-memory repo で: **`capacity = 1` で同一 Resource・重なる時刻の 2 件目は `no-capacity` で拒否**／隣接時刻は ok／`capacity = 2` は 2 件 ok・3 件目 `no-capacity`／service・resource 不在は対応する not-found）。

## スコープ外

- 空き枠表示（`availableSlots`） — `Availability` UI 依存のため後続
- 予約の確定 / キャンセル等ステータス操作 UI（後続）
- タイムゾーンの厳密な扱い（`datetime-local` をサーバローカル時刻として単純変換で可。tz 厳密化は後続）
- Drizzle 永続化への配線・認証・検索

## 受け入れ基準

<!-- 機械検証できる文にする。 -->

- [ ] `apps/web/package.json` が `@koma/scheduling` に依存し、`grep -E '"drizzle-orm"' apps/web/package.json` が 0 件
- [ ] `pnpm -F web run build`（`next build`）が成功する
- [ ] `parseBookingInput`: 有効入力で `ok`、`customerId` / `serviceId` / `resourceId` のいずれか空で `ok: false`、`startAt` 不正で `ok: false`、をテストで固定する
- [ ] **`createBookingUseCase`**: `capacity = 1` で同一 Resource・重なる時刻の 2 件目が `reason: 'no-capacity'`／隣接時刻（`[a,b)`+`[b,c)`）は `ok`／`capacity = 2` で 2 件 ok・3 件目 `no-capacity`／不在 service・resource で各 not-found、を **in-memory repo** でテストに固定する
- [ ] composition root が in-memory `BookingRepository` を**単一**生成する
- [ ] `app/bookings/page.tsx` が予約一覧と作成フォーム（顧客/サービス/リソースのドロップダウン）を描画し、`createBookingAction` が成功時に予約を保存する
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test && pnpm -r --if-present run build` が green

## architect 評価済みの設計判断

<!-- 採用案 + 却下案。 -->

- **コンテキスト横断の orchestration は delivery（use-case）の責務**。ドメインは互いを import しない（B-5）ため、`Service` の `duration`・`Resource` の `capacity`・`Booking` の整合性を束ねるのは delivery 層。却下: scheduling に catalog / resource を import させて束ねる（B-5 違反）。
- **`createBookingUseCase` を純粋・テスト可能に**（repo を `deps` 注入、I/O は repo 越し）。看板の二重予約防止を**ユニットテストで固定**できる。却下: server action に orchestration を直書き（テスト不能）。
- **`canAccommodate` を delivery から呼び capacity-aware 判定**。`slot` は `service.duration` から導出。**実際の同時実行排他**は単一プロセス in-memory では顕在化しないが、Drizzle 配線時に DB トランザクション / 一意制約で担保する（本スライスは判定ロジックの確立）。
- **二段防御**: `parseBookingInput`（境界）＋ ドメイン factory / 不変条件（`createTimeRange` の `start < end`、`createBooking`）。
- **adr: true** の理由: 最初のコンテキスト横断 application use-case（予約作成）の orchestration パターンを delivery 層に確立する構造決定であり、以降の横断機能が踏襲するため記録する。
