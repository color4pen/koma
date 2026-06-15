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
| 1 | MEDIUM | Domain Invariant Gap | request.md §要件2・受け入れ基準 | `Service.price` の非負制約が未定義。`@koma/shared` の `createMoney` は amount が負の整数でも通過するため（整数であることのみチェック）、マイナス料金のサービスが構築可能な状態になる。業務上、価格は 0 以上が自然な不変条件であり、`createService` での guard 抜けがテストで固定されない可能性がある。 | 実装時に `price.amount >= 0` のガードを `createService` に追加し、受け入れ基準のテストに「負の price で構築不可」を含めることを検討。現リクエストのスコープを超えるなら後続リクエストで Money 自体に非負制約を入れるか、catalog 層で追加するかを設計判断として明示するとよい。 |
| 2 | LOW | Clarity | request.md §要件2 | `name` フィールドの不変条件（空文字許可/不可）が明記されていない。既存の `Customer.name` / `Resource.name` は空文字を許容するパターンになっており、整合は取れているが明文化がない。 | 既存パターンに倣い空文字を許容するなら現状のままで問題なし。将来的に非空制約を設けるなら request に記載する。実装者は既存 crm / resource の慣習に従えばよい。 |

## Review Notes

### 前提確認（コードベース照合）

- `packages/` は現時点で `crm` / `resource` / `shared` の 3 パッケージのみ（`packages/catalog` 未作成）— request の前提と一致。
- `@koma/shared` の `Duration`・`Money`・`Id` の export を確認。request が参照するライン番号（`packages/shared/src/index.ts:13` / `:4`）は実際のファイルと一致。
- `Duration` は非負（`>= 0`）のみ保証。`Service` が追加で「正（`> 0`）」を求める点は request で明示されており、実装に委ねる設計として妥当。
- `packages/resource` のパターン（`resource.ts` / `port/resource-repository.ts` / `in-memory-resource-repository.ts` / `index.ts` / `package.json`）が request 記載の通り存在することを確認。
- `ResourceRepository` は `save(resource): Promise<void>` / `findById(id): Promise<Resource | null>` / `list(): Promise<Resource[]>` の非同期 interface — request の ServiceRepository port 要件と構造的に整合。

### 構造不変条件（B-1〜B-5）適合性

- `@koma/shared` のみに依存し、`next` / `react` / `drizzle-orm` / `zod` を排除する設計（B-1〜B-3）は受け入れ基準の `grep` チェックで機械検証される。
- `resourceKinds: readonly string[]` で `Resource` エンティティを直接 import せず種別タグで疎結合参照（B-5 準拠）。設計判断として適切。
- `adr: false` の根拠（確立済みパターンの適用）は妥当。

### 受け入れ基準の検証可能性

すべての受け入れ基準が機械検証可能な形式で記述されており、HIGH 相当の欠落なし。上記 MEDIUM 指摘（price 非負）を除けばテストによる固定が網羅されている。
