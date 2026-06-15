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
| 1 | LOW | Spec completeness | spec.md / tasks.md | `isEqualDailyTimeRange` が tasks.md (T-01, T-02) で定義・export・テスト対象とされているが、spec.md には対応する Requirement / Scenario が存在しない。実装・テストの根拠が tasks にのみある。 | spec.md に `isEqualDailyTimeRange` の Requirement を 1 件追加するか、tasks から export を外して `dailyTimeRangeOverlaps` と対称性を保つ形にする。いずれにせよ動作上は `a.open === b.open && a.close === b.close` の自明な等価判定であり、既存の `isEqualTimeRange` パターンに沿うため実装への影響はない。 |
| 2 | LOW | Type safety | tasks.md (T-03) | `createAvailability` の引数 `exceptions?: Record<string, DailyTimeRange[]>` は任意の string をキーとして受け付ける。`YYYY-MM-DD` 形式でないキー（例: `'invalid'` / `'2026/06/16'`）を渡しても構築時にエラーにならない。`dailyHoursOn` 呼び出し時に NaN ガードはあるが、永続化や UI 経由でキー形式が崩れた Availability が生成されうる。 | 構築時に例外キーの形式を `/^\d{4}-\d{2}-\d{2}$/` 等で検証して throw するか、型を branded string `IsoDate = string & { __brand: 'IsoDate' }` にして呼び出し側に検証責任を明示することを tasks.md に追記する。禁止依存（zod 等）を使わず正規表現で実装可能。 |
| 3 | LOW | Implementation clarity | tasks.md (T-03) | `Object.freeze` の適用範囲が「Map 内の配列も frozen」と記述されているが、`Object.freeze(availability)` は shallow freeze であり、Map オブジェクト自体および Map が保持する配列は凍結されない。TypeScript の `readonly` / `ReadonlyMap` はコンパイル時のみの制約であるため、ランタイム immutability を保証するには各配列を個別に `Object.freeze` する必要がある。 | tasks.md に「`weeklyHours` / `exceptions` の各 `DailyTimeRange[]` を `Object.freeze` し、さらに Map 自体も `Object.freeze` する」手順を明示する。または実装ガイドとして design.md の D4 に追記する。 |

## Review Notes

### 仕様の内部整合性

- **request.md → design.md → tasks.md → spec.md** の 4 文書を横断確認した結果、要件・設計判断・タスク分解・BDD シナリオはすべて一貫している。
- `DailyTimeRange`（分 from midnight、半開区間 `[open, close)`、不変条件 `0 <= open < close <= 1440`）と `TimeRange`（epoch ms、shared-kernel）を別型とする判断が全文書で統一されている。
- 例外日の空配列＝休業の表現は request → design (D4) → spec.md (Requirement §4) → tasks (T-03 AC, T-05) まで一貫して伝播している。
- 未登録曜日の `dailyHoursOn` 戻り値（`[]`）は request-review で指摘された曖昧点であり、design.md D5・tasks.md T-04・spec.md のシナリオ「週次稼働が未設定の曜日は空配列を返す」で明確に解消されている。

### アーキテクチャ整合

- `DailyTimeRange` を `packages/resource` 内に閉じる決定（design.md D1）は `domain-model.md` §Policy の Availability の所在（resource コンテキスト）と一致する。shared-kernel への不要な昇格を避け、B-4（shared は最下層）を守る。
- `packages/resource/package.json` に禁止依存（`next` / `react` / `drizzle-orm` / `zod`）が存在しないことを確認。本変更は外部依存を追加しない。
- `Date.getUTCDay()` を使った tz 非依存の曜日導出（design.md D3, D5）は `model.md` の「TimeRange は絶対値のみ、表示 tz は配信」方針に整合し、domain 層が tz を保持しないことを保つ。
- 既存ファイル（`resource.ts` / `port/` / `in-memory-resource-repository.ts`）は変更対象外。影響範囲が最小限で後退リスクがない。

### テスト可能性

- spec.md の全シナリオが入力 → 期待出力の形式で記述されており、vitest でそのまま実装できる。
- `dailyHoursOn` の曜日導出テストに `2026-06-14`（日）〜`2026-06-20`（土）の 7 日間を網羅しており、曜日の総当たり確認が可能。現在日付（2026-06-16 = 火曜）との整合性も取れている。
- `createDailyTimeRange` の境界値（`0`, `1440`, `open === close`, `open > close`, 非整数）がすべて AC に列挙されており、見落としがない。

### セキュリティ評価

本変更は配信層・API・永続化を一切持たない純粋 TS ドメインライブラリの追加であり、OWASP Top 10 の攻撃ベクタは適用外。

- **入力検証**: ファクトリ関数（`createDailyTimeRange` / `createAvailability`）が不正入力を throw で拒否する設計。バリデーションを呼び出し側に委ねていない。
- **Immutability**: `Object.freeze` を適用（Finding #3 参照: 深さに注意が必要だが LOW）。
- **Prototype pollution**: `Object.freeze` によりプロトタイプ汚染経路がない。`Record<string, ...>` への `__proto__` キー挿入を懸念する場合は Finding #2 の検証で同時に対応可能。
- **型安全**: `Weekday` が数値リテラル union のため不正な曜日（例: `7`）を型エラーで排除できる。

### 実装上の留意点（Finding 外・情報提供）

- `new Date(date + 'T00:00:00Z').getUTCDay()` は `YYYY-MM-DD` 形式以外（例: `'2026/06/16'`, `'20260616'`）でも `Invalid Date` を返さない場合がある（`'20260616T00:00:00Z'` は NaN になるが `'2026-06-16T00:00:00Z'` + `'T00:00:00Z'` は二重 T で NaN になる）。Finding #2 で示した形式バリデーションを追加することで、日付文字列の曖昧さを排除できる。
- `createAvailability` が `weeklyHours` を Map に格納する際、未指定曜日を「空配列＝休業」として初期化するか、Map のエントリ不在として扱うかで `dailyHoursOn` の参照コードが変わる。tasks.md T-04 では「週次稼働も未設定の曜日 → `[]` を返す」とあるため、Map.get() の `undefined` を `[]` として返せばよく、初期化は不要。実装者への伝達として補足する。
