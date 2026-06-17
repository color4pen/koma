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
| 1 | MEDIUM | Dependency | tasks.md T-01 | `parse-service-input.ts`（T-03）は `ofMinutes` / `createMoney` を、`page.tsx`（T-08）は `toMinutes` を `@koma/shared` から直接 import する。しかし T-01 は `@koma/catalog` の追加のみを規定し、`@koma/shared` を `apps/web/package.json` に追加することを明示していない。`next.config.ts` の `transpilePackages` に `@koma/shared` が既設定のため現行 webpack ビルドは通過する可能性が高いが、phantom dependency（明示的 deps に未記載）として残る。pnpm の hoisting 設定変更や CI 環境差異で `tsc --noEmit` が解決失敗するリスクがある。 | T-01 の checklist に `"@koma/shared": "workspace:*"` を `apps/web/package.json` の dependencies に追加する手順を加える。実装者が見落としやすい箇所のため明示が有効。 |
| 2 | LOW | Security | tasks.md T-05 / T-08 | `/services` 管理ページには認証・認可ガードがない。サービスの登録 action と一覧ページが誰でもアクセス可能な状態になる。スコープ外と明記されており、既存の `/customers` / `/resources` と一貫した設計判断ではあるが、デモ以降の本番用途では保護が必要。 | 本スライスのスコープ外であり実装は不要。ただし後続スライスで認証・認可を横断的に追加する際に `/services` が漏れないよう、スコープ外セクションに「後続スライスで認証追加が必要」の旨を記載しておくと追跡しやすい。 |
| 3 | LOW | Input Validation | tasks.md T-03 / T-07 | `name` および `resourceKinds` に最大文字数制限が指定されていない。in-memory 実装ではリスクは低いが、将来の Drizzle 永続化時に DB カラム長との齟齬が生じうる。 | 本スライスでは対処不要。後続の永続化スライスで DB スキーマ確定時に maxLength 制約を zod スキーマと DB 定義で合わせる設計判断を行う。 |

## Review Summary

### コードベース検証

| 確認項目 | 結果 |
|---------|------|
| `@koma/catalog` が `createService` / `ServiceRepository` / `createInMemoryServiceRepository` を export | ✓ `packages/catalog/src/index.ts` |
| `Service` 型が `name / duration: Duration / price: Money / resourceKinds: readonly string[]` | ✓ `packages/catalog/src/service.ts` |
| `createService` が `duration.milliseconds <= 0` で throw、`price.amount < 0` で throw | ✓ 同上 |
| `@koma/shared` が `ofMinutes` / `createMoney` / `toMinutes` を export | ✓ `packages/shared/src/index.ts` |
| `ofMinutes(x)` は `ofMilliseconds(x * 60000)` 経由、`ofMilliseconds` は非整数 ms を throw | ✓ `packages/shared/src/duration.ts` |
| `createMoney` は非整数 amount を throw | ✓ `packages/shared/src/money.ts` |
| `createService` の `resourceKinds` は optional（デフォルト `[]`） | ✓ `packages/catalog/src/service.ts` |
| `apps/web/package.json` に `@koma/catalog` 未記載 | ✓ 確認（依存追加が必要） |
| `@koma/shared` が `apps/web/package.json` に未記載（finding #1） | ✓ 確認 |
| `next.config.ts` の `transpilePackages` に `@koma/shared` が既設定 | ✓ `apps/web/next.config.ts` |
| `composition-root.ts` が `globalThis` lazy singleton パターンを確立済み | ✓ `apps/web/lib/composition-root.ts` |
| `parse-resource-input.ts` が踏襲パターンとして存在（`zod/v4/mini` + custom Number() 変換） | ✓ `apps/web/lib/parse-resource-input.ts` |
| server action パターン（`'use server'` / FormData → parse → save → revalidate） | ✓ `apps/web/app/resources/actions.ts` |
| page パターン（server component + client form + table 一覧） | ✓ `apps/web/app/resources/page.tsx` |

### 設計整合性検証

**二段防御の整合性**（D3）:

| 入力ケース | zod/custom 層 | domain factory 層 | 結果 |
|-----------|--------------|------------------|------|
| `durationMinutes: "0"` | `< 1` → reject ✓ | `ofMinutes(0)` → ms=0、`createService` で <= 0 throw | 二段目到達しない（設計上正常） |
| `durationMinutes: "30.5"` | `!Number.isInteger(30.5)` → reject ✓ | `ofMinutes(30.5)` → ms=1800000（整数）→ `createService` OK だが事前に弾く | 正しく一段目で弾く ✓ |
| `durationMinutes: "60"` | OK ✓ | `ofMinutes(60)` → ms=3600000 > 0 → `createService` OK ✓ | 通過 ✓ |
| `priceYen: "0"` | `>= 0` → OK ✓ | `createMoney(0, 'JPY')` → `createService` で `price.amount < 0` は通過 ✓ | 無料メニュー正常 ✓ |
| `priceYen: "-100"` | `< 0` → reject ✓ | `createMoney(-100, 'JPY')` → `createService` で throw（二段目） | 一段目で弾く ✓ |

**`ofMinutes` 内部精度の考察**: `ofMinutes(x)` は `ofMilliseconds(x * 60000)` を呼ぶ。`x` が正整数なら `x * 60000` も整数→ `ofMilliseconds` の `Number.isInteger` チェックを通過。zod 層で `Number.isInteger(durationMinutes)` を確認するため、小数が `ofMinutes` に到達しない設計は正しい。

### spec.md フォーマット準拠確認

| 規律 | 結果 |
|------|------|
| 各 Requirement に `### Requirement:` ヘッダ | ✓ |
| 各 Requirement に 1 つ以上の `#### Scenario:` | ✓ |
| Requirement 本文に normative keyword（`SHALL`） | ✓ 全 Requirement に含まれている |
| Scenario が Given/When/Then 形式 | ✓ |
| Layer-1 振る舞いのみ（型強制は記述しない） | ✓ |

### セキュリティレビュー（OWASP Top 10 観点）

| 観点 | 評価 |
|------|------|
| A01 Broken Access Control | 管理ページに認証ガードなし（finding #2 参照）。intentional scope exclusion。 |
| A03 Injection | zod/mini 境界検証 + React JSX の自動エスケープで XSS/Injection リスクなし。in-memory Repository で SQL なし。✓ |
| A07 Auth Failures | スコープ外（後続スライス対応）。既存ページと一貫した設計判断。 |
| CSRF | Next.js Server Actions は Same-Origin チェックを組み込みで行う。`'use server'` 宣言で保護。✓ |
| Input Size | 文字列フィールドに maxLength 制限なし（finding #3 参照）。in-memory では低リスク。 |
| その他 A02/A04/A05/A06/A08/A09/A10 | 本スライスでは非適用または既存アーキテクチャ依存で新規リスクなし。 |

### 総合評価

HIGH / CRITICAL 知見なし。MEDIUM 1 件（`@koma/shared` phantom dependency）は `next.config.ts` の既設定により実際のビルド失敗リスクは低いが、T-01 の checklist に明示すれば実装者が安全に進められる。spec.md / design.md / tasks.md の内容は相互整合的で、確立済み delivery パターンの適用として仕様の完成度は高い。
