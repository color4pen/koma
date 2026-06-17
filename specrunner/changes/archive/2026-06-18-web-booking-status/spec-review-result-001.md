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
| 1 | MEDIUM | Spec Completeness | spec.md / tasks.md | `BookingStatusActions`（T-05）がアクション失敗時（`{ ok: false }`）の UI 挙動を未定義。`booking-form.tsx` は `useActionState` でエラーを捕捉し `errors._form` を inline 表示しているが、T-05 は `useTransition`/`useState` のみ言及し、エラー表示を省略している。二段防御により実運用での失敗頻度は低いが、サイレントフェイルはデバッグを困難にする。 | T-05 に「`{ ok: false }` 時は `errors._form[0]` を inline 表示する」か「エラーは page revalidate で既存一覧がリフレッシュされれば十分」かを明記する。`useActionState` パターン（`booking-form.tsx` 準拠）が既存コードとの整合性が高い。 |
| 2 | LOW | Spec Completeness | spec.md | `transitionLabel` シナリオが `confirmed`/`cancelled`/`completed`/`no-show` のみ。T-06 は `transitionLabel(booking.status)` で現在ステータスを日本語表示するため `pending → '保留'` も必要だが、spec.md のシナリオに含まれない（T-01 には記載あり）。 | spec.md の `transitionLabel` シナリオに `pending → '保留'` ケースを追記する。 |
| 3 | LOW | Security | tasks.md (T-03) | `transitionBookingAction` に `toStatus` のランタイム入力検証がない。TypeScript の型（`BookingStatus`）は compile-time のみ有効で、HTTP 経由では任意文字列が到達しうる。`transitionBooking` が安全に throw → catch → エラー応答するため動作は安全だが、許可リスト検証（`ALLOWED_TRANSITIONS.has(toStatus as BookingStatus)` 等）が defense-in-depth として望ましい。 | T-03 の実装ステップに「`toStatus` が有効な `BookingStatus` 値かを事前チェックし、不正値はエラー応答を返す」を追記する。優先度は低く、future-proof 対応で可。 |
| 4 | LOW | Security | request.md | 認証・認可がスコープ外と明示されており、現状 `transitionBookingAction` は誰でも呼べる。ポートフォリオの開発段階では許容されるが、将来の Drizzle 配線時に認証ガードが必要。 | Drizzle 配線時の別 request で認証ガードを実装することを推奨。現 request のスコープ外として妥当。 |

## Review Summary

### コードベース整合確認

| 確認項目 | 結果 |
|----------|------|
| `ALLOWED_TRANSITIONS`：`pending→{confirmed,cancelled}`、`confirmed→{cancelled,completed,no-show}`、terminal→∅ | ✓ `booking-status.ts` と一致 |
| `transitionBooking(booking, to)`：不正遷移で throw、許可なら新 `Booking` を返す | ✓ `booking.ts` L56-68 と一致 |
| `BookingRepository`：`findById(id)` / `save(booking)` を持つ | ✓ `port/booking-repository.ts` と一致 |
| `getBookingRepository()` が composition root から取得可能 | ✓ `composition-root.ts` と一致 |
| 既存テストの mock 構成：`vi.mock('next/cache')` + `vi.mock('@/lib/composition-root')` | ✓ `actions.test.ts` と一致、T-04 の共有前提が正確 |
| `@koma/scheduling` index が `transitionBooking` / `ALLOWED_TRANSITIONS` / `isTerminal` / `BookingStatus` を export | ✓ `index.ts` と一致 |
| `ActionState` 型が `actions.ts` に定義済みで再利用可能 | ✓ L15-17、D5 の判断が正確 |
| `apps/web/lib/` ディレクトリが存在し、純関数配置先として適切 | ✓ 既存 `parse-*.ts` の配置パターンと整合 |

### 設計評価

- **D1 `allowedTransitions` 純関数分離**: `ALLOWED_TRANSITIONS` を単一の真実源とする設計は正しい。`Array.from(set)` での変換が必要な点も design.md Risk 欄で明示済み。順序は Set 挿入順で安定しており spec の期待値（`['confirmed', 'cancelled']` 等）と一致する。
- **D2 薄い server action**: `createBookingAction` が `createBookingUseCase` を経由するのは `canAccommodate`（集約横断検証）があるためであり、遷移操作は単一集約内で完結するため use-case 層なしの判断は妥当。
- **D3 client component 分離**: server component と client component の関心分離が適切。`page.tsx` はデータ取得専念、ボタン操作は `BookingStatusActions` に封じ込める。
- **D4 二段防御**: UI 制御（`allowedTransitions` によるボタン表示制御）とドメインガード（`transitionBooking` の throw）の組み合わせは、API 直叩きによる不正遷移を構造的に防ぐ。
- **タスク網羅性**: T-01〜T-07 が要件 1〜4 および受け入れ基準と過不足なく対応。T-02 のテスト範囲（`pending`/`confirmed`/各 terminal）と T-04 のテスト範囲（許可遷移/不正遷移/不在 ID/revalidatePath）が受け入れ基準と一対一対応している。

### 総評

CRITICAL/HIGH 相当の問題はなし。前提コードベースとの整合が取れており、設計判断・タスク分解・受け入れ基準いずれも具体的かつ実装可能。MEDIUM 1 件（エラー表示の未定義）は UX 品質に関わるが、二段防御によりエラーパスの出現頻度は極めて低く、実装フェーズで implementer が `booking-form.tsx` パターンを参照すれば自然に解決できる範囲。LOW 3 件はいずれも実装ブロッカーではない。
