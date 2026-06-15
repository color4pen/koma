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
| 1 | LOW | Spec Coverage | spec.md | `list()` の「空状態で空配列を返す」シナリオが spec.md に存在しない。tasks.md T-06 では実装されているが、spec.md との対応が取れていない。機能欠陥ではなく仕様書の網羅性の問題。 | 実装時に tasks.md の当該ケースをそのまま実装すれば問題なし。次回以降の spec.md 作成時は Repository 契約の「初期状態」シナリオを明記することを推奨。 |

## Review Notes

### 前提確認（コードベース照合）

- `packages/shared/src/duration.ts`: `Duration = { readonly milliseconds: number }` / `ofMilliseconds` は `ms < 0` で throw（非負保証）— tasks.md の `duration.milliseconds <= 0` ガードが 0 を追加で弾く設計と一致。
- `packages/shared/src/money.ts`: `Money = { readonly amount: number; readonly currency: Currency }` / `createMoney` は整数チェックのみで負を許容 — design.md D3 の `price.amount >= 0` ガードが必要な理由として正確。
- `packages/resource/src/`: ファイル構造・エクスポートパターン・テスト構成・`Object.freeze`・`updateResource` の `createResource` 委譲パターン — すべて request.md の「踏襲」記述と一致。

### design.md 評価

- **D1（ファイル構造踏襲）**: `packages/resource` と完全に対応するファイル構成。Alternatives considered の記述も適切。
- **D2（duration 正ガード）**: `Duration` の責務（非負）と `Service` の業務制約（正）を分離する根拠が明快。`PositiveDuration` 追加案の却下理由も妥当。
- **D3（price 非負ガード）**: request-review MEDIUM 指摘への対応として設計決定に格上げ。`Money` を汎用値オブジェクトとして保つ判断は一貫している（`subtractMoney` が負を生成しうる点も考慮済み）。
- **D4（resourceKinds 疎結合）**: B-5（兄弟ドメイン直接 import 禁止）準拠。catalog が `@koma/resource` を import せず種別タグで参照する設計は正しい。
- **D5（name 空文字許容）**: request-review LOW 指摘への対応。既存 `resource` / `crm` との整合性を優先した判断として妥当。
- **D6（updateService → createService 委譲）**: `updateResource` と同一パターン。全不変条件の再検証が保証される。

### tasks.md 評価

- **T-02**: `createService` の引数型 `{ id?: Id<'Service'>; name: string; duration: Duration; price: Money; resourceKinds?: readonly string[] }` は `resource.ts` の `createResource` 引数型と同構造。`id` / `resourceKinds` の省略時デフォルト（自動生成 / 空配列）も resource パターンと整合。
- **T-04 import パス**: `src/port/service-repository.ts` から `'../service.js'` → `src/service.ts` の参照は ESM 解決として正確。
- **T-07 barrel export**: `export type { Service }` / `export type { ServiceRepository }` の type-only export と value export の分離は `packages/resource/src/index.ts` と同一パターン。`.js` 拡張子を使った ESM パス指定も正確。
- **T-08 workspace 検証**: `pnpm -r --if-present` による全パッケージ連鎖テストが acceptance criteria に含まれており、既存パッケージへの影響検証が担保されている。

### spec.md 評価

全 4 Requirement（duration 正・price 非負・immutable 更新・Repository 契約）と 8 シナリオが網羅されており、受け入れ基準の機械検証可能性は高い。spec-review で LOW 指摘（#1）として挙げた「空の list」シナリオは tasks.md に補完されているため実装漏れのリスクはない。

### セキュリティレビュー

- **入力検証**: `duration.milliseconds <= 0` / `price.amount < 0` のガードにより不正値の構築を防止。構築時点でのフェイルファストは適切。
- **不変性**: `Object.freeze` により返却オブジェクトの外部変異を防止。Repository の in-memory 実装も値の参照渡しで済むため、freeze 済みオブジェクトを格納することで一貫して不変が保たれる。
- **依存安全性**: `@koma/shared` のみへの依存。`next` / `react` / `drizzle-orm` / `zod` を排除（B-1〜B-4 準拠）。新規外部依存なし。
- **兄弟ドメイン境界**: `@koma/resource` を import しない設計により B-5 違反なし。
- **OWASP Top 10**: 純粋ドメイン層（外部通信・DB・認証なし）のため A01〜A10 の直接適用対象外。配信層実装時に別途評価する。

### 総合評価

design.md / tasks.md / spec.md は相互に整合しており、request.md の受け入れ基準をすべてカバーしている。request-review で指摘された MEDIUM（price 非負）・LOW（name 空文字）の両所見が設計判断として適切に消化されている。実装の障壁となる未解決事項・矛盾・構造違反は確認されず、実装フェーズへの移行が適切と判断する。
