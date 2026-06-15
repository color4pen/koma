# Dynamic Model — 動的構造（実行時の関係・束縛・状態遷移）

> `domain-model.md`（静的なデータの形）の対になる **実行時の構造**。状態機械・モジュール間束縛・遷移の「形」を定義する。
> **structure-only**: 状態・遷移・束縛の **形と寿命** を書く。それを駆動する **アルゴリズム/手順は behavior**（spec）であり、ここからは参照に留める。
> **SoT 境界**: 正確な遷移ロジックはコードが正典。本書は陳腐化しない粒度（状態集合・許可遷移・束縛の寿命・不変条件）まで。

---

## State machines

### BookingStatus 状態機械（予約の lifecycle）
- **状態集合（5 値）**: `pending | confirmed | cancelled | completed | no-show`。
- **区分**: active（枠を占有する）= {`pending`, `confirmed`} ／ terminal（出口・枠を解放）= {`cancelled`, `completed`, `no-show`}。
- **許可遷移**: 下表のセルのみ許可。表に無い遷移は不正（同一状態への遷移は noop）。

  | from \ to | pending | confirmed | cancelled | completed | no-show |
  |---|:--:|:--:|:--:|:--:|:--:|
  | **pending** | — | ✓ | ✓ |  |  |
  | **confirmed** |  | — | ✓ | ✓ | ✓ |
  | **cancelled** |  |  | — |  |  |
  | **completed** |  |  |  | — |  |
  | **no-show** |  |  |  |  | — |

- **不変条件**:
  - 状態変更は **Booking 集約の API 経由のみ**（`domain-model.md` の整合性境界）。直書きしない。
  - **二重予約不変条件は active 状態についてのみ成立する**: 枠（`TimeRange`）を占有するのは active = {`pending`, `confirmed`} の Booking。terminal に落ちた Booking は同一 Resource の枠を解放する（＝以後その枠は空き）。
  - terminal は出口（以後どこへも遷移しない）。
- → `packages/scheduling/src/`（許可遷移が正典）。遷移を起こす条件・手順は behavior（spec）。

---

## モジュール間束縛（inter-module bindings）

### Domain event seam — モジュールを疎結合に繋ぐ束縛
- **束縛**: domain（scheduling / crm / notification）は互いを直接 import しない（`model.md` B-5）。連携は `shared` が契約を定義する **`DomainEvent` ＋ `EventBus`(port)** を介する。発行側は event を publish し、購読側が subscribe する。
- **寿命**: event は「起きた事実」。発行時点で確定し、購読側の反応はそれぞれの module に属する（発行側は購読側を知らない）。
- **binder**: `EventBus`(port) の契約は `shared`、実装（同期/非同期・配送）は delivery（`apps/web`）が注入する composition point。domain は port interface のみに依存する。
- **不変条件**: 発行側（例: scheduling）は購読側（例: notification）の存在・処理を前提にしない。購読の有無で発行側の不変条件は変わらない。業種固有の反応は購読側＝拡張点 3（`domain-model.md`）。
- → `packages/shared/src/`（`DomainEvent` / `EventBus` 契約）。どの event にどう反応するか（リマインド予約等）は購読側の behavior（spec）。

### 永続化束縛 — domain ↔ port ↔ adapter
- **束縛**: domain は自分が要求する I/O を `port`（Repository interface 等）として定義し、`db`（adapter）がそれを実装する。実装の選択・注入は delivery（composition root）で行う。
- **寿命**: 実装は実行時に注入され、domain は interface のみを保持する（実装を import しない＝`model.md` B-2）。
- **不変条件**: domain は具象 DB / ORM を知らない。ORM・スキーマの差し替えは adapter（db）＋ composition 配線に閉じる。
- → port は各 domain パッケージの `src/port/`、実装は `packages/db`。解決・トランザクション境界の手順は behavior（spec）。

---

## 使い方
- **状態遷移を読む** → BookingStatus 状態機械（active が枠を占有・terminal が解放）。
- **モジュール連携を読む** → Domain event seam（発行↔購読の束縛）／ 永続化束縛（domain↔port↔adapter）。
- 静的な型/集約は `domain-model.md`、層・依存は `model.md`。
