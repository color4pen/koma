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
| 1 | LOW | Completeness | spec.md | `unsubscribe` 冪等性が契約として未定義。`subscribe` が返す `() => void` を複数回呼んだ際の動作はスペックに記載がない。in-memory 実装は `Set.delete()` で自然に冪等だが、`EventBus` port の別実装が同じ保証を提供する義務がない。 | 実装時に in-memory の実際の挙動を文書化するか、将来別実装が生まれる際に注意点として tasks の注釈に追記するだけで十分。spec への Scenario 追加は必須ではない（スコープ外の動作として扱うのが最小コスト）。 |
| 2 | LOW | Coverage | spec.md | `publish` の型安全性シナリオが spec にない。design D2 は `publish<N extends keyof M & string>(event: M[N] & { readonly name: N })` と定め、`subscribe` と同等の型安全を謳っているが、spec.md の型安全 Requirement（Req 5）は `subscribe` の handler 型のみをカバーしている。 | request の受け入れ基準は `subscribe` 型安全テストのみを要求しているため blocking ではない。実装者が design D2 に従い `publish` に正しいシグネチャを付けることで型システムが自動的に強制する。必要であれば test-case-gen フェーズで `@ts-expect-error` テストを追加すること。 |

## Review Notes

### ドキュメント間整合性チェック

| 確認項目 | 結果 |
|---------|------|
| request.md の受け入れ基準 ↔ spec.md の Scenario 対応 | ✓ 全 7 項目が spec の Requirement/Scenario で網羅されている |
| design.md の Decisions ↔ tasks.md の実装指示 | ✓ D1–D5 が T-01〜T-03 に漏れなくマッピングされている |
| spec.md の Scenario ↔ tasks.md のテスト要件 | ✓ spec の 9 Scenario が T-02 のテスト項目に 1:1 以上でカバーされている |
| request-review LOW 所見（`publish` シグネチャ未明示）の解決 | ✓ design D2 で `publish<N>` の交差型シグネチャを明示し解決済み |
| B-4（`next`/`react`/`drizzle-orm`/`zod` 禁止）の担保 | ✓ package.json は devDependencies のみ・禁止依存なし。T-03 の grep チェックで機械的に検証する |

### spec.md 記法チェック

| 規約 | 適合状況 |
|------|---------|
| 各 Requirement が `### Requirement:` ヘッダを持つ | ✓（6 Requirements 全件） |
| 各 Requirement が 1 つ以上の `#### Scenario:` を含む | ✓（合計 9 Scenarios） |
| Requirement 本文に normative keyword（`SHALL` / `MUST`）を含む | ✓（全 Requirements: MUST be extensible / SHALL deliver / MUST return / MUST invoke / MUST be type-safe / SHALL invoke all） |
| Layer-1 振る舞いのみ記述（Layer-0 排除） | ✓。型安全テスト（Req 5）は `@ts-expect-error` BDD パターンで振る舞いとして記述されており、request 受け入れ基準でも明示的に要求されているため適切 |
| Scenario が Given/When/Then 形式 | ✓（全 Scenarios） |

### セキュリティレビュー（OWASP Top 10 適用範囲確認）

本変更は内部ドメインイベント基盤（純粋 TypeScript 型定義 + オンメモリ pub/sub）であり、ネットワーク露出・外部入力・永続化のいずれも持たない。OWASP Top 10 の主要観点への適用結果:

| 項目 | 評価 |
|------|------|
| A01 Broken Access Control | N/A — アクセス制御はスコープ外（delivery 層の責務） |
| A03 Injection | N/A — 外部文字列入力なし。handler は同一プロセス内のコードのみ登録可能 |
| A06 Vulnerable Components | ✓ — 新規 dependencies なし（B-4 準拠）。devDependencies のみ |
| A08 Software and Data Integrity | 低リスク — `readonly` 型で compile-time 不変性を保証。runtime での意図的なキャスト変更はアーキテクチャ上考慮しない |
| その他（A02/A04/A05/A07/A09/A10） | N/A — 該当する攻撃面なし |

セキュリティ上のブロッカーはない。

### 設計品質評価

- **同期 in-memory の決定論的テスト保証**: publish → subscribe の因果が同期で完結するため、`await` なしで副作用を観測できる。Scenario「publish 後に副作用が即座に観測できる」はこの性質をピンポイントで固定している。
- **EventMap によるジェネリクス設計**: declaration merging（グローバル名前空間汚染）を避けつつ、各ドメインが独立した型安全な EventMap を持てる構造は、兄弟ドメイン直接 import 禁止（アーキテクチャ制約）と整合している。
- **ファクトリ関数パターン**: 既存 shared パッケージ（`createId` / `createMoney` / `createTimeRange` 等）の確立済み規約に従っており、コードスタイルの一貫性が保たれる。
- **リスク登録**: 例外伝播・登録順序依存の 2 リスクが design.md に明示され、いずれも「スコープ外・delivery 責務」として棲み分けが明確。

### 結論

HIGH / MEDIUM 所見なし。LOW 所見 2 件はいずれも実装の妨げにならない情報提供レベル。spec は機械検証可能な受け入れ基準を備え、design・tasks との整合性も確認済み。実装フェーズに進行可能。
