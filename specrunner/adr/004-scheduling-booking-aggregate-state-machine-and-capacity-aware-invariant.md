# ADR-004: @koma/scheduling の確立 — Booking 集約・BookingStatus 状態機械・capacity-aware 二重予約不変条件

- **status**: accepted
- **date**: 2026-06-16
- **change**: scheduling
- **deciders**: architect, spec-runner

## Context

`packages/crm`・`packages/resource`・`packages/catalog` が「ドメインパッケージ + Repository port + in-memory 実装」パターンを確立した。core コンテキスト `scheduling` はこのパターンを踏襲しつつ、3 つの先行パッケージが持っていない要素を新たに導入する。

1. **BookingStatus 状態機械**: `pending → confirmed → completed / no-show / cancelled` の許可遷移を、switch/if ではなく遷移表（データ）として定義し、純関数 `transitionBooking` が参照する設計。
2. **capacity-aware 二重予約不変条件**: 同一 Resource で任意の時刻に重なる active 予約数が `Resource.capacity` を超えないことを、I/O を持たない純関数 `canAccommodate` で判定する設計。
3. **`findActiveByResource`**: 「同一 Resource の active 予約」という capacity チェックに特化したクエリを Repository port レベルで表現する設計。

これらは以降の予約フロー全体（予約作成・確定・キャンセル・空き枠計算）の構造的前提になるため ADR として記録する。

### 現状コードの前提

- `@koma/shared` が `Id<Brand>`・`TimeRange`（半開区間 `[start, end)`）・`overlaps`・`contains`・`createTimeRange` を export している。
- `docs/アーキテクチャ/domain-model.md`: `Booking` 集約は `customerId` / `serviceId` / `resourceId` / `slot: TimeRange` / `status: BookingStatus` / `customFields`。capacity-aware 二重予約不変条件。
- `docs/アーキテクチャ/dynamic-model.md`: BookingStatus 5 値（`pending` / `confirmed` / `cancelled` / `completed` / `no-show`）。active = {`pending`, `confirmed`}、terminal = {`cancelled`, `completed`, `no-show`}。許可遷移: `pending → confirmed | cancelled`、`confirmed → cancelled | completed | no-show`、terminal → 遷移なし。

## Decisions

### D1: 既存ドメインパッケージ構造の完全踏襲

crm / resource / catalog と同一の scaffold を適用する。`package.json`（name: `@koma/scheduling`、`@koma/shared` に `workspace:*` 依存、scripts: `check-types` / `test` / `lint`）、`tsconfig.json`（ES2022 / bundler / strict / noEmit）、`vitest.config.ts`、`eslint.config.js`、`src/index.ts`（barrel export）。禁止依存（`next` / `react` / `drizzle-orm` / `zod`）はゼロとする。

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

scheduling 固有の要素（状態機械・整合性判定）は独立モジュールとして追加し、既存構造を崩さない。

**採用理由**: 4 パッケージ目として一貫性を維持し、後続パッケージが迷わず踏襲できるテンプレートを保つ。

**却下案**: `booking-status` を `booking.ts` に統合 → 遷移表・述語・遷移関数がまとまった独立モジュールとして分離した方が、テスト・可読性の観点で優れる。

---

### D2: BookingStatus 遷移表をデータとして表現する

`ALLOWED_TRANSITIONS` を `ReadonlyMap<BookingStatus, ReadonlySet<BookingStatus>>` として定義し、`transitionBooking` がこのデータを参照することで許可/不許可を判定する。

```typescript
const ALLOWED_TRANSITIONS: ReadonlyMap<BookingStatus, ReadonlySet<BookingStatus>> =
  new Map([
    ['pending',   new Set<BookingStatus>(['confirmed', 'cancelled'])],
    ['confirmed', new Set<BookingStatus>(['cancelled', 'completed', 'no-show'])],
    ['cancelled', new Set<BookingStatus>()],
    ['completed', new Set<BookingStatus>()],
    ['no-show',   new Set<BookingStatus>()],
  ]);
```

`ReadonlyMap` とすることで型レベルで遷移表の改変（`.set()` / `.delete()`）を防ぎ、状態機械の整合性を担保する。

**採用理由**: 遷移を switch/if で散在させず、宣言的に一箇所で管理する。テストで遷移表を網羅的に検証でき、将来の状態追加も表の変更のみで対応する。

**却下案**: `status` を自由に set できる setter → 不正遷移を許し状態機械の整合性が崩壊する。switch/if で遷移を散在させる → 追加時に漏れが生じやすく、一覧性がない。

---

### D3: `transitionBooking` は新 Booking を返す（immutable 遷移）

`transitionBooking(booking, to)` は許可遷移なら `status` を変えた新しい frozen `Booking` を返す。不正遷移なら `Error` を throw する。元の `Booking` インスタンスは変更しない。

```typescript
function transitionBooking(booking: Booking, to: BookingStatus): Booking {
  const allowed = ALLOWED_TRANSITIONS.get(booking.status);
  if (!allowed?.has(to)) {
    throw new Error(
      `Invalid transition: ${booking.status} → ${to}`
    );
  }
  return Object.freeze({ ...booking, status: to });
}
```

**採用理由**: Booking は immutable 集約。状態遷移も新インスタンス生成パターンに合わせる。crm の `updateCustomer` / resource の `updateResource` と一貫する。

**却下案**: Booking に `transition` メソッドを持たせる → 既存パッケージはクラスでなく型＋関数のスタイルを確立しており、class 導入は規約違反となる。

---

### D4: `createBooking` は初期 status を `pending` に固定し、`restoreBooking` で永続化復元に対応する

新規予約は必ず `pending` で作成される。呼び出し側が status を引数で指定する経路は存在しない。

```typescript
function createBooking(params: {
  id: Id<'Booking'>;
  customerId: Id<'Customer'>;
  serviceId: Id<'Service'>;
  resourceId: Id<'Resource'>;
  slot: TimeRange;
  customFields?: Readonly<Record<string, CustomFieldValue>>;
}): Booking
```

永続化アダプタからの復元時に任意 status が必要なため、復元専用の内部ファクトリ `restoreBooking` を別途提供する。`restoreBooking` はテストと永続化アダプタからの復元専用であり、通常の予約作成フローには使用しない。

**採用理由**: 状態機械の起点を構築時に強制する。`confirmed` 等で直接作成する経路を塞ぐことで、全 Booking が `pending → 遷移` という経路を通ることを保証する。

**却下案**: 任意の初期 status を `createBooking` 引数で許す → terminal 状態で直接作成すると状態機械の意味が崩れる。

---

### D5: `canAccommodate` を純関数として分離する

```typescript
function canAccommodate(
  existingActive: Booking[],
  slot: TimeRange,
  capacity: number,
): boolean
```

提案する `slot` を加えた場合に、任意の時刻で重なる active 予約数が `capacity` を超えないかを判定する。I/O を持たず、Repository が供給する active 予約リストと TimeRange だけを受け取る。

内部実装: `slot` と重なる既存予約の `[start, end)` から時刻イベント（開始時刻に `+1`、終了時刻に `-1`）を収集し、ソート後にスイープして最大同時数を算出し、`最大同時数 + 1（提案分） ≤ capacity` を判定する。

半開区間 `[a,b)` と `[b,c)` は隣接（重ならない）と判定される（`overlaps` の実装に準拠）。

**採用理由**: 判定の純粋性とテスト可能性を担保する。排他制御（同時実行での二重予約防止）は delivery/db のトランザクション＋ DB 制約の責務であり、domain は純粋判定のみ提供する。

**却下案**: capacity チェックを Repository / IO に埋め込む → テスト不能で判定が副作用に混ざる。実行時に DB ロックを要し、ドメインロジックが永続化技術に依存する。

---

### D6: `BookingRepository` port に `findActiveByResource` を置く

```typescript
type BookingRepository = {
  save(booking: Booking): Promise<void>;
  findById(id: Id<'Booking'>): Promise<Booking | null>;
  list(): Promise<Booking[]>;
  findActiveByResource(resourceId: Id<'Resource'>): Promise<Booking[]>;
};
```

`findActiveByResource` は指定 Resource の active（`pending` | `confirmed`）な Booking のみを返す。`canAccommodate` の入力源として意図を明示する専用クエリ。

**採用理由**: `list` 全件取得 → filter は意図が表れず、件数増で非効率。capacity チェックに必要な「同一 Resource の active 予約」というクエリを port レベルで表現することで、後続の DB アダプタが適切なインデックスを当てる意図を伝える。

**却下案**: `list` + filter（呼び出し側） → 意図不明・非効率。`list(filter?: FilterParams)` の汎用クエリ → 型安全性が下がり、port の意図が曖昧になる。

---

### D7: `customFields` の型を scheduling 内で独立して定義する

```typescript
type CustomFieldValue = string | number | boolean;
```

crm の `Customer` と同じ型だが、crm を import せず scheduling 内で同一の定義を持つ。B-5（兄弟コンテキスト非依存）を守る。

**採用理由**: `model.md` B-5 に従い、scheduling は crm / resource / catalog を import しない。将来 `CustomFieldValue` を `@koma/shared` に引き上げるリファクタで統一可能。

**却下案**: `Record<string, unknown>` → テスト・型安全性が下がる。crm を import → B-5 違反。

---

### D8: 排他制御は delivery/db の責務（domain は純粋判定のみ）

`canAccommodate` は純粋な整合性判定を担う。同時実行での二重予約防止（race condition）は delivery 層のトランザクション＋ DB 制約（例: 楽観的ロック・FOR UPDATE）の責務とする。

**採用理由**: domain は I/O なし・トランザクションなし・純関数のみという原則を維持する。排他制御をドメインに持ち込むと、ドメインが永続化技術に強く依存し、テスト可能性・変更容易性が損なわれる。

**却下案**: domain が排他制御を担う → ドメインが DB ロック等の永続化詳細を知る必要が生じ、B-2 違反。

## Alternatives Considered

### Alternative 1: capacity チェックを Repository/IO に埋め込む

`canAccommodate` を純関数として分離せず、`BookingRepository` の `save` メソッドや専用クエリの中で容量チェックと予約保存を一括して行う。

**Pros**: チェックと保存がアトミックに実行されるため、race condition への対策が DB レベルで自然に組み込まれる。呼び出し側のコードが「`findActiveByResource` → `canAccommodate` → `save`」の 3 ステップから `save`（チェック込み）1 ステップに簡略化される。

**Cons**: capacity 判定ロジックが IO/Repository に混入し、単体テストで DB を必要とする。ドメインの純粋性が失われ、判定結果が永続化技術に依存する。チェックのみを行いたいシナリオ（プレビュー・バリデーション）で副作用なしに呼び出せない。

**Why not**: `model.md` B-2（domain は infra を知らない）違反。architect が明示的に却下。domain は純粋判定のみを担い、排他制御は delivery/db 層のトランザクション＋ DB 制約で実現する方針を採用した。

---

### Alternative 2: `list` 全件取得 → 呼び出し側 filter（`findActiveByResource` を port に置かない）

`BookingRepository` に専用クエリを設けず、`list()` で全件取得したあと呼び出し側が `isActive(b.status) && b.resourceId === resourceId` で絞り込む。

**Pros**: port インターフェースがシンプルになり、メソッド数が減る。汎用性が高く、呼び出し側がフィルタ条件を自由に組み合わせられる。

**Cons**: capacity チェックの意図（「同一 Resource の active 予約を得る」）が port レベルで表現されず、コードを読んだだけでは目的が分かりにくい。予約件数が増えると全件ロードのコストが無視できなくなり、DB アダプタが `resourceId + status` のインデックスを活用できない。

**Why not**: architect が「意図が表れず、件数増で非効率」として却下。`findActiveByResource` を port に明示することで、後続の Drizzle アダプタが適切なインデックスを設計できる意図を伝える。

---

### Alternative 3: `status` を自由に set できる setter を持たせる（状態機械を設けない）

`Booking` の `status` を通常のミュータブルフィールドとし、呼び出し側が任意の値を代入できる設計。遷移の許可/不許可はアプリケーション層の責任とする。

**Pros**: 実装が最もシンプル。遷移表やファクトリ関数が不要。状態変更のコードが 1 行で済む。

**Cons**: 不正遷移（`pending → completed`、`cancelled → confirmed` 等）がドメインレベルで防止できない。状態機械の整合性がアプリケーション層のルール徹底に完全依存し、見落としが本番バグに直結する。テストで「遷移の許可/拒否」を一箇所で網羅的に固定できない。

**Why not**: architect が明示的に却下。Booking の状態遷移は予約システムの中核的な不変条件であり、ドメイン層で強制する必要がある。`dynamic-model.md` が定義した状態機械をドメインコードとして具現化することが本 request の主要目的。

---

### Alternative 4: Booking に `transition` メソッドを持たせる（class 導入）

`Booking` を class として実装し、`booking.transition('confirmed')` のようにインスタンスメソッドで状態遷移を行う。

**Pros**: 遷移ロジックが `Booking` クラスにカプセル化される。OOP の観点では状態機械の表現として自然。

**Cons**: `packages/crm`・`packages/resource`・`packages/catalog` が確立した「readonly 型エイリアス + ファクトリ関数 + `Object.freeze`・class 不使用」パターン（ADR-001・ADR-003）と矛盾する。class 導入により `instanceof` チェックが必要になるケースが生まれ、シリアライズ/デシリアライズが複雑化する。

**Why not**: 既存パッケージが type + 関数スタイルを規約として確立しており、scheduling だけ class を導入すると一貫性が失われる。architect が design.md D3 で却下済み。

---

### Alternative 5: `slot` と `Service.duration` の一致検証を scheduling 内で行う

`createBooking` またはドメインサービスの中で、`slot` の長さが `Service.duration` と一致するかを検証する。

**Pros**: 予約の slot 長が必ずサービス所要時間と一致することをドメイン層で保証できる。

**Cons**: scheduling が catalog（`@koma/catalog` / `Service` 型）を import する必要が生じ、B-5（兄弟コンテキスト非依存）違反となる。ドメイン間の依存が生まれ、scheduling のテストに catalog のセットアップが必要になる。

**Why not**: `model.md` B-5 違反。architect が「slot と Service.duration の一致は delivery の責務」として明示的にスコープ外とした。delivery 層が `Service.duration` を使って絶対 `TimeRange` を組み立て scheduling に渡す設計で対応する。

## Consequences

### Positive

- `@koma/scheduling` が BookingStatus 状態機械と capacity-aware 整合性の純粋なドメインコアを提供する。以降の予約フロー（予約作成・確定・キャンセル・空き枠計算）はこのパッケージの上に構築できる。
- `canAccommodate` が純関数のため、delivery/db 実装前から予約整合性ロジックを完全にテストできる。
- `findActiveByResource` が port に明示されることで、後続の Drizzle アダプタが `resourceId + isActive` のインデックスを設計する意図が伝わる。
- 遷移表をデータで持つことで、状態追加・遷移追加が表の変更のみで対応でき、漏れが生じにくい。
- 禁止依存（`next` / `react` / `drizzle-orm` / `zod`）ゼロを物理的に担保し、B-5（兄弟コンテキスト非依存）も維持する。

### Negative / Trade-offs

- `canAccommodate` は純粋判定のみで排他制御を行わないため、同時リクエストによる二重予約は delivery/db 層で防ぐ必要がある。ドメイン単独での保証範囲が「判定時点の整合性」に限定される。
- `restoreBooking` の存在により任意 status の Booking を作成できる。誤用防止はドキュメンテーションと慣習に依存し、型レベルでは防げない。
- `customFields` の型 (`CustomFieldValue`) が scheduling / crm で重複定義される。将来 `@koma/shared` への引き上げで解消可能だが、一時的な冗長が生じる。
- スイープライン実装（`canAccommodate`）の正確性は、半開区間の端点処理を含む受け入れテストで担保される。将来の TimeRange 実装変更（端点の解釈変更）は `canAccommodate` のテストで検出される。

## References

- `docs/アーキテクチャ/model.md` — 層・依存規律 B-1〜B-6、port の所在定義
- `docs/アーキテクチャ/domain-model.md` — Booking 集約・capacity-aware 二重予約不変条件
- `docs/アーキテクチャ/dynamic-model.md` — BookingStatus 5 値・許可遷移・active / terminal 区分
- `specrunner/changes/scheduling/design.md` — 詳細設計判断（D1〜D7）
- `specrunner/adr/001-shared-kernel-value-objects.md` — 共有カーネル規約（readonly 型 + ファクトリ + freeze）
- `specrunner/adr/003-crm-domain-package-and-repository-port-pattern.md` — ドメインパッケージ + Repository port パターンの先例
- `packages/scheduling/src/booking-status.ts` — ALLOWED_TRANSITIONS 遷移表・transitionBooking 実装
- `packages/scheduling/src/can-accommodate.ts` — canAccommodate スイープライン実装
- `packages/scheduling/src/port/booking-repository.ts` — BookingRepository port 定義
