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
| 1 | MEDIUM | Security / Contract | design.md D6, port/user-repository.ts | `findByEmail` がログインの主経路であるにもかかわらず、ポートコントラクトに大文字小文字の区別（case sensitivity）が明記されていない。in-memory 実装は `===` による完全一致（case-sensitive）になるが、将来の DB アダプタは照合順序次第で case-insensitive になりうる。`Alice@Example.com` で登録して `alice@example.com` でログインを試みると、in-memory では失敗・DB では成功という環境間不一致が発生しうる。 | design.md の D6 または UserRepository port のコメントに「`findByEmail` は渡された email 文字列を大文字小文字を区別して照合する（呼び出し側が lowercase 正規化して渡すこと）」と一文を追加する。あるいは `findByEmail` 自体に `email.toLowerCase()` での正規化を要求するかを方針として決定し記録する。 |
| 2 | LOW | Completeness | spec.md | `UserRepository の save → findById → list` シナリオに「空の状態で `list` が空配列を返す」ケースが含まれていない。tasks.md T-08 には「空の状態で `list` が空配列を返すテスト」が存在するが、対応する spec シナリオがないため spec と tasks の対称性が欠ける。実装には影響しないが、spec の振る舞い仕様として記録されていない。 | spec.md の「UserRepository の save → findById → list が正しく動作する」要件に `Scenario: 空のリポジトリで list を呼ぶ → 空配列が返される` を追加する（blocking なし）。 |
| 3 | LOW | Security (OWASP A07) | design.md D5, user.ts | `passwordHash` は空文字を含む任意の文字列を受け付ける（D5 の意図的設計判断）。配信境界で未バリデートのまま空 hash を持つ User が生成できるリスクを、ドメインは検出・拒否しない。これは設計判断として文書化済みであり許容範囲内だが、delivery 層が必ず非空 hash を渡す保証がないと `passwordHash: ''` の User が永続化されうる。 | 設計上の意図は明確であり変更不要。ただし T-04 の受け入れ基準に「`passwordHash` が空文字でも構築できる（delivery 層の責任）」旨を明示的なコメントとして追記すると、将来の実装者が意図的仕様と誤実装を混同しにくくなる。 |

## Review Notes

**アーキテクチャ整合性**: 仕様全体が `docs/アーキテクチャ/model.md`（B-1〜B-6）および `domain-model.md`（`User` ≠ `Resource`・iam コンテキスト）と完全に整合している。`packages/iam` は domain-model.md でコンテキスト分類済みであり、パッケージ新設の正当性は確立されている。

**パターン適合性**: `packages/crm` で確立した「ドメインパッケージ ＋ `src/port/` に Repository interface ＋ in-memory 実装 ＋ vitest ＋ `src/index.ts` 公開」パターンを正確に踏襲している。ファイル構成（D1）・ファクトリ関数パターン（D4）・port の async 設計（D6）すべてが既存パターンと一致。

**依存規律**: `next` / `react` / `drizzle-orm` / `zod` を排除する方針が明示され、受け入れ基準で `grep` による機械検証が担保されている（B-1〜B-3）。

**認可設計（セキュリティ）**: `can(role, permission): boolean` 純関数＋ `ROLE_PERMISSIONS` 単一マップは、各所で `role === 'owner'` を直接 if 分岐するパターンを排除し、認可ルールの分散・乖離を防ぐ。OWASP A01（Broken Access Control）対策として堅牢な設計。`ROLE_PERMISSIONS` を外部に公開せず `can()` と `ALL_PERMISSIONS` のみ export する設計は、ルールの単一管理と呼び出し側の誤用防止の両立として適切。

**パスワードハッシュ境界（セキュリティ）**: `passwordHash` をドメインが不透明に保持し、ハッシュ化・検証を配信の責務とする設計は OWASP A02（Cryptographic Failures）の観点からも正しい。暗号ライブラリ依存をドメインから排除することで、将来のアルゴリズム移行コストが delivery 層に局所化される。

**`Object.freeze` による不変条件**: `createUser` / `updateUser` が `Object.freeze` で User オブジェクトを凍結する設計は、OWASP A08（Software and Data Integrity Failures）に対して適切な防御。

**spec と tasks の対称性**: spec.md の Given/When/Then シナリオは `can()` の真理値表・`createUser` の email バリデーション・`updateUser` の immutable 更新・`findByEmail` の正常/異常系を網羅している。tasks.md は spec のシナリオをすべてカバーし、さらに `Object.freeze` テスト等の実装詳細まで含む。spec は振る舞い仕様として適切な粒度。
