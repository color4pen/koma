# ADR-007: delivery 層へのコンテキスト横断 use-case 配置 — `createBookingUseCase` パターン

- **status**: accepted
- **date**: 2026-06-18
- **change**: web-booking
- **deciders**: architect, spec-runner

## Context

`@koma/scheduling` の確立（ADR-004）と delivery 層の初スライス（ADR-006）により、ドメインパッケージと delivery パターン（composition root / server action / zod/mini 境界検証）が揃った。

予約作成フローは koma 最初の「コンテキスト横断ユースケース」である。1 件の予約を作るには 3 つの独立したドメインコンテキストが必要になる。

- **`@koma/catalog`**: `Service.duration`（予約の時間幅の導出）
- **`@koma/resource`**: `Resource.capacity`（capacity-aware 二重予約防止）
- **`@koma/scheduling`**: `createBooking` / `canAccommodate` / `BookingRepository`

`docs/アーキテクチャ/model.md` B-5 はドメインコンテキスト間の直接 import を禁じており、3 コンテキストを束ねる役割は delivery 層（composition root）が担う必要がある。一方、ADR-006 が確立した server action は Next.js に密結合しており（`revalidatePath` / `FormData` 等）、その中に orchestration ロジックを直書きするとテスト不能になる。

本 change では、**delivery 層に専用の use-case 関数を切り出し、コンテキスト横断 orchestration をテスト可能な形で確立する**構造判断を行う。この判断は以降の横断機能（空き枠計算・キャンセルフロー等）が踏襲するテンプレートとなる。

## Decisions

### D1: コンテキスト横断の orchestration は delivery 層の use-case 関数に配置する

`apps/web/lib/create-booking-use-case.ts` に `createBookingUseCase(deps, input)` を配置する。ドメインパッケージは兄弟コンテキストを import しない（B-5）ため、この束ね役は delivery 層の application use-case が担う。

orchestration の手順：

1. `serviceRepo.findById(serviceId)` — 無ければ `{ ok: false, reason: 'service-not-found' }`、`duration` を得る
2. `resourceRepo.findById(resourceId)` — 無ければ `{ ok: false, reason: 'resource-not-found' }`、`capacity` を得る
3. `slot = createTimeRange(startMillis, startMillis + duration.milliseconds)`
4. `active = bookingRepo.findActiveByResource(resourceId)`
5. `canAccommodate(active, slot, capacity)` が false なら `{ ok: false, reason: 'no-capacity' }`
6. `createBooking(...)` → `bookingRepo.save` → `{ ok: true, booking }`

server action は `parseBookingInput` → `createBookingUseCase` → 結果を日本語メッセージに変換 → `revalidatePath` の薄い配線のみとする。

**採用理由**: B-5 を遵守しつつ 3 コンテキストを束ねられるのは delivery 層のみ。use-case を関数として独立させることで、server action の Next.js 結合（`revalidatePath` 等）から orchestration ロジックを切り離し、in-memory repo でユニットテストが書ける。

**却下案**:
- scheduling ドメインが catalog / resource を import して束ねる → B-5 違反
- server action 内に orchestration を直書きする → `FormData` / `revalidatePath` に混入しテスト不能

---

### D2: use-case は `deps` パラメータによる注入で純粋関数に保つ

`createBookingUseCase` は `{ serviceRepo: ServiceRepository; resourceRepo: ResourceRepository; bookingRepo: BookingRepository }` を `deps` として受け取る。I/O はすべて repo 越しに行い、副作用を関数本体に持たない。

```typescript
export async function createBookingUseCase(
  deps: {
    serviceRepo: ServiceRepository;
    resourceRepo: ResourceRepository;
    bookingRepo: BookingRepository;
  },
  input: { customerId: string; serviceId: string; resourceId: string; startMillis: number },
): Promise<CreateBookingResult>
```

**採用理由**: 看板の二重予約防止（capacity-aware）はビジネスの核心であり、ユニットテストで固定する必要がある。deps 注入により、composition root / テスト / 将来の Drizzle 永続化のいずれからも同一 use-case を呼べる。

**却下案**: composition root の getter を use-case 内部から直接呼ぶ → テスト時にモックが必要になり純粋性が失われる。

---

### D3: use-case の戻り値は discriminated union（Result 型）

```typescript
type CreateBookingResult =
  | { ok: true; booking: Booking }
  | { ok: false; reason: 'service-not-found' | 'resource-not-found' | 'no-capacity' };
```

**採用理由**: 既存の parse 関数群（`parseCustomerInput` 等）が `{ ok: true } | { ok: false, errors }` の Result パターンを使用しており、失敗パスの型表現が一貫する。`reason` による分岐で server action が適切なユーザーメッセージに変換できる。例外と違い、呼び出し側が失敗ハンドリングを強制される。

**却下案**: `throw` で失敗を表現する → 型で失敗パスが表現できず、呼び出し側が catch を忘れるリスクがある。

---

### D4: `parseBookingInput` は ID 文字列 + datetime-local 文字列を検証し、ドメイン構築は use-case に委ねる

`apps/web/lib/parse-booking-input.ts` の `parseBookingInput(raw)` は `zod/v4/mini` で境界検証のみを担う。戻り値は `{ customerId, serviceId, resourceId, startMillis }` であり、`TimeRange` やドメインオブジェクトは構築しない。`slot` の構築には `Service.duration` が必要であり、それは use-case が repo から取得するため parse 段階では不可能なため。

`datetime-local` 文字列（例: `"2026-07-01T10:00"`）は `new Date(str).getTime()` で epoch ミリ秒に変換し、`NaN` になれば不正入力としてエラーを返す。タイムゾーンの厳密な扱いは後続スライスに委ねる。

**採用理由**: ADR-006 D3 が確立した「二段の防御」を踏襲する。parse は UX 向けフィールドエラーを担い、ドメイン factory 不変条件（`createTimeRange` の `start < end` 等）がセキュリティ層を担う。parse 段階でドメイン構築まで行うと `Service.duration` 依存が生じ、境界関数に I/O が混入する。

**却下案**: parse 段階で `TimeRange` まで構築する → `duration` が parse 段階で利用できないため実現不能。`startAt` を文字列のまま use-case に渡す → 日時変換の検証が boundary 外に漏れる。

## Alternatives Considered

### Alternative 1: scheduling ドメインに catalog / resource を import させて束ねる

`@koma/scheduling` 内に `createBookingWithDurationCheck(params, serviceRepo, resourceRepo)` のようなサービス関数を置き、catalog と resource の情報を scheduling が取りに行く。

**Pros**: use-case の配置が delivery でなく scheduling ドメインに収まり、再利用しやすい。

**Cons**: `model.md` B-5（兄弟コンテキスト非依存）の明確な違反。scheduling が `@koma/catalog` と `@koma/resource` に依存すると、これら 3 パッケージが循環依存候補になる。域外 import が 1 つ入ると後続で雪だるま式に増える。

**Why not**: architect が明示的に却下。B-5 は koma の最重要設計規律であり、最初の横断 use-case での違反は後続の全コンテキストへ悪例を与える。

---

### Alternative 2: server action に orchestration を直書きする

`createBookingAction` の中に service 取得・resource 取得・canAccommodate・createBooking をすべて書く。

**Pros**: ファイル数が減り、見通しがシンプルに見える。

**Cons**: server action は `'use server'` / `revalidatePath` / `FormData` 等の Next.js 結合を持つため、vitest での単体テストが困難。capacity-aware 二重予約防止ロジックがテスト不能になる。将来 CLI / API route 等の別 delivery チャネルから呼べない。

**Why not**: architect が明示的に却下。看板の二重予約防止をユニットテストで固定できないことは本 change の受け入れ基準に違反する。

---

### Alternative 3: コンテキスト横断専用の application パッケージを作る

`packages/booking-application` 等の新パッケージに use-case を置き、複数の delivery チャネル（web / CLI 等）から共有する。

**Pros**: delivery から独立した use-case の再利用が明示的になる。

**Cons**: 現段階では delivery は `apps/web` のみであり、パッケージ追加のコストが効果を上回る。solo 開発・最小 ceremony の方針（ADR-006 D2 参照）に反する。将来 delivery チャネルが増えた時点でのリファクタで対応可能。

**Why not**: YAGNI。現段階では `apps/web/lib/` への use-case 配置で十分。将来必要になれば delivery 外のパッケージに引き上げできる構造になっている。

## Consequences

### Positive

- B-5（ドメイン間非依存）を維持しながら、3 コンテキストを束ねる予約作成フローを実現できる
- `createBookingUseCase` が純粋関数のため、capacity-aware 二重予約防止ロジックを in-memory repo でユニットテストに固定できる（look-ahead の受け入れ基準を達成）
- server action が「parse → use-case → 結果変換 → revalidate」の薄い配線に限定され、Next.js 結合がロジックに混入しない
- deps 注入により composition root / テスト / 将来の Drizzle 永続化のいずれも同一 use-case を呼べる（swappability の実証）
- 以降のコンテキスト横断機能（空き枠計算・キャンセルフロー等）が本 ADR のパターンを先例として踏襲できる

### Negative / Trade-offs

- delivery 層が orchestration ロジックを担うため、`apps/web/lib/` に実装が増える。単一コンテキストの deliver（customers / services / resources）と比べて use-case 関数が 1 ファイル増える
- 将来 delivery チャネルが複数になった場合、各チャネルで類似の use-case 配線が必要になる。その時点で application パッケージへの引き上げを検討する

### Risks

- **同時実行排他（race condition）**: `canAccommodate` は純粋判定であり、並行リクエストが同時に空き枠を取得して同時に save すると二重予約が発生しうる。**緩和策**: 単一プロセス in-memory では顕在化しない。Drizzle 配線時に DB トランザクション / 楽観的ロック / 一意制約で担保する（本スライスは判定ロジックの確立が目的）。
- **datetime-local のタイムゾーン曖昧性**: `new Date("2026-07-01T10:00").getTime()` はサーバ環境の TZ に依存する。**緩和策**: スコープ外として明示。後続スライスで `@internationalized/date` 等の tz ライブラリを導入する。

### Known Design Debt

- TC-019（`getBookingRepository()` の singleton 単体テスト）が未実装。他の repo も同テストを持たない既存 gap と同水準のため Fix=no とした。次スライス以降で `composition-root.test.ts` を追加することを推奨する。
- TC-023 / TC-024（`createBookingAction` で `service-not-found` / `resource-not-found` 発生時の日本語メッセージ確認テスト）が未実装。`no-capacity` のカバレッジはあり実装は正しいが、should 優先度のテスト補完として次スライス以降で対応する。

## References

- `docs/アーキテクチャ/model.md` — 層・依存規律 B-1〜B-6（B-5: 兄弟コンテキスト非依存）
- `specrunner/adr/004-scheduling-booking-aggregate-state-machine-and-capacity-aware-invariant.md` — `canAccommodate` 純関数・`BookingRepository` port の確立
- `specrunner/adr/006-web-delivery-layer-composition-root-server-action-zod-mini-boundary.md` — composition root / server action / zod/mini 境界検証パターンの確立（本 ADR が拡張する基盤）
- `specrunner/changes/web-booking/design.md` — 詳細設計判断 D1〜D9
- `apps/web/lib/create-booking-use-case.ts` — use-case 実装
- `apps/web/lib/parse-booking-input.ts` — 境界検証関数
- `apps/web/lib/composition-root.ts` — `getBookingRepository` globalThis singleton 追加
- `apps/web/app/bookings/actions.ts` — server action（薄い配線）
- `apps/web/lib/create-booking-use-case.test.ts` — capacity-aware ロジックのユニットテスト（71 件中含む）
