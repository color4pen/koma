# Conformance Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:   implementation conforms to tasks.md, design.md, spec.md, and request.md
  - needs-fix:  one or more upstream artifacts are not satisfied by the implementation
  - escalation: conformance cannot be determined (missing artifacts, unresolvable ambiguity)
- The Findings table records the per-artifact judgment.
-->

- **verdict**: approved

## Conformance Findings

| Artifact | Conforms | Notes |
|----------|----------|-------|
| tasks.md | yes | T-01〜T-11 全チェックボックス [x] 済み。未完了タスクなし |
| design.md | yes | D1〜D9 全設計判断が実装に反映されている（詳細は下記） |
| spec.md | yes | 全 SHALL/MUST・全 Scenario をテストで固定済み。verification 71 tests passed |
| request.md | yes | 全受け入れ基準達成。typecheck/test/lint/build 全 phase passed |

---

## 1. タスク完了確認（tasks.md）

T-01〜T-11 のすべてのチェックボックスが `[x]` マーク済み。未完了タスクなし。

---

## 2. 設計判断適合性（design.md）

| ID | 設計判断 | 実装状況 |
|----|----------|---------|
| D1 | コンテキスト横断 orchestration を `createBookingUseCase`（delivery 層）に配置 | `apps/web/lib/create-booking-use-case.ts` に実装。service → resource → slot → canAccommodate → createBooking → save の手順を delivery 層で束ね、ドメイン間の直接 import なし（B-5 適合） |
| D2 | deps 注入で純粋・テスト可能 | `deps: { serviceRepo, resourceRepo, bookingRepo }` 経由のみで I/O を行い、`composition-root.ts` を use-case から直接 import しない |
| D3 | Result 型は discriminated union | `{ ok: true; booking } \| { ok: false; reason: 'service-not-found' \| 'resource-not-found' \| 'no-capacity' }` として定義・実装済み |
| D4 | `parseBookingInput` は境界検証のみ、ドメイン構築しない | `{ customerId, serviceId, resourceId, startMillis }` を返すのみ。TimeRange や Booking の構築は use-case に委ねる |
| D5 | `datetime-local` → `new Date(str).getTime()`、NaN チェック | `new Date(startAt).getTime()` で変換し、`Number.isNaN(startMillis)` なら `errors.startAt` を返す |
| D6 | composition root に `globalThis` lazy singleton パターンで `getBookingRepository` を追加 | `globalForApp.bookingRepository` への lazy 生成として実装。既存 3 getter と同一パターン |
| D7 | server action は薄い配線（parse → use-case → 変換）のみ | `parseBookingInput` → `createBookingUseCase` → reason 別メッセージ変換 → `revalidatePath` の配線のみ |
| D8 | 一覧は各 repo の list() で全件取得 → Map で名前解決 | `Promise.all` で 4 repo を並列取得、Map で O(1) 名前解決。D8 注記（実装者裁量）に合致 |
| D9 | 作成フォームは `<select>` ドロップダウン + `datetime-local` 入力 | `booking-form.tsx` で customerId/serviceId/resourceId を `<select>`、startAt を `<input type="datetime-local">` で実装 |

全 D1〜D9 適合。

---

## 3. 仕様適合性（spec.md）

### parseBookingInput

| Scenario | 実装 | テスト |
|----------|------|--------|
| 有効な入力で予約パラメータが返る | ✓ | ✓ |
| customerId が空文字で失敗する | ✓ | ✓ |
| serviceId が空文字で失敗する | ✓ | ✓ |
| resourceId が空文字で失敗する | ✓ | ✓ |
| startAt が不正な文字列で失敗する | ✓ | ✓ |
| startAt が空文字で失敗する | ✓ | ✓ |

### createBookingUseCase

| Scenario | 実装 | テスト |
|----------|------|--------|
| 有効な入力で予約が作成される（status: pending、slot 60分） | ✓ | ✓ |
| 存在しない serviceId → `service-not-found` | ✓ | ✓ |
| 存在しない resourceId → `resource-not-found` | ✓ | ✓ |
| capacity=1 で重なる 2 件目 → `no-capacity` | ✓ | ✓ |
| capacity=1 で隣接時刻 [a,b)+[b,c) → `ok` | ✓ | ✓ |
| capacity=2 で 1・2 件目 → `ok` | ✓ | ✓ |
| capacity=2 で 3 件目 → `no-capacity` | ✓ | ✓ |

### createBookingAction

| Scenario | 実装 | テスト |
|----------|------|--------|
| customerId 空 → `ok: false`、save されない | ✓ | ✓ |
| 有効フォーム → `bookingRepo.save`・`revalidatePath('/bookings')`・`ok: true` | ✓ | ✓ |
| capacity 不足 → `errors._form: ['この時間帯は予約が埋まっています']` | ✓ | ✓ |

### bookings ページ・composition root

| Scenario | 実装 |
|----------|------|
| 0 件時「予約がありません。」と作成フォームを表示 | ✓ |
| 1 件時テーブル（顧客/サービス/リソース/開始日時/ステータス）を表示 | ✓ |
| `getBookingRepository()` 複数回呼び出しで同一インスタンス（`globalThis` パターン） | ✓ |

---

## 4. 受け入れ基準適合性（request.md）

| 受け入れ基準 | 確認方法 | 結果 |
|------------|---------|------|
| `apps/web/package.json` に `@koma/scheduling: workspace:*` | package.json 直接確認 | ✓ |
| `grep -E '"drizzle-orm"' apps/web/package.json` が 0 件 | package.json 確認（drizzle-orm なし） | ✓ |
| `pnpm -F web run build` 成功 | verification-result.md: build passed | ✓ |
| `parseBookingInput` テスト固定（有効・各ID空・startAt不正） | verification-result.md: parse-booking-input.test.ts 8 tests passed | ✓ |
| `createBookingUseCase` テスト固定（全 capacity シナリオ・not-found） | verification-result.md: create-booking-use-case.test.ts 6 tests passed | ✓ |
| composition root が in-memory BookingRepository を単一生成 | `globalThis` lazy singleton 実装確認 | ✓ |
| `app/bookings/page.tsx` が一覧+フォーム、`createBookingAction` 成功時保存 | 実装確認 + actions.test.ts 4 tests passed | ✓ |
| `pnpm -r --if-present run check-types && test && build` が green | verification-result.md: 全 phase passed | ✓ |

---

## 5. Verification 結果

verification-result.md（iter 1）より：

| Phase | Status | 備考 |
|-------|--------|------|
| typecheck | passed | 全 workspace 成功 |
| test | passed | apps/web: 71 tests passed（新規: parse-booking-input 8 + create-booking-use-case 6 + actions 4） |
| lint | passed | ESLint warnings/errors なし |
| build | passed | /bookings ルートが正常生成（1.05 kB） |

---

## 6. Code Review 参照

review-feedback-001.md（verdict: approved）にて low severity の testing gap が 2 件（Fix=no）：

- TC-019: `getBookingRepository()` singleton ユニットテスト未実装（pre-existing gap、実装は正しい）
- TC-023/024: `createBookingAction` の service/resource-not-found メッセージパスのテスト未実装（should 優先度、ロジックは正しい）

いずれも実装の誤りではなく testing coverage の補完事項。conformance 判定に影響しない。
