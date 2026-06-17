# Design: web-booking-status

## Context

予約一覧 (`apps/web/app/bookings/page.tsx`) は status 表示のみで操作手段がない。`@koma/scheduling` は `BookingStatus` 状態機械（`ALLOWED_TRANSITIONS` + `transitionBooking`）を既に備えており、配信層がこれを UI に露出すれば予約ライフサイクルが完成する。

現状の構成:

- **ドメイン**: `transitionBooking(booking, to)` は不正遷移で throw、許可なら新 `Booking` を返す。`ALLOWED_TRANSITIONS` は `Map<BookingStatus, ReadonlySet<BookingStatus>>`。
- **配信層**: `apps/web/app/bookings/actions.ts` に `createBookingAction`（server action）、`page.tsx` が server component、`booking-form.tsx` が client component。composition root で `getBookingRepository()` を取得。
- **テスト**: `actions.test.ts` が `vi.mock` で composition root を差し替え、in-memory repo でテスト。

## Goals / Non-Goals

**Goals**:

- 予約一覧の各行に現在ステータスを表示し、許可された遷移のみを操作ボタンとして提供する
- 遷移操作は `transitionBooking` 経由で構造的に不正遷移を防ぐ（二段防御）
- 遷移先の導出を純関数に分離し、ドメインの `ALLOWED_TRANSITIONS` を単一の真実源とする

**Non-Goals**:

- 予約の編集（時刻・リソース変更）・削除
- 状態遷移の履歴・監査ログ
- Drizzle 配線・認証
- 一覧の検索 / 絞り込み / ページネーション

## Decisions

### D1: 許可遷移の導出を純関数 `allowedTransitions` に分離する

`apps/web/lib/booking-transitions.ts` に `allowedTransitions(status): BookingStatus[]` を置く。`ALLOWED_TRANSITIONS` Map から現在状態の遷移先を配列として返す。同ファイルに `transitionLabel(status): string` ヘルパを置き、`BookingStatus` → 日本語表示ラベルの対応を返す。

- **Rationale**: `ALLOWED_TRANSITIONS` が唯一の真実源。UI がこの関数を通じて遷移先を得るため、状態機械との二重定義が生じない。
- **Alternative rejected**: UI コンポーネントに遷移可否を直書き — 状態機械の変更に追従できず乖離する。

### D2: server action `transitionBookingAction` を use-case 層なしで薄く実装する

`apps/web/app/bookings/actions.ts` に追加。`findById` → `transitionBooking` → `save` → `revalidatePath` の直線フロー。`transitionBooking` の throw を catch して `ActionState` エラーに変換する。

- **Rationale**: 単一集約の状態遷移操作であり、orchestration ロジックがない。`createBookingAction` は `createBookingUseCase` を持つが、それは `canAccommodate` という集約横断の検証があるため。遷移にはそれがないので use-case 層は不要。
- **Alternative rejected**: `transitionBookingUseCase` を別ファイルに切り出す — 現時点では over-engineering。集約横断の検証が増えた時点で抽出する。

### D3: 操作ボタンを client component `BookingStatusActions` に分離する

`apps/web/app/bookings/booking-status-actions.tsx` を新規作成。props として `bookingId` と `status` を受け、`allowedTransitions(status)` でボタンを生成。各ボタンは `transitionBookingAction` を呼ぶ。terminal 状態ではボタンなし（空配列）。

- **Rationale**: ボタンクリック → server action 呼び出しは client component の責務。server component の `page.tsx` はデータ取得と描画構造に集中する。
- **Alternative rejected**: page.tsx に form を inline 展開 — 状態操作の関心が一覧描画に混入する。

### D4: 二段防御（UI 制御 + ドメインガード）

UI は `allowedTransitions` で許可遷移のみボタン表示（UX 層の制御）。server action は `transitionBooking` 経由で遷移し、不正遷移はドメインが throw（構造ガード）。

- **Rationale**: UI 制御だけでは API 直叩き等で不正遷移が通りうる。ドメインの throw が最終防衛線。
- **Alternative rejected**: UI 制御のみに依存 — 防御が不完全。

### D5: `ActionState` 型を既存の型定義と共有する

既存の `ActionState` 型（`{ ok: true } | { ok: false; errors: Record<string, string[]> }`）を `transitionBookingAction` でも再利用する。

- **Rationale**: 同一ファイル内の action なので型統一が自然。エラーは `errors._form` に格納する（既存パターンと同じ）。

## Risks / Trade-offs

- **[Risk] `ALLOWED_TRANSITIONS` が `Map<..., ReadonlySet<...>>` で Set を返す** → `allowedTransitions` で `Array.from()` して配列に変換。順序は Set の挿入順で安定。
- **[Risk] 同時操作で楽観的 UI が不整合になる** → 現時点は in-memory repo で単一プロセス。将来 DB 配線時に楽観的ロック（version column）を検討。今回はスコープ外。
- **[Trade-off] ラベル定義が配信層にある** → ドメインは i18n に関知しないため配信層が適切。ラベル変更はドメインに影響しない。

## Open Questions

なし。確立済みパターンの適用であり、未解決の設計判断はない。
