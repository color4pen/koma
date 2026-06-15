# packages/scheduling を新設し、Booking 集約・BookingStatus 状態機械・capacity-aware 二重予約整合性を確立する

## Meta

- **type**: new-feature
- **slug**: scheduling
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 新しい port/adapter 追加、既存パターンと異なる設計選択、振る舞い/契約を変える修正、構造的リファクタリング → true。いずれにも該当しない → false -->

## 背景

core コンテキスト `scheduling` を確立する。`Booking` を「顧客 × サービス × リソース × 時間枠 × ステータス」の整合性境界として実装し、**BookingStatus 状態機械**（`docs/アーキテクチャ/dynamic-model.md`）と **capacity-aware 二重予約不変条件**（`domain-model.md`: 同一 Resource で任意の時刻に重なる active 予約数が `Resource.capacity` を超えない）を確立する。
crm / resource / catalog のドメインパッケージパターンを踏襲する。**空き枠計算（`availableSlots`）は Availability 依存のため別 request に分割**する。単一テナント。

## 現状コードの前提

- crm / resource / catalog が「ドメインパッケージ ＋ Repository port（`src/port/`）＋ in-memory 実装」パターンを確立済み。各 `package.json` は `@koma/shared` に `workspace:*` 依存、scripts `check-types` / `test` / `lint`。
- `@koma/shared` が `TimeRange` と `overlaps` / `contains` を `packages/shared/src/index.ts:23-27` から、`Id` を同 `:1` から export している。
- `docs/アーキテクチャ/domain-model.md`: `Booking` 集約は `customerId` / `serviceId` / `resourceId` / `slot: TimeRange` / `status: BookingStatus` / `customFields`。二重予約不変条件は capacity-aware。
- `docs/アーキテクチャ/dynamic-model.md`: BookingStatus は 5 値（`pending` / `confirmed` / `cancelled` / `completed` / `no-show`）、active = {`pending`, `confirmed`}、terminal = {`cancelled`, `completed`, `no-show`}。許可遷移: `pending → confirmed | cancelled`、`confirmed → cancelled | completed | no-show`、terminal は出口（遷移なし）。
- `packages/` は `catalog` / `crm` / `resource` / `shared` のみで、`packages/scheduling` は未作成。

## 要件

<!-- 最重量部: (1) 状態機械の許可遷移の強制 (2) capacity-aware の重なり数判定（純関数）。 -->

1. **packages/scheduling パッケージを新設する**。name `@koma/scheduling`、純粋 TS、`@koma/shared` に `workspace:*` 依存。`next` / `react` / `drizzle-orm` / `zod` を入れない（B-1〜B-4）。既存ドメインパッケージに倣い scripts `check-types` / `test` / `lint`。公開 API は `src/index.ts`。

2. **Booking 集約**。`id: Id<'Booking'>` / `customerId: Id<'Customer'>` / `serviceId: Id<'Service'>` / `resourceId: Id<'Resource'>` / `slot: TimeRange` / `status: BookingStatus` / `customFields`（拡張点）。immutable。

3. **BookingStatus 状態機械**。`BookingStatus` 型（5 値）＋ 許可遷移を**データ（遷移表）**で持つ。純関数 `transitionBooking(booking, to): Booking`（許可遷移なら status を変えた新 Booking を返す、不正遷移は throw）。`isActive(status)` / `isTerminal(status)` を提供。許可遷移は上記 dynamic-model.md の通り。

4. **capacity-aware 整合性（純関数）**。`canAccommodate(existingActive: Booking[], slot: TimeRange, capacity: number): boolean` — `slot` を加えたとき、**任意の時刻で重なる active 予約の数が `capacity` 以下**なら true。`capacity = 1` は「`slot` と重なる active 予約が無い」と等価。I/O を持たない。

5. **BookingRepository port（interface, `src/port/`）**。`save` / `findById` / `list` に加え、**`findActiveByResource(resourceId): Booking[]`**（capacity チェックの入力源 ＝ 同一 Resource の active な予約）。async。

6. **in-memory BookingRepository 実装**。

7. すべて vitest テストを伴う。`Booking` / `BookingStatus` / 遷移・判定関数 / `BookingRepository` / in-memory 実装を `src/index.ts` から export する。

## スコープ外

- **空き枠計算（`availableSlots`）** — Availability 依存のため別 request
- **予約ユースケース**（fetch → `canAccommodate` 判定 → save の**排他トランザクション**）— delivery / db の責務（domain は純粋判定のみ提供）
- `slot` の長さと `Service.duration` の一致検証 — scheduling は catalog を import しない（B-5）。Service 情報は delivery が渡す。delivery の責務
- 予約変更（reschedule）・キャンセル待ち（waitlist）
- 通知（`notification` がイベント購読、別）
- Drizzle 永続化（`packages/db` は後続）
- マルチテナント

## 受け入れ基準

<!-- 機械検証できる文にする。 -->

- [ ] `packages/scheduling/package.json` の name が `@koma/scheduling`、`grep -E '"(next|react|drizzle-orm|zod)"' packages/scheduling/package.json` が 0 件、`@koma/shared` に依存
- [ ] `pnpm -F @koma/scheduling run check-types` が成功する
- [ ] 状態遷移をテストで固定: `pending → confirmed` 可、`pending → completed` は throw、terminal（例 `cancelled`）からの遷移は throw、`isActive`/`isTerminal` の区分
- [ ] `canAccommodate` の真理値表をテストで固定: capacity=1 で重なる active があると false・隣接（`[a,b)`+`[b,c)`）は true、capacity=2 で 2 重なりまで true・3 重なりで false
- [ ] `BookingRepository` interface が `save` / `findById` / `list` / `findActiveByResource` を持ち、in-memory が `findActiveByResource` で active のみ・該当 resource のみ返すことをテストで固定する
- [ ] `Booking` は immutable（`transitionBooking` は新インスタンスを返し元を破壊しない）
- [ ] 各型に vitest テストがある
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green

## architect 評価済みの設計判断

<!-- 採用案 + 却下案。 -->

- **Booking は集約、状態変更は `transitionBooking` 経由のみ**（patch しない＝整合性境界）。BookingStatus 状態機械は**遷移表をデータ**で持ち関数が引く。却下: `status` を自由に set（不正遷移を許し状態機械が崩れる）。
- **capacity-aware 判定を純関数 `canAccommodate` に分離**（I/O なし＝判定の純粋性・テスト可能性）。Repository が active 予約を供給。**実際の排他（同時実行での二重予約防止）は delivery/db のトランザクション＋ DB 制約**で、domain は純粋判定のみ。却下: capacity チェックを repository/IO に埋め込む（テスト不能・判定が副作用に混ざる）。
- **`findActiveByResource` を port に置く**（capacity チェックの入力 ＝ 同一 resource の active 予約を意図明示で供給）。却下: `list` 全件から filter（意図が表れず、件数増で非効率）。
- **slot と Service.duration の一致は delivery の責務**。scheduling は catalog（`Service`）を import しない（B-5）。Service の所要時間は delivery が渡す。
- **空き枠計算は別 request**。Availability（resource）依存で、scheduling は resource を import しない（B-5）ため、open 窓は delivery が絶対 `TimeRange` に解決して渡す設計。本 request は予約整合性の core に集中する。
- **adr: true** の理由: core の状態機械と capacity-aware 二重予約整合性は、以降の予約フロー全体（予約・確定・キャンセル・空き枠）の前提になる構造決定であり記録する。
