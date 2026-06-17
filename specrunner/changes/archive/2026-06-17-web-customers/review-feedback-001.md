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
| 1 | medium | testing | `apps/web/app/customers/actions.ts` | TC-011・TC-012（有効 FormData で Customer が保存される / 無効 FormData でエラーが返りデータは保存されない）が未自動化。test-cases.md は integration/must と定義しているが、テストファイルが存在しない。`parseCustomerInput` は 11 件のテストで網羅されているが、FormData 抽出 → save → revalidatePath の統合経路が機械検証されていない | `apps/web/app/customers/actions.test.ts` を新設し、`vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))` で `revalidatePath` をスタブ化。有効 FormData で `{ ok: true }` かつ `getCustomerRepository().list()` に Customer が追加される・無効 FormData（name 空）で `{ ok: false, errors }` かつ repo が変化しないことをテストする | yes |
| 2 | low | testing | `apps/web/lib/composition-root.ts` | TC-009・TC-010（複数回呼び出しで同一インスタンスが返る / save したデータが list で取得できる）が未自動化。test-cases.md は unit/must と分類しているが、tasks.md はコードレビューで確認可としており、実装コードは正しく 13 行で完結している | `composition-root.test.ts` を追加し `vi.stubGlobal` で globalThis を隔離した上で `getCustomerRepository() === getCustomerRepository()` の同一参照を検証する | yes |
| 3 | low | maintainability | `apps/web/package.json` | `"zod": "^3.25.0"`（v3 semver 範囲）を指定しつつ `zod/v4/mini` パスを使用している。zod 3.25.76 は `./v4/mini` を公開 export しているため動作するが、`./mini`（zod v4 の canonical public path）は v3 では未 export。package.json の制約とコードが使用する API サーフェスが不一致であり、将来の依存更新・依存監査時に混乱を招く可能性がある | `"zod": "^4.0.0"` にアップグレードし、インポートパス（`zod/v4/mini`）と package.json のバージョン制約を整合させる | yes |
| 4 | low | maintainability | `apps/web/next.config.ts` | design.md D6 に記載のない `extensionAlias` webpack 設定（`.js → [.ts, .tsx, .js]`）が追加されている。ワークスペース TS パッケージの import 解決に必要な実装詳細として妥当であり、ビルドが成功していることで動作が確認されている | 対応不要（ビルド正確性のための適切な追加） | no |

## Scores

| Category | Score | Weight |
|----------|-------|--------|
| correctness | 9 | 0.30 |
| security | 10 | 0.25 |
| architecture | 10 | 0.15 |
| performance | 9 | 0.10 |
| maintainability | 8 | 0.10 |
| testing | 7 | 0.10 |

- **total**: 9.10

## Summary

実装は仕様・設計の主要要件をすべて満たしており、verification（typecheck / test / lint / build）が全フェーズ passed。受け入れ基準の全項目が green であることを確認した。

**correctness**: `parseCustomerInput` の zod/v4/mini スキーマは name の trim + minLength・phone/email の少なくとも一方必須の二段検証を正しく実装している。`createContactInfo` / `createCustomer` の呼び出し順序、try/catch による防御的フォールバック、server action の FormData 抽出→parseCustomerInput→save→revalidatePath の処理フローはすべて設計通り。composition root の `globalThis` singleton も正確で、`createInMemoryCustomerRepository` の呼び出しは 1 箇所のみ（TC-021 確認済み）。

**security**: `'use server'` ディレクティブが正しく付与されており、入力は zod スキーマ検証を経由してからドメイン構築される。in-memory リポジトリのためインジェクションリスクなし。`drizzle-orm` が `apps/web/package.json` に含まれていないことを確認（TC-019 満足）。

**architecture**: B-3 遵守（zod は delivery 境界に留まり、ドメインパッケージへの漏れなし）。composition root パターン（D2）・server/client component 境界（D5）・`transpilePackages` 配線（D6）が設計通りに実装されている。`@koma/crm` / `@koma/shared` を除く禁止依存なし。

**performance**: 一覧取得は server component で行い、client JavaScript を最小化している。in-memory repo は設計意図通りで production スケールは後続スライスで対応する。

**maintainability**: ファイル構成（`lib/` にルート横断ロジック、`app/customers/` にルート固有ファイル）が design.md D1 通りで後続 delivery 機能の先例として明確。`extensionAlias` webpack 設定が設計書に記載されていない点は軽微。

**testing**: `parseCustomerInput` は 11 テスト（TC-001〜TC-008・TC-016・TC-017 に加え trim ケース）で完全網羅。ただし test-cases.md の must 項目のうち TC-009・TC-010（composition root singleton unit）と TC-011・TC-012（server action integration）が自動化されておらず、must カバレッジに 4 件の未実装がある。これらは medium/low 相当の軽微な gap であり、承認を妨げない。
