# Spec Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:    specification is complete, consistent, and ready for implementation
  - needs-fix:   specification has issues that must be resolved before implementation
  - escalation:  unresolvable conflicts, missing context, or requires human judgment
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | File | Description | How to Fix
- Valid Severity values (uppercase): CRITICAL | HIGH | MEDIUM | LOW
  - CRITICAL: production outage, data loss, security breach
  - HIGH:     functional failure, clear bug, no workaround — blocks approval
  - MEDIUM:   quality degradation, maintainability issue, future risk
  - LOW:      informational, style, minor improvement
- If no findings, write a table row with "None" or omit the table body.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | MEDIUM | Security / Input Validation | `tasks.md` T-05 / `spec.md` | `createBookingUseCase` は `serviceId`・`resourceId` をリポジトリで存在確認するが、`customerId` の存在確認を行わない。`CreateBookingDeps` に `customerRepo` が含まれず、spec.md にも該当 Requirement がない。フォームのドロップダウンが有効 ID のみを提示するため通常は問題ないが、直接 POST を craft すれば任意の `customerId` で予約が作成される。現在は in-memory かつ未認証のためリスクは低いが、Drizzle 配線時に参照整合性違反（外部キー制約エラー）が顕在化しうる。 | 現スライスでは「認証・参照整合性は後続スライス対応」として許容し、設計の `Risks / Trade-offs` 欄に明記する（design.md はリスク欄を持つが本点は未記載）。後続の Drizzle・認証スライスで `customerId` 存在確認 or 外部キー制約を追加する。 |
| 2 | LOW | Type Safety | `tasks.md` T-07 | `parseBookingInput` の戻り型の `id` フィールド群が `string` であるため、server action が `as Id<'Customer'>` / `as Id<'Service'>` / `as Id<'Resource'>` キャストを行う必要がある。ドロップダウン由来で実行時は常に有効だが、型安全性が弱い。（request-review でも LOW として記録済み） | 実装者は `as Id<B>` キャストか `parseId<B>` による変換かを選択する。どちらも許容。既存パターンとして `as` キャストが最小変更となる。 |
| 3 | LOW | Security (TOCTOU) | `design.md` Risks / `tasks.md` T-05 | `findActiveByResource` → `canAccommodate` → `save` の間に race window があり、同時リクエストが同じ空き枠に予約できる可能性がある。design.md の Risks 欄に「単一プロセス in-memory では顕在化しない」として記載済みで Mitigation（Drizzle 配線時の DB トランザクション）も規定されている。 | 設計文書に既記載のため現スライスでは許容。Drizzle スライスで楽観ロックまたは DB トランザクションを追加する。 |

## Validation Summary

### アーキテクチャ適合性（全件 ✅）

| チェック項目 | 結果 |
|---|---|
| B-5: delivery use-case が 3 コンテキスト（catalog/resource/scheduling）を束ねる。ドメイン同士は互いを import しない | ✅ |
| B-1: domain・shared は `next`/`react` を import しない。`@koma/scheduling` は純粋 TS | ✅ |
| B-2: `drizzle-orm` が `apps/web/package.json` に含まれないよう明示禁止 | ✅ |
| B-3: `zod/v4/mini` を delivery 境界（`parseBookingInput`）のみで使用 | ✅ |
| composition root の `globalThis` lazy singleton パターンを既存 3 getter と同一パターンで踏襲 | ✅ |

### spec.md ↔ tasks.md 整合性

| spec.md Requirement | 対応タスク | 整合性 |
|---|---|---|
| `parseBookingInput` の有効入力・各 ID 空・startAt 不正 | T-03, T-04 | ✅ |
| `createBookingUseCase` の全シナリオ（service/resource not-found、capacity=1 拒否、隣接 ok、capacity=2） | T-05, T-06 | ✅ |
| `createBookingAction` の parse 失敗・成功・capacity 不足 | T-07, T-08 | ✅ |
| `page.tsx` の 0 件表示・一覧テーブル | T-09, T-10 | ✅ |
| composition root 単一生成 | T-02 | ✅ |

### ドメイン型・実装整合性確認

| 確認事項 | 結果 |
|---|---|
| `Duration.milliseconds: number` プロパティが存在する（`packages/shared/src/duration.ts`） | ✅ |
| `canAccommodate(existingActive, slot, capacity)` シグネチャ（`packages/scheduling/src/can-accommodate.ts`） | ✅ |
| `BookingRepository.findActiveByResource` が `Promise<Booking[]>` かつ `isActive` フィルタ済み | ✅ |
| `ServiceRepository.findById` / `ResourceRepository.findById` が `Promise<Entity \| null>`（use-case は async 必要） | ✅ |
| `createTimeRange(start, end)` が `start < end` を前提とし、`Service.duration.milliseconds > 0` が工場で保証される | ✅ |
| `overlaps` が半開区間（`a.start < b.end && b.start < a.end`）で隣接を重なりなしと判定 → 隣接シナリオが `ok: true` になることを確認 | ✅ |
| spec.md capacity=2 シナリオのスイープライン挙動: 2 件 maxConcurrent=2、+1=3 > 2 → no-capacity ✅ | ✅ |

### テスト仕様の実現可能性

`createBookingUseCase` の全テストシナリオ（capacity=1 重複拒否・隣接 ok・capacity=2 境界・not-found 系）は `canAccommodate` のスイープライン実装と `isActive` フィルタにより正確に再現可能。in-memory repo 注入で副作用なしユニットテストが成立する。✅
