# Tasks: shared-kernel

## T-01: packages/shared パッケージ scaffold

- [ ] `packages/shared/` ディレクトリを作成する
- [ ] `packages/shared/package.json` を作成する:
  - `name`: `"@koma/shared"`
  - `private`: `true`
  - `type`: `"module"`
  - `exports`: `{ ".": "./src/index.ts" }`
  - `scripts`: `check-types`（`tsc --noEmit`）、`test`（`vitest run`）、`lint`（`eslint .`）
  - `devDependencies`: `typescript`, `vitest`, `eslint`, `@eslint/js`, `typescript-eslint`
  - `dependencies` に `next` / `react` / `drizzle-orm` / `zod` を含めないこと
- [ ] `packages/shared/tsconfig.json` を作成する:
  - `target`: `"ES2022"`、`module`: `"ES2022"`（Node 20+ 対応）
  - `moduleResolution`: `"bundler"`
  - `strict`: `true`、`noEmit`: `true`
  - `include`: `["src"]`
- [ ] `packages/shared/vitest.config.ts` を作成する（デフォルト設定、`include` は `src/**/*.test.ts`）
- [ ] `packages/shared/eslint.config.js` を作成する（`@eslint/js` + `typescript-eslint` の推奨構成）
- [ ] `packages/shared/src/index.ts` を空ファイルとして作成する（後続タスクで re-export を追加）
- [ ] `pnpm install` を実行して workspace にパッケージを認識させる

**Acceptance Criteria**:
- `pnpm -F @koma/shared run check-types` が成功する
- `pnpm -F @koma/shared run test` が成功する（テスト 0 件で pass）
- `pnpm -F @koma/shared run lint` が成功する
- `grep -E '"(next|react|drizzle-orm|zod)"' packages/shared/package.json` が 0 件

## T-02: Id 値オブジェクト

- [ ] `packages/shared/src/id.ts` を作成する:
  - branded type: `type Id<Brand extends string> = string & { readonly __brand: Brand }`
  - `createId<B extends string>(): Id<B>` — `crypto.randomUUID()` で生成し、Id<B> として返す
  - `parseId<B extends string>(raw: string): Id<B>` — UUID v4 正規表現 `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i` で検証。不正値はエラーを投げる
  - `isEqualId(a: Id<string>, b: Id<string>): boolean` — `===` による値比較（型の同一性は呼び出し側の責務）
- [ ] `packages/shared/src/id.test.ts` を作成する:
  - `createId` が UUID v4 形式の文字列を返すことを検証
  - 2 回の `createId` が異なる値を返すことを検証
  - `parseId` が有効な UUID を受け入れることを検証
  - `parseId` が空文字・非 UUID 文字列でエラーを投げることを検証
  - 同一文字列由来の Id が `===` で等価であることを検証
  - **型テスト**: `@ts-expect-error` を使い、`Id<'Customer'>` を `Id<'Booking'>` 型の変数に代入すると型エラーになることを検証
- [ ] `packages/shared/src/index.ts` に `Id`, `createId`, `parseId`, `isEqualId` を re-export する

**Acceptance Criteria**:
- `pnpm -F @koma/shared run test` で Id 関連テストが全て pass
- `@ts-expect-error` による型非互換テストが存在し、`check-types` が pass（= `@ts-expect-error` が有効に機能している）
- 同一文字列由来の Id の値等価テストが存在する

## T-03: Money 値オブジェクト

- [ ] `packages/shared/src/money.ts` を作成する:
  - `type Currency = 'JPY'`（文字列リテラルユニオン。将来の通貨追加に備えた拡張点）
  - `type Money = { readonly amount: number; readonly currency: Currency }`
  - `createMoney(amount: number, currency: Currency): Money` — amount が整数でなければエラー。`Object.freeze` して返す
  - `addMoney(a: Money, b: Money): Money` — 通貨一致を検証、不一致はエラー。amount を加算した新しい Money を返す
  - `subtractMoney(a: Money, b: Money): Money` — 通貨一致を検証、不一致はエラー。amount を減算した新しい Money を返す
  - `compareMoney(a: Money, b: Money): number` — 通貨一致を検証。a < b なら負、a === b なら 0、a > b なら正を返す
  - `isEqualMoney(a: Money, b: Money): boolean` — amount と currency の両方が一致すれば `true`
- [ ] `packages/shared/src/money.test.ts` を作成する:
  - 整数 amount での生成を検証
  - 小数 amount がエラーになることを検証
  - 負の整数 amount が許可されることを検証
  - 同一通貨の加算・減算が正しい結果を返すことを検証
  - 通貨不一致の加算・減算がエラーを投げることを検証
  - compareMoney の比較結果を検証（a < b / a === b / a > b）
  - isEqualMoney の等価判定を検証
  - Money オブジェクトが frozen（プロパティ書き換え不可）であることを検証
- [ ] `packages/shared/src/index.ts` に `Currency`, `Money`, `createMoney`, `addMoney`, `subtractMoney`, `compareMoney`, `isEqualMoney` を re-export する

**Acceptance Criteria**:
- `pnpm -F @koma/shared run test` で Money 関連テストが全て pass
- amount が整数のみ受け付けることをテストで固定している
- 通貨不一致の加算がエラーになることをテストで固定している
- Money が frozen であることをテストで固定している

## T-04: Duration 値オブジェクト

- [ ] `packages/shared/src/duration.ts` を作成する:
  - `type Duration = { readonly milliseconds: number }`
  - `ofMilliseconds(ms: number): Duration` — 非負整数を検証。`Object.freeze` して返す
  - `ofMinutes(minutes: number): Duration` — `ofMilliseconds(minutes * 60_000)` に委譲
  - `ofHours(hours: number): Duration` — `ofMilliseconds(hours * 3_600_000)` に委譲
  - `toMilliseconds(d: Duration): number` — `d.milliseconds` を返す
  - `toMinutes(d: Duration): number` — `d.milliseconds / 60_000` を返す
  - `isEqualDuration(a: Duration, b: Duration): boolean` — milliseconds の値比較
- [ ] `packages/shared/src/duration.test.ts` を作成する:
  - `ofMinutes(30)` が milliseconds = 1_800_000 を返すことを検証
  - `ofHours(1)` が milliseconds = 3_600_000 を返すことを検証
  - `ofMilliseconds(0)` が許可されることを検証
  - `ofMilliseconds(-1)` がエラーを投げることを検証
  - 非整数ミリ秒がエラーを投げることを検証
  - `toMilliseconds` / `toMinutes` の変換を検証
  - `isEqualDuration` の等価判定を検証
  - Duration が frozen であることを検証
- [ ] `packages/shared/src/index.ts` に `Duration`, `ofMilliseconds`, `ofMinutes`, `ofHours`, `toMilliseconds`, `toMinutes`, `isEqualDuration` を re-export する

**Acceptance Criteria**:
- `pnpm -F @koma/shared run test` で Duration 関連テストが全て pass
- 負の値が拒否されることをテストで固定している
- ファクトリ関数のミリ秒変換が正しいことをテストで固定している

## T-05: TimeRange 値オブジェクト

- [ ] `packages/shared/src/time-range.ts` を作成する:
  - `type TimeRange = { readonly start: number; readonly end: number }`
  - `createTimeRange(start: number, end: number): TimeRange` — `start < end` を検証、違反はエラー。`Object.freeze` して返す
  - `overlaps(a: TimeRange, b: TimeRange): boolean` — 半開区間の重複判定: `a.start < b.end && b.start < a.end`
  - `contains(range: TimeRange, point: number): boolean` — `range.start <= point && point < range.end`
  - `duration(range: TimeRange): Duration` — `ofMilliseconds(range.end - range.start)` を返す（Duration への依存）
  - `isEqualTimeRange(a: TimeRange, b: TimeRange): boolean` — start と end の両方が一致すれば `true`
- [ ] `packages/shared/src/time-range.test.ts` を作成する:
  - `start < end` で構築できることを検証
  - `start === end` がエラーを投げることを検証
  - `start > end` がエラーを投げることを検証
  - **overlaps 真理値表**:
    - 完全一致: `[100,300)` vs `[100,300)` → `true`
    - 部分重複: `[100,300)` vs `[200,400)` → `true`
    - 包含: `[100,400)` vs `[200,300)` → `true`
    - 隣接: `[100,200)` vs `[200,300)` → `false`（二重予約判定の基礎）
    - 完全分離: `[100,200)` vs `[300,400)` → `false`
    - 対称性: `overlaps(A,B) === overlaps(B,A)` を検証
  - **contains 真理値表**:
    - start 時点: `contains([100,300), 100)` → `true`
    - 区間内: `contains([100,300), 200)` → `true`
    - end 時点: `contains([100,300), 300)` → `false`
    - 区間外: `contains([100,300), 50)` → `false`
  - `duration` が正しい Duration を返すことを検証
  - `isEqualTimeRange` の等価判定を検証
  - TimeRange が frozen であることを検証
- [ ] `packages/shared/src/index.ts` に `TimeRange`, `createTimeRange`, `overlaps`, `contains`, `duration` (名前衝突を避けるため `timeRangeDuration` 等のエイリアスを検討), `isEqualTimeRange` を re-export する

**Acceptance Criteria**:
- `pnpm -F @koma/shared run test` で TimeRange 関連テストが全て pass
- overlaps の真理値表（隣接 = false を含む）がテストで固定されている
- contains の半開区間判定（start 含む / end 含まない）がテストで固定されている
- `start >= end` の構築拒否がテストで固定されている

## T-06: 公開 API 統合・最終 verification

- [ ] `packages/shared/src/index.ts` の re-export が全値オブジェクトの public 型・関数を網羅していることを確認する
- [ ] `pnpm -F @koma/shared run check-types` が成功することを確認する
- [ ] `pnpm -F @koma/shared run test` が全テスト pass することを確認する
- [ ] `pnpm -F @koma/shared run lint` が成功することを確認する
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green であることを確認する（既存 `apps/web` を含めた全体 verification）
- [ ] `grep -E '"(next|react|drizzle-orm|zod)"' packages/shared/package.json` が 0 件であることを確認する

**Acceptance Criteria**:
- 全受け入れ基準が green:
  - `@koma/shared` の check-types / test / lint が pass
  - 禁止依存が 0 件
  - `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green
- `src/index.ts` から `Id`, `Money`, `Duration`, `TimeRange` とそれぞれのファクトリ・操作関数が import 可能
