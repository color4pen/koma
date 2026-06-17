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
| 1 | MEDIUM | Algorithm correctness | design.md | `step.milliseconds = 0` 無限ループリスク。`@koma/shared` の `ofMilliseconds(0)` は非負整数チェックを通過するため、`Duration = { milliseconds: 0 }` が合法な値として生成できる。設計アルゴリズムでは `cursor += effectiveStep.milliseconds` のため step = 0 だとカーソルが進まず while ループが無限に回る。`createTimeRange` の `start < end` ガードが機能するのは `duration.milliseconds = 0` のときだけであり、`step = 0 && duration > 0` の組み合わせでは確実に無限ループになる。T-01 の実装者がこの前提条件を知らなければバグを埋め込む。 | design.md の Algorithm セクションに「前提条件: `duration.milliseconds > 0` かつ `effectiveStep.milliseconds > 0`」を明記する。または T-01 の実装指示に `if (effectiveStep.milliseconds <= 0) return [];` のガード追加を指示する。どちらでも実装者が正しく対処できる。 |
| 2 | LOW | Spec completeness | spec.md | `openWindows = []`（空配列）の振る舞いが spec.md に記述されていない。tasks.md T-03 はテストケースとして追加しているが、spec（振る舞い権威）に対応する Requirement / Scenario がない。アルゴリズム上は自明だが、spec が authority であれば明示的な記述が望ましい。 | spec.md の末尾（または「窓に収まらない末尾候補は出力しない」要件の Scenario として）「`openWindows = []` の場合は空配列を返す」Scenario を追記する。 |

## Summary

### 検証した成果物

- `specrunner/changes/available-slots/spec.md`
- `specrunner/changes/available-slots/design.md`
- `specrunner/changes/available-slots/tasks.md`
- `specrunner/changes/available-slots/request.md`（参照）
- `packages/scheduling/src/can-accommodate.ts`、`src/booking.ts`、`src/index.ts`（コードベース照合）
- `packages/shared/src/duration.ts`、`packages/shared/src/time-range.ts`（型契約照合）

### セキュリティレビュー

本変更は純関数（I/O なし・ネットワークなし・DB アクセスなし）の追加であり、OWASP Top 10 の適用対象外。認証・認可・入力検証（境界）・インジェクション・永続化に関与しない。セキュリティ上の問題はなし。

### 形式適合性（rules.md）

- spec.md: `### Requirement:` ヘッダーあり ✓ / 各 Requirement に `#### Scenario:` あり ✓ / `SHALL` normative keyword あり ✓
- design.md: Goals / Decisions / Algorithm / Risks を網羅 ✓
- tasks.md: T-01〜T-04 で実装・export・テスト・検証を分割カバー ✓

### 設計整合性

- **B-5（兄弟コンテキスト非依存）**: `availableSlots` は `Availability`（resource コンテキスト）を import せず、絶対 `TimeRange` を受け取る設計 ✓
- **禁止依存**: `next` / `react` / `drizzle-orm` / `zod` は取り込まない ✓
- **`canAccommodate` 再利用**: capacity 判定の一元化 ✓。重複実装なし ✓
- **D5 ソート**: `openWindows.slice().sort()` で元配列を変更せず start 昇順処理 → 出力は自然に昇順 ✓

### spec.md ↔ tasks.md シナリオ対応

spec.md の全 12 シナリオが tasks.md T-03 のテストケースに対応している:

| spec.md シナリオ | tasks.md カバレッジ |
|---|---|
| capacity=1, 既存なし → 全枠 | step 既定 back-to-back テスト（[0,180)/60 で 3 枠）で等価カバー |
| capacity=1, 全枠塞がり → 空 | capacity 一杯テスト（[0,120)+[0,120)1件 → 空） ✓ |
| capacity=1, 部分塞がり → 空き枠のみ | capacity 一杯テスト（[0,180)+[0,60)1件 → [60,120),[120,180)） ✓ |
| step 省略 back-to-back | step 省略テスト ✓ |
| step=30 刻み | step 指定テスト ✓ |
| duration 超過 → 末尾除外 | 窓収まらない末尾テスト ✓ |
| 窓幅 < duration → 空 | 窓収まらない末尾テスト ✓ |
| 2窓ギャップ → またぎなし | 開窓またぎ防止テスト ✓ |
| capacity=2, 1件重なり → 通過 | capacity-aware テスト ✓ |
| capacity=2, 2件重なり → 除外 | capacity-aware テスト ✓ |
| 逆順開窓 → start 昇順出力 | 出力昇順テスト ✓ |
| 純関数: 同一入力 → 同一出力 | 純関数テスト ✓ |

tasks.md には spec.md 未記載の追加テスト（`openWindows = []`）も含まれており、Finding #2 との整合で spec 側の補完が推奨される。

### 結論

HIGH/CRITICAL 相当の欠陥なし。Finding #1（step=0 無限ループ）は design.md に前提条件を 1 行追記することで解消できるが、実装者への影響を考慮し MEDIUM と評価した。仕様・設計・タスク全体の整合性は高く、このまま実装フェーズに進めることができる。
