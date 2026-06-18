# Code Review Feedback — iteration 001

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
- iteration line format (exact): `- **iteration**: NNN` (3-digit zero-padded integer)
- Findings table MUST have exactly 7 columns in this order:
  # | Severity | Category | File | Description | How to Fix | Fix
  - Fix column: yes = fixer should address this finding; no = skip (pre-existing / out-of-scope)
- Scores table columns: Category | Score | Weight
  - Valid Category values: correctness | security | architecture | performance | maintainability | testing
  - Score: integer 1-10
  - Weight: decimal as defined below
- total line format (exact): `- **total**: <decimal>`
- Default weights: correctness=0.30, security=0.25, architecture=0.15, performance=0.10, maintainability=0.10, testing=0.10
- Scores table is optional but recommended.
**Verdict blocking rules (derived by CLI from the reported findings)**:
- `decision-needed` ≥ 1 → `escalation`（request-review では `needs-discussion`）
- `critical` または `high` ≥ 1 → `needs-fix`
- それ以外 → `approved`

markdown の verdict 行と報告された findings が矛盾した場合、**findings 由来の導出が優先**されます。verdict 行は人間向けの要約であり、機械ルーティングには使用されません。
-->

- **verdict**: approved
- **iteration**: 001

## Findings

| # | Severity | Category | File | Description | How to Fix | Fix |
|---|----------|----------|------|-------------|------------|-----|
| 1 | low | testing | `packages/iam/src/in-memory-user-repository.test.ts` | upsert テスト（line 81）が `{ ...user, email: 'updated@example.com' }` でオブジェクトスプレッドを使用している。これはリポジトリの upsert 挙動のテストとして正しく機能するが、`updateUser()` を経由しないため `Object.freeze` が適用されていない。`User` 型は structural なので型エラーにはならない | `updateUser(user, { email: 'updated@example.com' })` を使うとドメインの不変条件（freeze + validation）を通すテストになる | no |
| 2 | low | maintainability | `packages/iam/src/index.ts` | `ROLE_PERMISSIONS` が `index.ts` から export されているが、T-09 の受け入れ基準（TC-028）の必須 export 一覧には記載されていない。設計上は認可ルールの単一真実源として公開する意図があり問題はない | 変更不要 | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 10 | 0.30 |
| security | 9 | 0.25 |
| architecture | 10 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 9 | 0.10 |
| testing | 10 | 0.10 |

- **total**: 9.60

## Summary

`packages/iam` の実装は設計・仕様・受け入れ基準をすべて満たしている。

**受け入れ基準の確認:**

- ✅ `package.json` name が `@koma/iam`、禁止依存（next/react/drizzle-orm/zod）ゼロ、`@koma/shared: workspace:*` 依存あり
- ✅ `pnpm -F @koma/iam run check-types` 成功（verification-result で確認済み）
- ✅ `can` 真理値表: owner × 全 Permission = true、staff × 業務系 4 件 = true、staff × manage-users/manage-settings = false（role.test.ts 7 テスト全 pass）
- ✅ `User`: email 空で構築不可、passwordHash/role 保持、immutable（user.test.ts 9 テスト全 pass）
- ✅ `UserRepository`: findByEmail/findById/save/list の全動作（in-memory-user-repository.test.ts 8 テスト全 pass）
- ✅ `pnpm -r --if-present run check-types && pnpm -r --if-present run test` green（packages/iam: 24 tests、既存パッケージ含む全体 green）

**test-cases.md との照合:**

- must 25 件: すべてカバー済み（TC-001〜TC-021, TC-025, TC-027〜TC-029）
- should 4 件: すべてカバー済み（TC-022〜TC-024, TC-026）

**設計上の適合:**

- `Role`・`Permission` は union literal、`as const` 配列から型を導出するパターンで `ROLE_PERMISSIONS` の網羅性を型で保証している
- `ROLE_PERMISSIONS.staff` を `filter` で導出しているため、Permission 追加時に staff 側の更新漏れがコンパイルエラーとして検出される
- `updateUser` が内部で `createUser` を呼ぶことで email 非空バリデーションが更新時にも再適用される
- `passwordHash` をドメインがバリデーションしない設計（D5）を正しく実装している
- crm パッケージのパターン（集約 / port / in-memory / index.ts barrel）を忠実に踏襲している

info 2 件のみで critical/high/medium 発見なし。**approved**。
