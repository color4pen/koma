# Code Review Feedback — iteration 001

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- iteration line format (exact): `- **iteration**: NNN` (3-digit zero-padded integer)
- Findings table MUST have exactly 7 columns in this order:
  # | Severity | Category | File | Description | How to Fix | Fix
  - Fix column: yes = fixer should address this finding; no = skip (pre-existing / out-of-scope)
- Scores table columns: Category | Score | Weight
  - Valid Category values: correctness | security | architecture | performance | maintainability | testing
  - Score: integer 1-10
  - Weight: decimal as defined below
- total line format (exact): `- **total**: <decimal>`
- Default weights: correctness=0.30, security=0.25, architecture=0.15, performance=0.10, maintainability=0.10, testing=0.10
- Scores table is optional but recommended.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | low | architecture | packages/scheduling/src/booking-status.ts | `ALLOWED_TRANSITIONS` は `Map<BookingStatus, ReadonlySet<BookingStatus>>` で公開されているが、`Map` は mutable なため外部コードが `.set()` / `.delete()` で遷移表を書き換えられる。状態機械の整合性保護を型レベルでも担保していない。 | 型を `ReadonlyMap<BookingStatus, ReadonlySet<BookingStatus>>` に変更する。`new Map([...])` の代入は `ReadonlyMap` に型付けできる（TypeScript 標準ライブラリに存在）。 | yes |
| 2 | low | maintainability | packages/scheduling/src/booking.ts | `transitionBooking` 内の `return Object.freeze({ ...booking, status: to, customFields: booking.customFields })` で、スプレッド `...booking` が既に `customFields` を含むにもかかわらず `customFields: booking.customFields` を明示的に再代入している（冗長）。 | `customFields: booking.customFields` の行を削除する。スプレッドで引き継がれた frozen `customFields` がそのまま使われるため動作は変わらない。 | yes |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 10 | 0.30 |
| security | 9 | 0.25 |
| architecture | 9 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 10 | 0.10 |

- **total**: 9.50

## Summary

実装は要件・設計・受け入れ基準をすべて満たしている。54 件の自動テスト（booking-status: 12、booking: 22、can-accommodate: 9、in-memory-repository: 11）が green、typecheck / lint / build も全フェーズ通過済み（verification-result.md 参照）。

### 正確性

- **BookingStatus 状態機械**: `ALLOWED_TRANSITIONS` を `Map<BookingStatus, ReadonlySet<BookingStatus>>` のデータとして定義し、`transitionBooking` が参照する設計が正しく実装されている。許可遷移 5 ケース（TC-001〜005）・不正遷移 2 ケース（TC-006〜007）・terminal からの全遷移拒否（TC-008、TC-046）・同一状態遷移拒否（TC-009）を網羅。
- **canAccommodate スイープライン**: `slot` と重なる既存予約のみを対象にした後、`[start, end)` イベントをソート（同時刻は `-1` 先行）してピーク算出し `+ 1 ≤ capacity` を判定する実装は数学的に正確。重なる既存予約はすべて `proposed.slot.start` 以前に開始かつ `proposed.slot.start` 以降に終了することが保証されるため、sweep line のピークが必ず提案スロット内でも再現される。TC-018〜023 の真理値表（隣接半開区間・capacity=1/2/3 ケース）をすべて網羅。
- **immutability**: `createBooking` / `restoreBooking` / `transitionBooking` の三経路で `Object.freeze` が適用されており、元インスタンス非破壊を TC-016・TC-039・TC-041 で固定。

### 設計準拠

- B-5 遵守: `@koma/scheduling` は `@koma/shared` のみに依存し、兄弟コンテキスト（crm / resource / catalog）を import しない。
- 禁止依存（next / react / drizzle-orm / zod）なし。
- `BookingRepository` port が `save` / `findById` / `list` / `findActiveByResource` の 4 メソッドを定義（TC-045）。
- `restoreBooking` による任意 status 生成は設計上の意図的選択（D7）。

### 指摘事項

- **Finding 1**（low）: `ALLOWED_TRANSITIONS` が mutable `Map` として公開されており、外部コードが遷移表を改変できる。型を `ReadonlyMap<BookingStatus, ReadonlySet<BookingStatus>>` に変更することで型レベルの保護が加わる。runtime / test への影響はなく、型安全性の改善。
- **Finding 2**（low）: `transitionBooking` のスプレッド後の `customFields: booking.customFields` は冗長。削除しても動作不変。

いずれも critical / high には該当せず、**approved** とする。
