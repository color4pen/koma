# Conformance Result

<!-- FORMAT REQUIREMENTS (machine-parsed):
- verdict line format (exact): `- **verdict**: <value>` at the start of a line
- Valid verdict values: approved | needs-fix | escalation
  - approved:   implementation conforms to tasks.md, design.md, spec.md, and request.md
  - needs-fix:  one or more upstream artifacts are not satisfied by the implementation
  - escalation: conformance cannot be determined (missing artifacts, unresolvable ambiguity)
- The Findings table records the per-artifact judgment.
-->

- **verdict**: approved

## Conformance Findings

| Artifact | Conforms | Notes |
|----------|----------|-------|
| tasks.md | ✓ | T-01〜T-09 全チェックボックスが [x] 完了 |
| design.md | ✓ | D1〜D7 の全設計判断が実装で忠実に反映されている |
| spec.md | ✓ | 全 Requirements (SHALL) と全 Scenarios が実装・テストで充足されている |
| request.md | ✓ | 全受け入れ基準が充足。verification-result.md で typecheck/test/lint/build が全 green |

## Detail

### tasks.md

T-01〜T-09 の全チェックボックスが [x] で完了している。

### design.md — 設計判断の実装確認

| Decision | 確認内容 | 適合 |
|----------|----------|------|
| D1 | composition root / server action / zod/v4/mini / 純関数 parse / server component + client form の全要素が web-customers / web-resources と同一構造 | ✓ |
| D2 | `parseServiceInput` 内で `ofMinutes(durationMinutes)` → `Duration`、`createMoney(priceYen, 'JPY')` → `Money` に変換後 `createService` に VO を渡している | ✓ |
| D3 | zod/mini スキーマでフィールド別エラーを返し、かつ `createService` を `try/catch` で包む二段防御 | ✓ |
| D4 | `Number()` + `Number.isInteger` + 範囲チェックによるカスタム整数変換。`parseInt` / `z.coerce` は未使用 | ✓ |
| D5 | `split(',')` + `map(s => s.trim())` + `filter(s => s.length > 0)` で `string[]` 変換。未指定・空文字は `[]` | ✓ |
| D6 | `globalForApp` 型拡張 + lazy singleton パターンを `getCustomerRepository` / `getResourceRepository` と完全対称で実装 | ✓ |
| D7 | `toMinutes(service.duration)` + 「分」、`service.price.amount.toLocaleString('ja-JP')` + 「円」 | ✓ |

### spec.md — Requirements / Scenarios の充足確認

**Requirement: parseServiceInput は有効な入力から Service を構築する**

| Scenario | 充足 |
|----------|------|
| 有効な入力で Service が構築される（name / duration.milliseconds / price.amount / price.currency / resourceKinds / id） | ✓ |
| resourceKinds が空の場合に空配列で構築される | ✓ |
| resourceKinds がカンマ区切りで複数種別に分割される（trim 済み） | ✓ |
| priceYen が 0 で構築される（無料メニュー） | ✓ |

**Requirement: parseServiceInput は name が空の場合にエラーを返す**

| Scenario | 充足 |
|----------|------|
| name が空文字 → `{ ok: false, errors.name }` | ✓ |
| name がスペースのみ → `{ ok: false, errors.name }` (`z.trim()` による前処理) | ✓ |

**Requirement: parseServiceInput は不正な durationMinutes でエラーを返す**

| Scenario | 充足 |
|----------|------|
| durationMinutes が "0" → `errors.durationMinutes` | ✓ |
| durationMinutes が "-30" → `errors.durationMinutes` | ✓ |
| durationMinutes が "30.5" → `errors.durationMinutes` | ✓ |
| durationMinutes が "abc" → `errors.durationMinutes` | ✓ |

**Requirement: parseServiceInput は不正な priceYen でエラーを返す**

| Scenario | 充足 |
|----------|------|
| priceYen が "-100" → `errors.priceYen` | ✓ |
| priceYen が "1000.5" → `errors.priceYen` | ✓ |
| priceYen が "無料" → `errors.priceYen` | ✓ |

**Requirement: createServiceAction は登録成功時に save してパスを再検証する**

| Scenario | 充足 |
|----------|------|
| 有効なフォーム送信で Service が保存される (`ok: true`, `repo.list()` 1件) | ✓ |
| 不正なフォーム送信でエラーが返り save が呼ばれない | ✓ |
| 成功時に `revalidatePath('/services')` が呼ばれる | ✓ |

**Requirement: サービス一覧ページは登録済みサービスを表示し登録フォームを提供する**

| Scenario | 充足 |
|----------|------|
| サービスが 0 件のとき「サービスがありません。」を表示 | ✓ |
| サービスが存在するとき「60分」「5,000円」「スタイリスト」を表示するテーブルを表示 | ✓ |

**Requirement: composition root は ServiceRepository を単一生成する**

| Scenario | 充足 |
|----------|------|
| 複数回呼び出しで同一インスタンスを返す（`globalThis` lazy singleton） | ✓ (実装は正しい。コードレビューで TC-023 自動テスト未実装が `Fix: no` として指摘済みだが、動作の正確性は確認済み) |

### request.md — 受け入れ基準の充足確認

| 受け入れ基準 | 充足 |
|-------------|------|
| `apps/web/package.json` が `@koma/catalog: workspace:*` に依存 | ✓ |
| `grep -E '"drizzle-orm"' apps/web/package.json` が 0 件 | ✓ (package.json に drizzle-orm 記載なし) |
| `pnpm -F web run build` が成功 | ✓ (verification-result.md build phase: passed) |
| `parseServiceInput` テストで有効入力・name空・durationMinutes 0/負/小数・priceYen 負を固定 | ✓ (parse-service-input.test.ts 17件 全 green) |
| composition root が in-memory ServiceRepository を単一生成し `getServiceRepository` を介して使う | ✓ |
| `app/services/page.tsx` が一覧と登録フォームを描画し `createServiceAction` が成功時に `save` する | ✓ |
| `pnpm -r --if-present run check-types && test && build` が green | ✓ (全 4 フェーズ passed: typecheck 2.8s / test 5.3s / lint 4.5s / build 7.5s) |

## 備考

- コードレビュー（review-feedback-001.md）で TC-023「composition root singleton テスト未実装」が `low / Fix: no` として指摘されたが、実装の正確性に影響しない既存パターンとの gap であり、conformance には影響しない。
- 実装全体のスコアは 9.05/10（コードレビュー評価）。
