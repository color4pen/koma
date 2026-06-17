# Design: apps/web に予約作成フローを追加する（capacity-aware 二重予約防止・コンテキスト横断 use-case）

## Context

予約管理システムの看板機能。**顧客 × サービス × リソース × 時刻** から予約を作成する画面を `apps/web` に追加する。

本スライスの核心は **コンテキスト横断の orchestration**。`Service`（catalog）の `duration`、`Resource`（resource）の `capacity`、`Booking`（scheduling）の整合性を 1 つのフローで束ねる必要がある。ドメインは兄弟コンテキストを互いに import しない（B-5）ため、この束ね役は delivery 層（application use-case）が担う。

現状:

- `apps/web` の delivery パターンは web-customers / web-resources / web-services で確立済み。`composition-root.ts` に `getCustomerRepository` / `getResourceRepository` / `getServiceRepository`（`globalThis` lazy singleton）。
- `@koma/scheduling` が `createBooking`（`pending` 開始）/ `canAccommodate`（sweep-line 方式の capacity-aware 判定）/ `BookingRepository`（port）/ `createInMemoryBookingRepository` を export。
- `@koma/shared` が `createTimeRange(start, end)` を export（半開区間 `[start, end)`、`start < end`）。`Duration` は `milliseconds` プロパティを持つ。
- `apps/web` は `@koma/scheduling` 未依存。`composition-root.ts` に `getBookingRepository` は存在しない。

## Goals / Non-Goals

**Goals**:

- `apps/web` に `@koma/scheduling` 依存を追加し、予約の一覧表示・新規作成ができる画面を提供する。
- delivery 層に **コンテキスト横断 use-case**（`createBookingUseCase`）を置き、`ServiceRepository` / `ResourceRepository` / `BookingRepository` を束ねた純粋オーケストレーションを実現する。
- `canAccommodate` による **capacity-aware 二重予約防止**を use-case 内で実行し、そのロジックを in-memory repo のユニットテストで固定する。
- `parseBookingInput`（境界検証）＋ドメイン factory 不変条件の二段防御を維持する。

**Non-Goals**:

- 空き枠表示（`availableSlots`）— `Availability` UI 依存のため後続。
- 予約の確定 / キャンセル等ステータス操作 UI（後続）。
- タイムゾーンの厳密な扱い（`datetime-local` をサーバローカル時刻として単純変換で可。tz 厳密化は後続）。
- Drizzle 永続化への配線・認証・検索。

## Decisions

### D1: コンテキスト横断の orchestration は delivery 層の use-case に配置する

`createBookingUseCase(deps, input)` を `apps/web/lib/create-booking-use-case.ts` に配置する。`deps` として `serviceRepo` / `resourceRepo` / `bookingRepo` を受け取り、`input` から予約を作成する。orchestration の手順：service 取得 → resource 取得 → slot 導出 → canAccommodate → createBooking → save。

**Rationale**: ドメインコンテキストは兄弟を import しない（B-5）。予約作成には `catalog`（duration）・`resource`（capacity）・`scheduling`（booking）の 3 コンテキストの情報が必要。これを束ねる責務は delivery 層の composition にある。use-case を独立関数として切り出すことで、server action に直書きする場合と違い、テスト可能になる。

**Alternatives considered**:
- scheduling ドメインに catalog / resource を import させて束ねる → 却下。B-5 違反。
- server action に orchestration を直書きする → 却下。テスト不能。FormData / revalidatePath 等の Next.js 結合が use-case ロジックに混入する。

### D2: use-case の deps 注入で純粋・テスト可能にする

`createBookingUseCase` は `{ serviceRepo: ServiceRepository; resourceRepo: ResourceRepository; bookingRepo: BookingRepository }` を `deps` パラメータとして受け取る。I/O はすべて repo 越し。これにより in-memory repo を注入してユニットテストが書ける。

**Rationale**: 看板の二重予約防止（capacity-aware）はビジネスの核心。テストで固定する必要がある。deps 注入により composition root / テスト / 将来の Drizzle 永続化のいずれからも同じ use-case を呼べる。

**Alternatives considered**:
- composition root の getter を use-case 内から直接呼ぶ → 却下。テスト時にモックが必要になり、純粋性が失われる。

### D3: use-case の戻り値は discriminated union（Result 型）

`createBookingUseCase` は以下の Result 型を返す：
- `{ ok: true; booking: Booking }` — 成功
- `{ ok: false; reason: 'service-not-found' | 'resource-not-found' | 'no-capacity' }` — 失敗

**Rationale**: 既存の `parseServiceInput` が `{ ok: true } | { ok: false, errors }` の Result パターンを使用しており、一貫性がある。reason による分岐で server action が適切なユーザーメッセージに変換できる。

**Alternatives considered**:
- throw で失敗を表現する → 却下。型で失敗パスが表現できず、呼び出し側が catch を忘れるリスクがある。

### D4: parseBookingInput は ID 文字列 + datetime-local 文字列を検証し、ドメイン構築は行わない

`parseBookingInput(raw)` は `zod/v4/mini` で `customerId` / `serviceId` / `resourceId`（非空文字列）と `startAt`（`datetime-local` 文字列 → epoch ミリ秒変換）を検証し、`{ customerId, serviceId, resourceId, startMillis }` を返す。`TimeRange` やドメインオブジェクトの構築は use-case に委ねる。

**Rationale**: `parseBookingInput` は境界検証のみを担当する。`slot` の構築には `Service.duration` が必要であり、これは use-case が repo から取得するため、parse 段階では構築できない。`datetime-local` の文字列は `new Date(str).getTime()` で epoch ミリ秒に変換し、`NaN` なら不正入力とする。

**Alternatives considered**:
- parse 段階で `TimeRange` まで構築する → 不可能。`duration` が parse 段階で利用できない。
- `startAt` を文字列のまま use-case に渡す → 却下。日時変換の検証が boundary 外に漏れる。

### D5: datetime-local 文字列の epoch ミリ秒変換は new Date(str).getTime() で行う

`datetime-local` の入力値（例: `"2026-07-01T10:00"`）を `new Date(str).getTime()` で epoch ミリ秒に変換する。`NaN` になった場合は不正入力としてエラーを返す。

**Rationale**: `datetime-local` の value は ISO 8601 に近い形式であり、`new Date()` で解釈可能。タイムゾーンの厳密な扱いはスコープ外であり、サーバローカル時刻として単純変換する。

**Alternatives considered**:
- 正規表現で `YYYY-MM-DDTHH:mm` を検証してから変換する → 不要な複雑化。`new Date().getTime()` が `NaN` を返すことで不正入力は検出できる。

### D6: composition root の globalThis 単一生成パターンを踏襲

`getBookingRepository()` を `composition-root.ts` に追加し、`globalThis` に `bookingRepository` を lazy 生成する。既存の 3 つの getter と同一のパターン。

**Rationale**: 具象生成を 1 箇所に集約することで、後続の Drizzle 永続化切り替えがこの 1 箇所の変更で完了する。HMR による再生成も防止される。

**Alternatives considered**:
- server action 内で直接 `createInMemoryBookingRepository()` を呼ぶ → 却下。具象生成が分散し、永続化切り替えが困難になる。singleton 保証もできない。

### D7: server action は parse → use-case → 結果変換の薄い配線

`createBookingAction` は `parseBookingInput` → `createBookingUseCase`（composition root の repo を deps に注入）→ reason ごとの日本語メッセージ変換 → `revalidatePath('/bookings')` の薄い配線のみ担当する。orchestration ロジックは use-case に閉じる。

**Rationale**: server action は Next.js の結合点であり、テスト困難。ロジックを use-case に分離することで、action のテストは「parse → use-case 呼び出し → revalidate」の配線確認のみで済む。

**Alternatives considered**:
- action 内に orchestration を書く → 却下。D1 / D2 と同じ理由。

### D8: 予約一覧は customer / service / resource 名を各 repo の findById で解決して表示する

`app/bookings/page.tsx`（server component）は `bookingRepo.list()` で全予約を取得し、各予約の `customerId` / `serviceId` / `resourceId` を対応する repo の `findById` で解決して名前を表示する。

**Rationale**: in-memory repo かつ少量データの現段階では N+1 問題は顕在化しない。read model / join は後続の Drizzle 永続化・reporting コンテキストの責務。

**Alternatives considered**:
- Map でまとめて引く最適化 → 現段階では不要な複雑化。ただし `list()` で全件取得して Map 化する程度の最適化は実装者の裁量とする。

### D9: booking-form.tsx は customer / service / resource のドロップダウンで選択する

作成フォーム（client component）は各 repo の `list()` から取得した一覧を `<select>` で表示する。選択値は各エンティティの `id`。`startAt` は `<input type="datetime-local">` で入力する。

**Rationale**: フリーテキストで ID 入力はユーザビリティが低い。ドロップダウンならば有効な ID のみが送信される。一覧データは server component で取得し、client component に props として渡す。

**Alternatives considered**:
- ID をテキスト入力する → 却下。ユーザビリティが著しく低い。

## Risks / Trade-offs

- **[Risk] N+1 問題（一覧での名前解決）** → Mitigation: 現段階は in-memory repo で少量データ。Drizzle 永続化時に join / read model で対応する。当面は `list()` で全件取得して Map 化する最適化で十分。
- **[Risk] in-memory repository はプロセス再起動で消失** → Mitigation: 本スライスはデモ用途。Drizzle 永続化は後続スライスで対応予定。composition root の 1 箇所を差し替えるだけで移行可能（D6）。
- **[Risk] datetime-local のタイムゾーン曖昧性** → Mitigation: スコープ外として明示。`new Date(str)` はブラウザのローカル TZ を使うが、サーバ側は UTC 基準になりうる。現段階は「サーバローカル時刻として単純変換」で許容し、後続で tz ライブラリを導入する。
- **[Risk] 同時実行排他（race condition）** → Mitigation: 単一プロセス in-memory では顕在化しない。Drizzle 配線時に DB トランザクション / 楽観ロック or 一意制約で担保する。本スライスは **判定ロジックの確立** が目的。

## Open Questions

なし。設計判断はすべて architect が評価済み。
