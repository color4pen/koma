# Domain Model — 型/データモデル（Logical View / tactical DDD）

> `model.md`（層・依存）の下の粒度で、**業務データの「形」と「不変条件」**を定義する。業種中立。
> **SoT 境界**: 正確なフィールドはコードが正典（各パッケージの `src/`）。本書は集約境界・値オブジェクト・常に保つ制約・型の所在まで。
> 「常に保つ形」は structure（ここ）、「制約を強制するロジック」は behavior（spec / 歯）。

---

## Aggregate（整合性境界）

### Booking — 1 予約（scheduling）— 整合性境界
- **役割**: 顧客 × サービス × リソース × 時間枠 × ステータスの 1 予約。状態変更は **Booking 集約の API 経由のみ**（patch / 直書きしない＝整合性境界）。
- **identity**: `Id<'Booking'>`。
- **構成（参照は id で持つ）**: `customerId: Id<'Customer'>` / `serviceId: Id<'Service'>` / `resourceId: Id<'Resource'>` / `slot: TimeRange` / `status: BookingStatus`（`dynamic-model.md`）/ `customFields`（拡張点）。
- **不変条件**:
  - `slot` の長さは `Service` の所要 `Duration` に一致する（または下限として満たす）。
  - `resourceId` は `Service` が対応する `Resource` 種別に属する。
  - **二重予約不変条件**: 同一 `Resource` について、枠を占有する状態（active = `pending` / `confirmed`、`dynamic-model.md`）の Booking の `slot` は相互に overlap しない。これは単一 Booking では閉じない **Resource 時間帯一意性**であり、scheduling の予約ユースケースが port（Repository）の排他＋ DB 一意制約で守る（強制手順は behavior）。
- → `packages/scheduling/src/`（正確なフィールドはコードが正典）

### Customer — 顧客台帳（crm）
- **役割**: 連絡先・メモ・タグ・来店履歴参照・カスタムフィールドを持つ顧客の整合性境界。
- **identity**: `Id<'Customer'>`。
- **不変条件**: 連絡先のいずれか（後で確定）を最低 1 つ持つ。`customFields` は値の容れ物のみ（スキーマは domain 外＝拡張点）。
- → `packages/crm/src/`

---

## Entity / Policy（scheduling 内、Booking の参照先）

| 概念 | 役割 | identity | 備考 |
|---|---|---|---|
| **Resource** | 予約枠の主体。人/席/部屋/機材を抽象化する（「スタッフ」と名付けない＝B-6） | `Id<'Resource'>` | 種別タグを持つ |
| **Service** | 提供メニュー。所要 `Duration`・料金 `Money`・対応 Resource 種別 | `Id<'Service'>` | — |
| **Availability** | 営業時間・休業・例外。空き枠導出の元データ | — | 期間ルールの集合（policy）|

> 空き枠は `(Availability × Resource × Service × active Bookings)` からの純粋導出で scheduling に属する。**導出の手順は behavior**（spec）であり本書は入力/出力の所在のみ示す。

---

## Value Objects（等価性 by value、immutable）— shared-kernel

| VO | 形 | 不変条件 |
|---|---|---|
| **`Id<Brand>`** | branded string（`string & { readonly __brand: Brand }`）| 別 Brand の Id は型非互換。生成は `crypto.randomUUID()` |
| **`Money`** | `{ amount: 整数(最小通貨単位); currency }` | 浮動小数を使わない。演算は通貨一致時のみ |
| **`Duration`** | 内部ミリ秒の整数 | 非負 |
| **`TimeRange`** | 半開区間 `[start, end)` | `start < end`。隣接（`end == 次の start`）は overlap しない |

- → `packages/shared/src/`（型・等価・生成は shared が正典）

---

## 拡張点（業種固有はここに閉じ込める — 構造として）

業種固有の振る舞いは持ち込まず、以下 4 つの**構造的差し込み口**に閉じる（B-6）。

| # | 拡張点 | 構造 |
|---|---|---|
| 1 | **カスタムフィールド** | `Customer` / `Booking` が `customFields: Map<FieldKey, FieldValue>` を持つ。スキーマ定義は domain 外（delivery / 設定）が注入。domain は値の容れ物のみ |
| 2 | **戦略 interface** | `PricingPolicy`（料金算出）等を domain が **port（interface）**として定義し、業種別実装を delivery が注入。domain は interface に依存（実装を知らない）|
| 3 | **イベント購読** | domain が `DomainEvent` を発行、業種固有の反応は購読側で（`dynamic-model.md`）|
| 4 | **通知テンプレート** | `notification` がテンプレ＋チャネルを data として持つ（業種別文面は data、コードでない）|

---

## 型の所在（model.md の層との整合）

| 型 | 所在パッケージ | 層 |
|---|---|---|
| `Id` / `Money` / `Duration` / `TimeRange` | `packages/shared` | shared-kernel |
| `DomainEvent` / `EventBus`(port) | `packages/shared` | shared-kernel |
| `Booking` / `Resource` / `Service` / `Availability` / `BookingStatus` | `packages/scheduling` | domain |
| `Customer` | `packages/crm` | domain |
| 通知テンプレート / チャネル型 | `packages/notification` | domain |
| Repository port（`BookingRepository` 等） | 各 domain パッケージの `src/port/` | ports |
| Repository 実装（Drizzle）| `packages/db` | adapters/persistence |

---

## 使い方

- **書く**: 状態を変えるコードは集約の API 経由（Booking / Customer）。永続化は domain の port 越し（実装は db）。
- **レビューする**: (1) 集約を経由して状態変更しているか (2) 業種語彙を domain/shared に持ち込んでいないか（B-6）(3) 値オブジェクトの不変条件を破っていないか。
