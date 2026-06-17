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
| 1 | LOW | spec カバレッジ（kind 空白） | spec.md | `kind` バリデーション要件に「kind がスペースのみ」シナリオがない。`name` はスペースのみシナリオを持つが `kind` は空文字のみ。両フィールドは同一の `z.trim() + z.minLength(1)` ルールを共有するため挙動は保証されるが、spec 上は非対称。 | spec.md の「kind が空の場合にエラーを返す」要件に「kind がスペースのみ → `ok: false, errors.kind あり`」シナリオを追加するか、name/kind が同一バリデーションルールを共有する旨を本文中に注記する（任意）。 |
| 2 | LOW | spec カバレッジ（capacity 空文字） | spec.md / tasks.md T-04 | tasks.md T-03 は「capacity が空文字の場合は `undefined` として `createResource` のデフォルト 1 に委ねる」と定義しているが、spec.md にこの挙動のシナリオがなく、tasks.md T-04 にも対応テストケースがない。HTML フォームの number input をクリアすると空文字が送られるため実運用上のパスが存在する。 | spec.md に「capacity が空文字のとき `resource.capacity === 1` で `ok: true`」シナリオを追加するか、tasks.md T-04 の有効入力テストケースに `capacity: ""` パターンを追加する（任意）。 |
| 3 | LOW | セキュリティ負債（認証・認可） | request.md | `/resources` 管理画面は認証・認可なしでアクセス可能となる。request.md スコープ外に「認証・認可」と記載はあるが、本番化時のリスクとして追跡可能な注記が明示されていない。 | request.md のスコープ外節または受け入れ基準に「本番移行前に認証・認可ガード（ミドルウェア等）が必須」を注記として追記する（任意）。 |

## Review Summary

**承認（approved）。** spec-review-result-001.md で指摘した唯一の阻害 finding（HIGH: `parseInt` による小数検出失敗）は design.md D3 および tasks.md T-03 の双方が `Number()` + `Number.isInteger` アプローチに更新されており解消されている。

### spec-review-result-001.md HIGH finding の解消確認

- design.md D3: `"const n = Number(capStr); if (isNaN(n) || !Number.isInteger(n) || n < 1)"` を明示。`parseInt` 記述は除去済み。
- tasks.md T-03 step 3: 同一の `Number()` + `Number.isInteger` ロジックを指定。
- `createResource` ドメイン不変条件（`!Number.isInteger(capacity) || capacity < 1` → throw）とも整合しており、二段防御が正しく成立する。

### 仕様整合性確認

- **request.md ↔ design.md ↔ tasks.md ↔ spec.md**: 要件・設計判断・タスク手順・シナリオの対応に矛盾なし。
- **`capacity` 型フロー**: フォーム文字列 → `z.optional(z.string())` → 空文字/undefined は early return で `undefined`、それ以外は `Number()` 変換 → `Number.isInteger` + `>= 1` 検証 → `createResource`。フローは一貫している。
- **`ActionState` 型重複**: actions.ts に `ActionState` をローカル定義する設計は customers パターンと対称であり問題なし（将来の共有は後続リファクタリングスコープ）。
- **globalThis パターン**: composition root 拡張の設計（T-02）は既存 `getCustomerRepository` と完全に対称で、具象生成の 1 箇所集約を維持している。

### セキュリティ観点（Full Review）

- **入力検証**: `zod/v4/mini` でフィールド別検証（name/kind trim+minLength、capacity Number+isInteger+≥1） + `createResource` ドメイン不変条件の二段防御。適切。
- **CSRF**: Next.js Server Actions は組み込みで CSRF 保護を提供する。`'use server'` directive により適切に保護される。
- **XSS**: React/Next.js はデフォルトで出力をエスケープする。`dangerouslySetInnerHTML` の使用なし。
- **Mass Assignment**: zod スキーマが `name`/`kind`/`capacity` のみを明示的に抽出。余分なフィールド注入リスクはない。
- **認証・認可**: スコープ外として明示。in-memory デモ用途では受け入れ可。本番化時のリスクは Finding #3 として LOW 記録（Finding #3 参照）。
- **SQL/Command インジェクション**: in-memory repository 使用のため SQL インジェクションリスクはない。後続 Drizzle 移行時は composition root の 1 箇所差し替えと同時に parameterized query の使用を確認すること。
- **OWASP Top 10**: A01（アクセス制御）はスコープ外リスクとして記録。A03（インジェクション）は in-memory フェーズで該当なし。その他は本スライスの構成では該当なし。

残存する finding はすべて LOW（任意対応）であり、実装を阻害する問題はない。
