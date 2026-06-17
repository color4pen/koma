# Request Review Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- The verdict line MUST appear before the Findings table.
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approve | needs-discussion | reject
  - approve:          No blocking findings (no HIGH, no decision-needed). Request is ready for pipeline execution.
  - needs-discussion: One or more blocking findings (HIGH or decision-needed) resolvable through discussion.
  - reject:           Multiple blocking findings AND requirement contradictions or structural breakdown.
- Findings table MUST have exactly 6 columns in this order:
  # | Severity | Category | Location | Description | Recommendation
- Valid Severity values (uppercase): HIGH | MEDIUM | LOW
  - HIGH:   Request-level defect — goal unclear, acceptance criteria absent/untestable, or critical external constraint unspecified
  - MEDIUM: Scope ambiguity, recommended additions
  - LOW:    Clarity improvements, expression refinements
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approve

## Findings

| # | Severity | Category | Location | Description | Recommendation |
|---|----------|----------|----------|-------------|----------------|
| 1 | LOW | 型の明確化 | 要件 3: parseBookingInput | `customerId`/`serviceId`/`resourceId` の戻り値型が plain `string` か `Id<'Customer'>` 等のブランド型かを明示していない。`Id<B>` は branded string（`string & { __brand: B }`）であり、`createBookingUseCase` の `createBooking` 呼び出し時に型不整合が起きる可能性がある。ただし ID はドロップダウン（repo.list() 由来）から来るため値は常に有効 UUID であり、機能的影響は低い。 | 実装者は `parseId<B>` を使って UUID 検証 + ブランド型変換するか、use-case 側で `as Id<B>` キャストする方針を選択する。どちらも許容。 |
| 2 | LOW | 型の明確化 | 要件 3: parseBookingInput | 失敗時の戻り値シグネチャ（`{ ok: false; errors: Record<string, string[]> }` か単に `{ ok: false }` か）が明記されていない。server action で「フィールドエラー」を返すには構造化 errors が必要。 | 既存の `parseCustomerInput`/`parseServiceInput`/`parseResourceInput` と同じ `{ ok: false; errors: Record<string, string[]> }` パターンに揃える。 |
| 3 | LOW | 実装ガイダンス | 要件 6: page.tsx（予約一覧） | Booking 一覧で customer/service/resource の名前を解決する方法（各 repo の `list()` で全件取得して Map を作るか、booking ごとに `findById` を呼ぶか）が指定されていない。どちらの実装も機能するが、実装間でパフォーマンス特性が異なる。 | in-memory 段階では全件 list() + Map による O(n) ルックアップが自然。将来 Drizzle 配線時に join クエリへ置き換える方針を想定しておけば十分。 |

## Validation Summary

コードベース照合の結果をまとめる。

**前提確認（すべて ✅）**

| 前提（request.md §現状コードの前提） | 実在確認 |
|---|---|
| `@koma/scheduling` が `createBooking`/`canAccommodate`/`BookingRepository`/`createInMemoryBookingRepository` を export | `packages/scheduling/src/index.ts` で確認 |
| `@koma/shared` が `createTimeRange` を export | `packages/shared/src/index.ts` で確認 |
| `Service.duration: Duration`（`Duration.milliseconds: number`） | `packages/catalog/src/service.ts` + `packages/shared/src/duration.ts` で確認 |
| `Resource.capacity: number` | `packages/resource/src/resource.ts` で確認 |
| `BookingRepository.findActiveByResource(resourceId)` が `Promise<Booking[]>` を返す | `packages/scheduling/src/port/booking-repository.ts` で確認 |
| `createInMemoryBookingRepository` が `isActive` フィルタ済みの active 予約を返す | `packages/scheduling/src/in-memory-booking-repository.ts` で確認 |
| `composition-root.ts` に `getCustomerRepository`/`getResourceRepository`/`getServiceRepository` がある | `apps/web/lib/composition-root.ts` で確認 |
| `apps/web` に `@koma/scheduling` 依存がない | `apps/web/package.json` で確認 |
| `app/bookings/` ページが未存在 | `apps/web/app/` 配下の glob で確認 |
| `zod/v4/mini` が既存 parse ファイルで使用済み | `apps/web/lib/parse-*.ts` 全ファイルで確認 |

**アーキテクチャ適合性**

- B-5（兄弟コンテキスト非依存）: delivery use-case が `@koma/scheduling`/`@koma/catalog`/`@koma/resource` を束ねるパターンは適切。ドメイン同士は互いを import しない ✅
- B-1/B-2/B-3: `zod/mini` を delivery 境界のみ使用、domain には drizzle-orm 非導入、domain には next/react 非導入 ✅
- `canAccommodate` の呼び出しが `findActiveByResource` 後の already-filtered リストを渡す設計は `can-accommodate.ts` の jsdoc コメント前提と一致 ✅
- `createBooking` は `pending` ステータスで開始（`booking.ts` 実装と一致） ✅

**テスト仕様の実現可能性**

`createBookingUseCase` の全テストシナリオ（capacity=1 で重なる2件目 no-capacity、隣接時刻 ok、capacity=2 で3件目 no-capacity、service/resource 不在）は `canAccommodate` の実装（スイープライン方式）と `isActive` フィルタリングで正確に実現可能 ✅
