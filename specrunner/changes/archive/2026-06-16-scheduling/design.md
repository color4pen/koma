# Design: packages/scheduling — Booking 集約・BookingStatus 状態機械・capacity-aware 二重予約整合性

## Context

`packages/crm`・`packages/resource`・`packages/catalog` が確立した「ドメインパッケージ + Repository port（`src/port/`）+ in-memory 実装」パターンを core コンテキスト `scheduling` に適用する。

`Booking` は「顧客 × サービス × リソース × 時間枠 × ステータス」の整合性境界であり、`BookingStatus` 状態機械（5 値・許可遷移表）と capacity-aware 二重予約不変条件を持つ。他の 3 パッケージと異なり、scheduling は状態機械と純関数による整合性判定を導入する初めてのドメインパッケージとなる。

### 現状コードの前提

- `@koma/shared` が `Id<Brand>`、`TimeRange`（半開区間 `[start, end)`）、`overlaps`、`contains`、`createTimeRange` を export している。
- `Resource.capacity`（正整数、既定 1）は `@koma/resource` が構築時にガードしている。scheduling は `capacity` を数値として受け取るのみで resource パッケージを import しない（B-5）。
- 既存 3 パッケージの共通構造: `package.json`（`@koma/shared` に `workspace:*` 依存、scripts: `check-types` / `test` / `lint`）、`tsconfig.json`（ES2022 / bundler / strict / noEmit）、`vitest.config.ts`、`eslint.config.js`、`src/index.ts`（barrel export）。

## Goals / Non-Goals

**Goals**:

- `@koma/scheduling` パッケージを新設し、既存パッケージ構造に準拠する
- `Booking` 集約を immutable 型として定義する（`id` / `customerId` / `serviceId` / `resourceId` / `slot` / `status` / `customFields`）
- `BookingStatus` 状態機械を遷移表（データ）として表現し、純関数 `transitionBooking` で許可遷移を強制する
- `isActive` / `isTerminal` 述語を提供する
- capacity-aware 二重予約整合性判定を純関数 `canAccommodate` として提供する
- `BookingRepository` port に `findActiveByResource` を含める
- in-memory 実装を提供する
- 全パブリック API を vitest テストで固定する

**Non-Goals**:

- 空き枠計算（`availableSlots`）— Availability 依存のため別 request
- 予約ユースケース（fetch → 判定 → save の排他トランザクション）— delivery / db の責務
- `slot` と `Service.duration` の一致検証 — scheduling は catalog を import しない（B-5）。delivery の責務
- 予約変更（reschedule）・キャンセル待ち（waitlist）
- 通知連携
- Drizzle 永続化
- マルチテナント

## Decisions

### D1: 既存パッケージ構造の完全踏襲

resource / crm / catalog と同一のファイル構造・命名・設定を適用する。

```
packages/scheduling/
├── package.json
├── tsconfig.json
├── eslint.config.js
├── vitest.config.ts
└── src/
    ├── index.ts
    ├── booking.ts
    ├── booking.test.ts
    ├── booking-status.ts
    ├── booking-status.test.ts
    ├── can-accommodate.ts
    ├── can-accommodate.test.ts
    ├── port/
    │   └── booking-repository.ts
    ├── in-memory-booking-repository.ts
    └── in-memory-booking-repository.test.ts
```

**Rationale**: 4 パッケージ目として一貫性を維持する。scheduling 固有の要素（状態機械・整合性判定）は独立モジュールとして追加し、既存構造を崩さない。

**Alternatives considered**: booking-status を booking.ts に統合 → 却下。遷移表・述語・遷移関数がまとまった独立モジュールとして分離した方が、テスト・可読性の観点で優れる。

### D2: BookingStatus 遷移表をデータとして表現する

`ALLOWED_TRANSITIONS` を `Map<BookingStatus, ReadonlySet<BookingStatus>>` として定義し、`transitionBooking` がこのデータを引くことで遷移の許可/不許可を判定する。

```
pending   → { confirmed, cancelled }
confirmed → { cancelled, completed, no-show }
cancelled → ∅
completed → ∅
no-show   → ∅
```

**Rationale**: 遷移を switch/if で散在させず、宣言的に一箇所で管理する。テストで遷移表を網羅的に検証でき、将来の状態追加も表の変更で対応する。architect 評価済み。

**Alternatives considered**: status を自由に set できる setter → 却下。不正遷移を許し状態機械の整合性が崩壊する（architect 却下済み）。

### D3: `transitionBooking` は新 Booking を返す（immutable 遷移）

`transitionBooking(booking, to)` は許可遷移なら `status` を変えた新しい frozen `Booking` を返し、不正遷移なら `Error` を throw する。元の `Booking` インスタンスは変更しない。

**Rationale**: Booking は immutable 集約。状態遷移も新インスタンス生成パターンに合わせる。crm の `updateCustomer` / resource の `updateResource` と一貫する。

**Alternatives considered**: Booking に `transition` メソッドを持たせる → 却下。既存パッケージはクラスでなく型＋関数のスタイル。

### D4: `canAccommodate` を純関数として分離する

`canAccommodate(existingActive: Booking[], slot: TimeRange, capacity: number): boolean`

提案する `slot` を加えた場合に、任意の時刻で重なる active 予約数が `capacity` を超えないかを判定する。I/O を持たず、Repository が供給する active 予約リストと TimeRange だけを受け取る。

内部はスイープライン方式: `slot` と重なる既存予約の `[start, end)` から時刻イベントを収集し、最大同時数 + 1（提案分）が `capacity` 以下かを判定する。

**Rationale**: 判定の純粋性とテスト可能性を担保する。排他制御は delivery/db のトランザクション＋ DB 制約の責務であり、domain は純粋判定のみ提供する。architect 評価済み。

**Alternatives considered**: capacity チェックを Repository や IO に埋め込む → 却下。テスト不能で判定が副作用に混ざる（architect 却下済み）。

### D5: `BookingRepository` に `findActiveByResource` を置く

`findActiveByResource(resourceId: Id<'Resource'>): Promise<Booking[]>` は、指定 Resource の active（`pending` | `confirmed`）な Booking のみを返す。`canAccommodate` の入力源として意図を明示する。

**Rationale**: `list` 全件取得 → filter は意図が表れず、件数増で非効率。capacity チェックに必要な「同一 Resource の active 予約」というクエリを port レベルで表現する。architect 評価済み。

**Alternatives considered**: `list` + filter → 却下。意図不明・非効率（architect 却下済み）。

### D6: Booking の `customFields` は `Readonly<Record<string, CustomFieldValue>>` で crm と同型

`CustomFieldValue` は `string | number | boolean`。crm の `Customer` と同じ型を使う。ただし crm を import せず、scheduling 内で同一の型定義を持つ。

**Rationale**: B-5（兄弟コンテキスト非依存）を守りつつ、拡張点として同じ構造を提供する。将来 shared に引き上げる選択肢は残す。

**Alternatives considered**: `Record<string, unknown>` → 却下。テスト・型安全性が下がる。crm を import → 却下。B-5 違反。

### D7: Booking の `createBooking` は初期 status を `pending` に固定する

新規予約は必ず `pending` で作成される。status を引数で受け取らない（`confirmed` で直接作成する経路を塞ぐ）。

**Rationale**: 状態機械の起点を構築時に強制する。全ての Booking が `pending` → 遷移 という経路を通ることで、遷移表の整合性が保たれる。

**Alternatives considered**: 任意の初期 status を許す → 却下。terminal 状態で直接作成すると状態機械の意味が崩れる。ただし永続化からの復元時に任意 status が必要なため、復元用の内部ファクトリ（`restoreBooking`）を別途提供する。

## Risks / Trade-offs

- **[Risk]** `canAccommodate` のスイープライン実装の正確性（端点の扱い、半開区間の整合） → **Mitigation**: TimeRange の `overlaps` を活用し、受け入れ基準のテストケース（隣接 `[a,b)+[b,c)` は非重複、capacity=2 で 2 重なりまで true・3 重なりで false）で固定する。
- **[Risk]** `customFields` の型を scheduling 内で再定義するため crm と乖離する可能性 → **Mitigation**: 現時点では同一の定義。将来 shared に引き上げるリファクタで統一可能。
- **[Risk]** `restoreBooking` の存在により任意 status の Booking が作れる → **Mitigation**: `restoreBooking` はテストと永続化アダプタからの復元専用。公開 API としては export するが、ドキュメンテーションで意図を明示する。

## Open Questions

なし。architect 評価済みの設計判断を踏襲し、既存パターンの横展開であるため未決定事項はない。
