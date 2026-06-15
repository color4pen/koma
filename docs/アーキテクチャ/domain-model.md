# Domain Model — 型/データモデル（Logical View / tactical DDD）

> `model.md`（層・依存）の下の粒度で、**業務データの「形」と「不変条件」**を定義する。業種中立・**単一テナント**。
> **SoT 境界**: 正確なフィールドはコードが正典（各パッケージの `src/`）。本書は集約境界・値オブジェクト・常に保つ制約・型の所在まで。
> 「常に保つ形」は structure（ここ）、「制約を強制するロジック」は behavior（spec / 歯）。

---

## コンテキスト分類（bounded contexts）

| 分類 | コンテキスト | 集約 | パッケージ |
|---|---|---|---|
| **core** | scheduling | `Booking` | `packages/scheduling` |
| supporting | crm | `Customer` | `packages/crm` |
| supporting | resource | `Resource` | `packages/resource` |
| supporting | catalog | `Service` | `packages/catalog` |
| generic | iam | `User`（Role / Permission）| `packages/iam` |
| generic | notification | テンプレ / チャネル | `packages/notification` |
| generic | audit | 監査ログ | `packages/audit` |
| generic | reporting | read model | `packages/reporting` |

- **単一テナント**: いずれの集約も `tenantId` を持たない（単一店舗）。マルチテナント化は `Organization` を上流に足す将来の移行で対応する。
- **`User` ≠ `Resource`**: ログイン identity（`User`@iam）と予約資源（`Resource`@resource）は別概念。同一人物に対応しても別集約（退職時の無効化と資源としての履歴は別問題）。
- 兄弟コンテキストは相互に import しない。連携は shared のイベント契約か delivery の composition 経由（`model.md` B-5）。

---

## Aggregate（整合性境界）

### Booking — 1 予約（scheduling）— core
- **役割**: 顧客 × サービス × リソース × 時間枠 × ステータスの 1 予約。状態変更は **Booking 集約の API 経由のみ**（patch / 直書きしない）。
- **identity**: `Id<'Booking'>`。
- **構成（参照は id で持つ）**: `customerId` / `serviceId` / `resourceId` / `slot: TimeRange` / `status: BookingStatus`（`dynamic-model.md`）/ `customFields`（拡張点）。
- **不変条件**:
  - `slot` の長さは `Service` の所要 `Duration` に一致する（または下限として満たす）。
  - **二重予約不変条件（capacity-aware）**: 同一 `Resource` について、枠を占有する状態（active、`dynamic-model.md`）の Booking のうち、**任意の時刻で overlap する数が `Resource.capacity` を超えない**。`capacity = 1` なら「相互に overlap しない」（1:1）と等価。これは単一 Booking では閉じない整合性で、scheduling の予約ユースケースが port（Repository）の排他＋ DB 制約で守る（強制手順は behavior）。
- → `packages/scheduling/src/`

### Customer — 顧客台帳（crm）— supporting
- **identity**: `Id<'Customer'>`。連絡先（`ContactInfo`、≥1 必須）・タグ・メモ・`customFields`。immutable 更新。
- → `packages/crm/src/`

### Resource — 予約枠の主体（resource）— supporting
- **役割**: 予約を受ける枠の主体。人 / 席 / 部屋 / 機材を抽象化する（「スタッフ」と名付けない＝B-6）。
- **identity**: `Id<'Resource'>`。
- **構成**: 種別タグ / **`capacity`（同時に受けられる予約数・正整数・既定 1）** / 稼働ルール（`Availability`）。
- **不変条件**: `capacity ≥ 1`。
- → `packages/resource/src/`

### Service — 提供メニュー（catalog）— supporting
- **identity**: `Id<'Service'>`。所要 `Duration` / 料金 `Money` / 対応する `Resource` 種別。
- → `packages/catalog/src/`

> `User` / Role / Permission（iam）は認証・認可の集約（ログイン identity）。`Resource` とは別概念（後続 request で詳細）。

---

## Policy / 値オブジェクト（集約内・周辺）

| 概念 | 役割 | 所在 |
|---|---|---|
| **Availability** | 営業時間・休業・例外。空き枠導出の元データ | resource（`Resource` の稼働ルール）|
| **ContactInfo** | 顧客の連絡先（電話 / メール、≥1 必須）| crm |

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
| 1 | **カスタムフィールド** | `Customer` / `Booking` が `customFields`（キー → 値の容れ物）を持つ。スキーマ定義は domain 外（delivery / 設定）が注入 |
| 2 | **戦略 interface** | `PricingPolicy`（料金算出）等を domain が **port（interface）**として定義し、業種別実装を delivery が注入 |
| 3 | **イベント購読** | domain が `DomainEvent` を発行、業種固有の反応は購読側で（`dynamic-model.md`）|
| 4 | **通知テンプレート** | `notification` がテンプレ＋チャネルを data として持つ |

---

## 型の所在（model.md の層との整合）

| 型 | 所在パッケージ | 層 |
|---|---|---|
| `Id` / `Money` / `Duration` / `TimeRange` / `DomainEvent` / `EventBus`(port) | `packages/shared` | shared-kernel |
| `Booking` / `BookingStatus` | `packages/scheduling` | domain |
| `Customer` / `ContactInfo` | `packages/crm` | domain |
| `Resource` / `Availability` | `packages/resource` | domain |
| `Service` | `packages/catalog` | domain |
| `User` / Role / Permission | `packages/iam` | domain |
| 通知テンプレート / チャネル型 | `packages/notification` | domain |
| 監査ログ型 | `packages/audit` | domain |
| read model | `packages/reporting` | domain |
| Repository port（`BookingRepository` 等） | 各 domain パッケージの `src/port/` | ports |
| Repository 実装（Drizzle）| `packages/db` | adapters/persistence |

---

## 使い方

- **書く**: 状態を変えるコードは集約の API 経由。永続化は domain の port 越し（実装は db）。
- **レビューする**: (1) 集約を経由して状態変更しているか (2) 業種語彙を domain/shared に持ち込んでいないか（B-6）(3) 値オブジェクトの不変条件を破っていないか (4) 兄弟コンテキストを直接 import していないか（B-5）。
