# Test Cases: shared-kernel

## Summary

- **Total**: 53 cases
- **Automated** (unit/integration): 52
- **Manual**: 1
- **Priority**: must: 34, should: 17, could: 2

---

## Package Scaffold

### TC-001: パッケージ名が @koma/shared で禁止依存が存在しない

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-01: packages/shared パッケージ scaffold

**GIVEN** `packages/shared/package.json` が作成されている
**WHEN** name フィールドを確認し、`grep -E '"(next|react|drizzle-orm|zod)"' packages/shared/package.json` を実行する
**THEN** name が `"@koma/shared"` であり、grep の出力が 0 件である

---

### TC-002: check-types スクリプトが成功する

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-01: packages/shared パッケージ scaffold

**GIVEN** `@koma/shared` が pnpm workspace に組み込まれている
**WHEN** `pnpm -F @koma/shared run check-types` を実行する
**THEN** exit code 0 で成功する

---

### TC-003: test スクリプトが成功する

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-01: packages/shared パッケージ scaffold

**GIVEN** `@koma/shared` が pnpm workspace に組み込まれている
**WHEN** `pnpm -F @koma/shared run test` を実行する
**THEN** vitest が起動し、exit code 0 で成功する

---

### TC-004: lint スクリプトが成功する

**Category**: integration
**Priority**: should
**Source**: tasks.md > T-01: packages/shared パッケージ scaffold

**GIVEN** `@koma/shared` が pnpm workspace に組み込まれている
**WHEN** `pnpm -F @koma/shared run lint` を実行する
**THEN** exit code 0 で成功する

---

## Id 値オブジェクト

### TC-005: createId が UUID v4 形式の Id を生成する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Id の生成は有効な UUID v4 を返す > Scenario: createId が UUID v4 形式の Id を生成する

---

### TC-006: 2 回の createId は異なる値を返す

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: Id の生成は有効な UUID v4 を返す > Scenario: 2 回の createId は異なる値を返す

---

### TC-007: 有効な UUID 文字列を parse できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Id の parse は不正値を拒否する > Scenario: 有効な UUID 文字列を parse できる

---

### TC-008: 空文字を parse するとエラーになる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Id の parse は不正値を拒否する > Scenario: 空文字を parse するとエラーになる

---

### TC-009: UUID 形式でない文字列を parse するとエラーになる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Id の parse は不正値を拒否する > Scenario: UUID 形式でない文字列を parse するとエラーになる

---

### TC-010: 同一文字列由来の Id は等価

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Id の等価判定は値ベースである > Scenario: 同一文字列由来の Id は等価

---

### TC-011: 異なるブランドの Id は型非互換である

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-02: Id 値オブジェクト

**GIVEN** `Id<'Customer'>` 型の変数 `customerId` が定義されている
**WHEN** `Id<'Booking'>` 型の変数に `customerId` を代入しようとする（`@ts-expect-error` でガード）
**THEN** TypeScript が型エラーを報告し、`@ts-expect-error` が有効に機能しているため `check-types` が pass する

---

### TC-012: isEqualId が値ベースで比較する

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-02: Id 値オブジェクト

**GIVEN** 同一の UUID 文字列 `uuid` から `parseId<'Customer'>(uuid)` と `parseId<'Booking'>(uuid)` で 2 つの Id を生成する
**WHEN** `isEqualId(a, b)` を呼ぶ
**THEN** `true` が返る（runtime は素の文字列比較であるため）

---

## Money 値オブジェクト

### TC-013: 整数 amount で Money を生成できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Money は整数の最小通貨単位のみを受け付ける > Scenario: 整数 amount で Money を生成できる

---

### TC-014: 小数 amount は拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Money は整数の最小通貨単位のみを受け付ける > Scenario: 小数 amount は拒否される

---

### TC-015: 負の整数 amount は許可される

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: Money は整数の最小通貨単位のみを受け付ける > Scenario: 負の整数 amount は許可される

---

### TC-016: 同一通貨の加算は成功する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Money の通貨不一致演算はエラーになる > Scenario: 同一通貨の加算は成功する

---

### TC-017: 同一通貨の減算は成功する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Money の通貨不一致演算はエラーになる > Scenario: 同一通貨の減算は成功する

---

### TC-018: 異なる通貨の加算はエラーになる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Money の通貨不一致演算はエラーになる > Scenario: 異なる通貨の加算はエラーになる

---

### TC-019: 異なる通貨の減算はエラーになる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Money の通貨不一致演算はエラーになる > Scenario: 異なる通貨の減算はエラーになる

---

### TC-020: Money のプロパティを書き換えようとすると失敗する

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Money は不変である > Scenario: Money のプロパティを書き換えようとすると失敗する

---

### TC-021: compareMoney は a < b のとき負の数を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03: Money 値オブジェクト

**GIVEN** Money A = 500 JPY, Money B = 1000 JPY
**WHEN** `compareMoney(A, B)` を呼ぶ
**THEN** 負の数が返る

---

### TC-022: compareMoney は a === b のとき 0 を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03: Money 値オブジェクト

**GIVEN** Money A = 1000 JPY, Money B = 1000 JPY
**WHEN** `compareMoney(A, B)` を呼ぶ
**THEN** `0` が返る

---

### TC-023: compareMoney は a > b のとき正の数を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03: Money 値オブジェクト

**GIVEN** Money A = 1000 JPY, Money B = 500 JPY
**WHEN** `compareMoney(A, B)` を呼ぶ
**THEN** 正の数が返る

---

### TC-024: compareMoney は通貨不一致のときエラーを投げる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03: Money 値オブジェクト

**GIVEN** Money A = 1000 JPY, Money B = 10 USD
**WHEN** `compareMoney(A, B)` を呼ぶ
**THEN** 通貨不一致エラーが投げられる

---

### TC-025: isEqualMoney は amount と currency が一致するとき true を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03: Money 値オブジェクト

**GIVEN** Money A = 1000 JPY, Money B = 1000 JPY
**WHEN** `isEqualMoney(A, B)` を呼ぶ
**THEN** `true` が返る

---

### TC-026: isEqualMoney は amount が異なるとき false を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-03: Money 値オブジェクト

**GIVEN** Money A = 1000 JPY, Money B = 500 JPY
**WHEN** `isEqualMoney(A, B)` を呼ぶ
**THEN** `false` が返る

---

## Duration 値オブジェクト

### TC-027: ofMinutes で Duration を生成できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Duration は非負である > Scenario: ofMinutes で Duration を生成できる

---

### TC-028: ofHours で Duration を生成できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Duration は非負である > Scenario: ofHours で Duration を生成できる

---

### TC-029: 負のミリ秒は拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: Duration は非負である > Scenario: 負のミリ秒は拒否される

---

### TC-030: ゼロの Duration は許可される

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: Duration は非負である > Scenario: ゼロの Duration は許可される

---

### TC-031: 非整数ミリ秒は拒否される

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04: Duration 値オブジェクト

**GIVEN** milliseconds = 100.5（小数）
**WHEN** `ofMilliseconds(100.5)` を呼ぶ
**THEN** エラーが投げられる

---

### TC-032: toMilliseconds はミリ秒の整数値を返す

**Category**: unit
**Priority**: could
**Source**: tasks.md > T-04: Duration 値オブジェクト

**GIVEN** `ofMilliseconds(60_000)` で生成した Duration
**WHEN** `toMilliseconds(duration)` を呼ぶ
**THEN** `60000` が返る

---

### TC-033: toMinutes はミリ秒を分に変換して返す

**Category**: unit
**Priority**: could
**Source**: tasks.md > T-04: Duration 値オブジェクト

**GIVEN** `ofMinutes(30)` で生成した Duration
**WHEN** `toMinutes(duration)` を呼ぶ
**THEN** `30` が返る

---

### TC-034: isEqualDuration は milliseconds が一致するとき true を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-04: Duration 値オブジェクト

**GIVEN** `ofMinutes(30)` で生成した Duration a と Duration b（いずれも milliseconds = 1_800_000）
**WHEN** `isEqualDuration(a, b)` を呼ぶ
**THEN** `true` が返る

---

### TC-035: Duration は frozen で不変である

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-04: Duration 値オブジェクト

**GIVEN** `ofMinutes(30)` で生成した Duration
**WHEN** `duration.milliseconds = 0` を試みる
**THEN** strict mode でエラーが投げられる（`Object.freeze` により frozen object）

---

## TimeRange 値オブジェクト

### TC-036: start < end で TimeRange を構築できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: TimeRange は start < end の半開区間である > Scenario: start < end で TimeRange を構築できる

---

### TC-037: start == end は拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: TimeRange は start < end の半開区間である > Scenario: start == end は拒否される

---

### TC-038: start > end は拒否される

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: TimeRange は start < end の半開区間である > Scenario: start > end は拒否される

---

### TC-039: 完全に重なる区間は overlap

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: TimeRange の overlaps は半開区間の意味論に従う > Scenario: 完全に重なる区間は overlap

---

### TC-040: 部分的に重なる区間は overlap

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: TimeRange の overlaps は半開区間の意味論に従う > Scenario: 部分的に重なる区間は overlap

---

### TC-041: 一方が他方を包含する場合は overlap

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: TimeRange の overlaps は半開区間の意味論に従う > Scenario: 一方が他方を包含する場合は overlap

---

### TC-042: 隣接する区間は overlap しない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: TimeRange の overlaps は半開区間の意味論に従う > Scenario: 隣接する区間は overlap しない

---

### TC-043: 完全に離れた区間は overlap しない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: TimeRange の overlaps は半開区間の意味論に従う > Scenario: 完全に離れた区間は overlap しない

---

### TC-044: overlaps は対称である

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: TimeRange の overlaps は半開区間の意味論に従う > Scenario: overlaps は対称である

---

### TC-045: start 時点は含まれる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: TimeRange の contains は時点の包含を半開区間で判定する > Scenario: start 時点は含まれる

---

### TC-046: 区間内の時点は含まれる

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: TimeRange の contains は時点の包含を半開区間で判定する > Scenario: 区間内の時点は含まれる

---

### TC-047: end 時点は含まれない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: TimeRange の contains は時点の包含を半開区間で判定する > Scenario: end 時点は含まれない

---

### TC-048: 区間外の時点は含まれない

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: TimeRange の contains は時点の包含を半開区間で判定する > Scenario: 区間外の時点は含まれない

---

### TC-049: duration は end - start のミリ秒を Duration で返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: TimeRange の duration は区間の長さを Duration として返す > Scenario: duration は end - start のミリ秒を Duration で返す

---

### TC-050: isEqualTimeRange は start と end が一致するとき true を返す

**Category**: unit
**Priority**: should
**Source**: tasks.md > T-05: TimeRange 値オブジェクト

**GIVEN** `createTimeRange(100, 300)` で生成した TimeRange a と TimeRange b
**WHEN** `isEqualTimeRange(a, b)` を呼ぶ
**THEN** `true` が返る

---

### TC-051: TimeRange は frozen で不変である

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-05: TimeRange 値オブジェクト

**GIVEN** `createTimeRange(100, 300)` で生成した TimeRange
**WHEN** `range.start = 0` を試みる
**THEN** strict mode でエラーが投げられる（`Object.freeze` により frozen object）

---

## 統合・公開 API

### TC-052: pnpm -r --if-present run check-types && test が全体で green

**Category**: integration
**Priority**: must
**Source**: tasks.md > T-06: 公開 API 統合・最終 verification

**GIVEN** workspace 全体（`apps/web` および `packages/shared`）が正常に設定されている
**WHEN** `pnpm -r --if-present run check-types && pnpm -r --if-present run test` を実行する
**THEN** 両コマンドが exit code 0 で成功する

---

### TC-053: src/index.ts から全値オブジェクトの型・関数を import できる

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-06: 公開 API 統合・最終 verification

**GIVEN** `@koma/shared` パッケージが完全に実装されている
**WHEN** `import { Id, createId, parseId, isEqualId, Currency, Money, createMoney, addMoney, subtractMoney, compareMoney, isEqualMoney, Duration, ofMilliseconds, ofMinutes, ofHours, toMilliseconds, toMinutes, isEqualDuration, TimeRange, createTimeRange, overlaps, contains, isEqualTimeRange } from '@koma/shared'` を実行する
**THEN** インポートが成功し、各シンボルが定義されている

---

## Result

```yaml
result: completed
total: 53
automated: 52
manual: 1
must: 34
should: 17
could: 2
blocked_reasons: []
```
