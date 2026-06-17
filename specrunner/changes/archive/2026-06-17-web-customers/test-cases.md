# Test Cases: web-customers

## Summary

- **Total**: 26 cases
- **Automated** (unit/integration): 14 (unit: 12, integration: 2)
- **Manual**: 12
- **Priority**: must: 17, should: 8, could: 1

---

## parseCustomerInput — 有効入力

### TC-001: 名前と電話番号のみで Customer を構築できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseCustomerInput は有効な入力からドメイン Customer を構築する > Scenario: 名前と電話番号のみで Customer を構築できる

---

### TC-002: 名前とメールのみで Customer を構築できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseCustomerInput は有効な入力からドメイン Customer を構築する > Scenario: 名前とメールのみで Customer を構築できる

---

### TC-003: 名前・電話・メール全てで Customer を構築できる

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: parseCustomerInput は有効な入力からドメイン Customer を構築する > Scenario: 名前・電話・メール全てで Customer を構築できる

---

### TC-004: 構築された Customer は createCustomer 経由で生成される

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: parseCustomerInput は有効な入力からドメイン Customer を構築する > Scenario: 構築された Customer は createCustomer 経由で生成される

---

## parseCustomerInput — 名前バリデーション

### TC-005: 名前が空文字の場合はエラーを返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseCustomerInput は名前が空の場合にエラーを返す > Scenario: 名前が空文字の場合はエラーを返す

---

### TC-006: 名前がスペースのみの場合はエラーを返す

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: parseCustomerInput は名前が空の場合にエラーを返す > Scenario: 名前がスペースのみの場合はエラーを返す

---

## parseCustomerInput — 連絡先バリデーション

### TC-007: 電話もメールも未指定の場合はエラーを返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: parseCustomerInput は電話・メールが両方欠落している場合にエラーを返す > Scenario: 電話もメールも未指定の場合はエラーを返す

---

### TC-008: 電話もメールも空文字の場合はエラーを返す

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: parseCustomerInput は電話・メールが両方欠落している場合にエラーを返す > Scenario: 電話もメールも空文字の場合はエラーを返す

---

## parseCustomerInput — 型ガード（非 Scenario 由来）

### TC-016: raw が null の場合に ok: false を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04: parseCustomerInput の vitest テスト（型ガードのテスト）

**GIVEN** `null` を `parseCustomerInput` の引数として与える
**WHEN** `parseCustomerInput(null)` を呼ぶ
**THEN** `ok` が `false` であり、例外がスローされない

---

### TC-017: raw が文字列の場合に ok: false を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04: parseCustomerInput の vitest テスト（型ガードのテスト）

**GIVEN** 文字列 `"not-an-object"` を `parseCustomerInput` の引数として与える
**WHEN** `parseCustomerInput("not-an-object")` を呼ぶ
**THEN** `ok` が `false` であり、例外がスローされない

---

## composition root — singleton

### TC-009: 複数回呼び出しで同一インスタンスが返る

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: composition root は単一の CustomerRepository インスタンスを提供する > Scenario: 複数回呼び出しで同一インスタンスが返る

---

### TC-010: 1 回目の save データが 2 回目の list で取得できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: composition root は単一の CustomerRepository インスタンスを提供する > Scenario: 1 回目の呼び出しで save したデータが 2 回目の呼び出しで取得できる

---

## createCustomerAction — server action

### TC-011: 有効な FormData で Customer が保存される

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: createCustomerAction は有効な入力で Customer を保存し一覧を revalidate する > Scenario: 有効な FormData で Customer が保存される

---

### TC-012: 無効な FormData でエラーが返りデータは保存されない

**Category**: integration
**Priority**: must
**Source**: spec.md > Requirement: createCustomerAction は有効な入力で Customer を保存し一覧を revalidate する > Scenario: 無効な FormData でエラーが返りデータは保存されない

---

## 顧客一覧ページ — 描画

### TC-013: 登録済み顧客が一覧に表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 顧客一覧ページは登録済み顧客を表示し登録フォームを提供する > Scenario: 登録済み顧客が一覧に表示される

---

### TC-014: 顧客が 0 件の場合は空状態が表示される

**Category**: manual
**Priority**: should
**Source**: spec.md > Requirement: 顧客一覧ページは登録済み顧客を表示し登録フォームを提供する > Scenario: 顧客が 0 件の場合は空状態が表示される

---

### TC-015: 登録フォームがページに含まれる

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 顧客一覧ページは登録済み顧客を表示し登録フォームを提供する > Scenario: 登録フォームがページに含まれる

---

## 依存・設定（非 Scenario 由来）

### TC-018: package.json 依存関係が正しく設定されている

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01: 依存追加とプロジェクト設定 > Acceptance Criteria

**GIVEN** `apps/web/package.json` が存在する
**WHEN** `dependencies` / `devDependencies` / `scripts` を確認する
**THEN** `dependencies` に `@koma/crm`（`workspace:*`）と `zod` が存在し、`devDependencies` に `vitest` が存在し、`scripts` に `"test": "vitest run"` が存在する

---

### TC-019: drizzle-orm が apps/web/package.json に含まれていない

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01: 依存追加とプロジェクト設定 > Acceptance Criteria / request.md 受け入れ基準

**GIVEN** `apps/web/package.json` が存在する
**WHEN** `grep -E '"drizzle-orm"' apps/web/package.json` を実行する
**THEN** マッチ件数が 0 件である

---

### TC-020: transpilePackages 設定により next build が成功する

**Category**: manual
**Priority**: must
**Source**: design.md > D6: next.config.ts — transpilePackages でワークスペース TS ソースを処理 / tasks.md > T-08: 全体検証

**GIVEN** `apps/web/next.config.ts` に `transpilePackages: ['@koma/crm', '@koma/shared']` が設定されている
**WHEN** `pnpm -F web run build`（`next build`）を実行する
**THEN** ビルドが成功する（TypeScript ソース export のワークスペースパッケージが正しくトランスパイルされる）

---

### TC-021: createInMemoryCustomerRepository の具象生成が composition root の 1 箇所のみ

**Category**: manual
**Priority**: must
**Source**: design.md > D2: composition root — globalThis singleton パターン / tasks.md > T-08: 全体検証

**GIVEN** `apps/web` 配下の全 TypeScript ファイルを対象にする
**WHEN** `grep -r "createInMemoryCustomerRepository" apps/web/` を実行する
**THEN** `apps/web/lib/composition-root.ts` の 1 箇所のみにマッチし、他のファイルにマッチしない

---

### TC-022: actions.ts が 'use server' ディレクティブで始まる

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-05: createCustomerAction server action > Acceptance Criteria

**GIVEN** `apps/web/app/customers/actions.ts` が存在する
**WHEN** ファイル先頭を確認する
**THEN** 最初の非空行が `'use server';` である

---

### TC-023: customer-form.tsx が 'use client' ディレクティブで始まる

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-06: CustomerForm client component > Acceptance Criteria

**GIVEN** `apps/web/app/customers/customer-form.tsx` が存在する
**WHEN** ファイル先頭を確認する
**THEN** 最初の非空行が `'use client';` である

---

## フォーム UX（非 Scenario 由来）

### TC-024: isPending 中に送信ボタンが disabled になる

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-06: CustomerForm client component

**GIVEN** `CustomerForm` コンポーネントが描画されており、フォーム送信が進行中（`isPending === true`）である
**WHEN** 送信ボタンの状態を確認する
**THEN** ボタンが `disabled` 属性を持ち、テキストが「登録中...」に変化している

---

### TC-025: 登録成功後に完了メッセージが表示される

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-06: CustomerForm client component

**GIVEN** `CustomerForm` コンポーネントが描画されており、`createCustomerAction` が `{ ok: true }` を返した後
**WHEN** フォームの状態（`state.ok === true`）を確認する
**THEN** 登録完了を示すメッセージがフォーム内に表示される

---

## モノレポ全体検証（非 Scenario 由来）

### TC-026: monorepo 全体の check-types / test / build が green

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-08: 全体検証 > Acceptance Criteria / request.md 受け入れ基準

**GIVEN** monorepo 全パッケージが存在する
**WHEN** `pnpm -r --if-present run check-types && pnpm -r --if-present run test && pnpm -r --if-present run build` を実行する
**THEN** 全コマンドが 0 で終了し、`apps/web` 追加による他パッケージへの影響がない

---

## Result

```yaml
result: completed
total: 26
automated: 14
manual: 12
must: 17
should: 8
could: 1
blocked_reasons: []
```
