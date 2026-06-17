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
| 1 | MEDIUM | Type Safety | tasks.md T-05, spec.md Requirement 2 | `resource_kinds` jsonb カラムを `row.resource_kinds as string[]` でキャストしているが、DB に不正な形式（オブジェクト等）が混入した場合、`createService` は型チェックを通過してランタイムエラーにならず、undefined な動作をする可能性がある（`createService` は `readonly string[]` の内容を検査しない）。設計 D2 で「アプリ側に依存」と文書化されているが、`rowToService` 内で `Array.isArray` ガードを追加すると実装品質が向上する。 | 実装時に `rowToService` で `Array.isArray(row.resource_kinds) ? row.resource_kinds as string[] : []` のようなガードを検討すること。spec 自体の変更は不要。 |
| 2 | LOW | Spec Format | spec.md | rules.md §spec 記法 の規則「Requirement 本文（header 直後〜最初の Scenario の間）に英語の `SHALL` または `MUST` を少なくとも 1 つ含めること」について、body テキスト（日本語本文）には SHALL/MUST が含まれず、header 行（`### Requirement: DrizzleResourceRepository SHALL ...`）のみに含まれる。意味的には明確だが、規則への厳密な適合は body 本文側での明示を求めている。 | 実装上のブロッカーではない。次回の spec 作成時は body テキスト（`#### Scenario:` の前）に "SHALL" or "MUST" を 1 語含める。本 spec の修正は不要。 |
| 3 | LOW | Robustness | spec.md, tasks.md | `rowToResource` / `rowToService` が `createResource` / `createService` をスローする条件（DB に不変条件違反データが混入した場合）について spec が言及しない。`findById` / `list` がスローする可能性が文書化されていない。既存の `drizzle-customer-repository` も同様の未言及パターンであり一貫性はあるが、エラー伝播がスコープ外とわかれば十分。 | スコープ外として明示的に記録する場合は design.md の Risks セクションに "再構成エラーはスローとして伝播する（呼び出し元が処理）" の一行を追加すればよい。spec 修正は不要。 |

## Review Notes

### 前提条件の検証（すべて充足）

コードベースを直接確認し、request.md に記載された前提が正確であることを検証した。

| 前提 | 検証結果 |
|------|---------|
| `packages/resource/src/resource.ts` — `createResource` 実装（`capacity >= 1` 強制）、`index.ts` から export | ✓ |
| `packages/resource/src/port/resource-repository.ts` — `save / findById / list` を定義 | ✓ |
| `packages/catalog/src/service.ts` — `createService` 実装（`duration > 0`, `price >= 0` 強制） | ✓ |
| `packages/catalog/src/port/service-repository.ts` — `save / findById / list` を定義 | ✓ |
| `packages/shared` — `ofMilliseconds`（非負整数バリデーション付き）/ `createMoney`（整数バリデーション付き）/ `Currency`（`'JPY'`）/ `parseId`（UUID v4 検証付き）を export | ✓ |
| `packages/db/src/client.ts` / `schema/customer.ts` / `drizzle-customer-repository.ts` / `.test.ts` — 確立パターンとして参照可能 | ✓ |
| `packages/db` に Resource / Service の schema・実装は存在しない | ✓ |

### アーキテクチャ適合

- `model.md` §3 注⁴ が「db → domain は port interface / 型 / 集約ファクトリ（行 → 集約再構成）を参照可」と明示しており、`@koma/resource` / `@koma/catalog` への依存追加は構造不変条件に適合する。
- domain が `drizzle-orm` を import しないことは現行コードで担保されており、本変更は逆流を起こさない（B-1, B-2, B-3 非違反）。
- `@koma/resource` / `@koma/catalog` は兄弟ドメイン間の直接依存（B-5）ではなく、`db` adapter からドメインへの向きであり許可されている。

### セキュリティレビュー（OWASP Top 10 適用範囲）

この変更は内部 DB adapter レイヤーのみを対象とする。

| 観点 | 評価 |
|------|-----|
| **A03 Injection** | Drizzle ORM の型安全クエリビルダー（`eq(resources.id, id)` 等）を使用しており、SQL インジェクションのリスクなし。さらに `parseId` が UUID v4 以外の文字列を `findById` 前に拒否するため入力検証も機能している。 |
| **A04 Insecure Design** | `rowToService` / `rowToResource` はドメインファクトリ経由で再構成し、不変条件を DB 読み取り時にも適用する。直接オブジェクトリテラル組み立て（不変条件バイパス）を明示的に却下した D5 は正しい設計判断。 |
| **A08 Data Integrity** | `resource_kinds` jsonb の `as string[]` キャストは型安全でないが（Findings #1 参照）、挿入経路がドメインファクトリに限定されており運用上のリスクは低い。 |
| その他 A01/A02/A05〜A07/A09/A10 | このスコープ（純粋な repository adapter）には適用外または delivery 層の責任範囲。 |

**セキュリティ上の CRITICAL / HIGH 所見はなし。**

### spec・design・tasks の内部整合性

- **spec.md ↔ request.md**: 全シナリオが受け入れ基準のテスト要件に対応している（往復保存 / null / list 件数 / upsert / duration / price / resourceKinds の各ケース）。
- **design.md ↔ tasks.md**: D1〜D7 の設計判断がそれぞれ T-01〜T-05 の実装指示に反映されている。
- **tasks.md の import 指示**: T-04 / T-05 の import 宣言を `@koma/resource` / `@koma/catalog` / `@koma/shared` の実際の export と照合し、すべて一致を確認した。
- **テスト隔離パターン**: T-06 / T-07 の `beforeEach` fresh pglite + `afterEach` close は `drizzle-customer-repository.test.ts` の確立パターンと同一構造であり、問題なし。
- **schema の NOT NULL**: T-02 (`.notNull()`) と T-06 (SQL `TEXT NOT NULL`) が整合。T-03 / T-07 も同様。T-07 の `DEFAULT '[]'::jsonb` はテスト用 SQL のみの追加であり、T-03 の Drizzle schema との差異は `save` が常に値を提供するため問題なし。

### 総評

本 change は db-customer で確立済みのパターンの直接適用であり、新規アーキテクチャ判断を必要としない。spec / design / tasks がすべて実装可能なレベルで記述されており、前提コードとの整合性も確認された。CRITICAL / HIGH の所見はなく、実装に進む準備が整っている。
