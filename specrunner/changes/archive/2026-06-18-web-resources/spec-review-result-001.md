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

- **verdict**: needs-fix

## Findings

| # | Severity | Category | File | Description | How to Fix |
|---|----------|----------|------|-------------|------------|
| 1 | HIGH | 実装ガイドと仕様の矛盾（小数 capacity 検出） | design.md D3 / tasks.md T-03 | design.md D3 と tasks.md T-03 は capacity 文字列の変換に `parseInt` を使うと指示しているが、`parseInt("1.5")` = 1 であり NaN でも非整数でもなく `< 1` でもないため、小数文字列が検証をすり抜ける。spec.md は「capacity が小数（例: "1.5"）→ `errors.capacity` あり」を明示的に要求しており、`parseInt` アプローチではこのシナリオが functional failure となる。 | design.md D3 と tasks.md T-03 の変換ロジックを `parseInt` から `Number()` に変更する。`Number("1.5")` = 1.5 → `Number.isInteger(1.5)` = false → 正しくエラーになる。具体例: `const n = Number(capStr); if (isNaN(n) \|\| !Number.isInteger(n) \|\| n < 1) { return capacity error }` |
| 2 | LOW | spec カバレッジの軽微な欠落 | spec.md | spec.md の `kind` バリデーション要件にはスペースのみ（例: `"   "`）のシナリオがない。`name` バリデーションはスペースのみシナリオを持ち、同じ `z.trim() + z.minLength(1)` パターンを `kind` も共有するが、spec 上は明示されていない。 | spec.md の「kind が空の場合にエラーを返す」要件に「kind がスペースのみ」シナリオを追加するか、name/kind が同一バリデーションルールを共有することを本文中に注記する。 |
| 3 | LOW | セキュリティ負債の明示（認証・認可） | request.md | `/resources` 管理画面は認証・認可なしでアクセス可能となる。スコープ外として明示されており本スライスの問題ではないが、in-memory デモを超えて本番利用する際のリスクとして追跡が必要。 | request.md のスコープ外節または受け入れ基準に「本番移行前に認証・認可ガードが必要」を注記として残す。 |
| 4 | LOW | `capacity: ""` の動作が spec 未記載 | tasks.md T-03 / spec.md | tasks.md T-03 は「capacity が未指定または空文字の場合は `undefined`（デフォルト 1 に委ねる）」と定義しているが、この挙動（空文字 → 有効・capacity=1）は spec.md にシナリオとして記述されておらず、実装者がテストで保証する根拠が spec に存在しない。 | spec.md に「capacity が空文字のとき `capacity: 1` で `ok: true`」シナリオを追加するか、tasks.md T-04 の有効入力テストケースに空文字パターンを追加する。 |

## Review Summary

**要修正（needs-fix）。** 阻害 finding は 1 件（Finding #1）。

### Finding #1 について（HIGH）

`parseInt` と `Number()` の挙動差が spec 要件と直接矛盾する。

- `parseInt("1.5", 10)` = **1**（小数部を切り捨て）
- `Number("1.5")` = **1.5**（保持）
- `Number.isInteger(1)` = true → エラーにならない ← spec 要件に違反
- `Number.isInteger(1.5)` = false → 正しくエラーになる

`createResource` のドメイン不変条件も `Number.isInteger(capacity)` を使っており、`parseInt` で変換済みの 1 は不変条件も通過する。すなわち「二段防御」の両方がすり抜けることになる。

fix は機械的で単純: design.md D3 および tasks.md T-03 の変換ロジックを `parseInt` → `Number()` に変更する。spec.md と test-case の要件（"1.5" → エラー）は正しく、修正対象は設計・タスク記述のみ。

### セキュリティ観点（Full Review 対象）

- **入力検証**: zod/mini でフィールド別検証 → `createResource` ドメイン不変条件の二段防御は適切。`name`/`kind` の trim+minLength による空白バイパス防止も確認済み。
- **CSRF**: Next.js Server Actions は組み込みで CSRF 保護を提供する。`'use server'` directive の使用により適切に保護される。
- **XSS**: React/Next.js はデフォルトで出力をエスケープする。テンプレートリテラルによる dangerouslySetInnerHTML は設計上使用しない。
- **Mass Assignment**: zod スキーマが `name`/`kind`/`capacity` のみを明示的に抽出し、余分なフィールドを無視する。意図せぬフィールド注入のリスクはない。
- **認証・認可**: `/resources` は保護なしで公開される。本スライスのスコープ外として明示されており、in-memory デモ用途では受け入れ可。本番化時の対応必要（Finding #3 として LOW 記録）。
- **Injection（SQL/Command）**: in-memory repository 使用のため SQL インジェクションリスクはない。後続の Drizzle 移行時は composition root 切り替えと同時に Drizzle の parameterized query を使用することを確認すること。

OWASP Top 10 該当リスク: A01（アクセス制御）は認証未実装のためスコープ外リスクとして記録済み。A03（インジェクション）は in-memory フェーズでは該当なし。その他は本スライスの構成では該当なし。

Finding #1 を修正後、再レビューなしで pipeline 継続可。
