# packages/shared 共有カーネルを新設し、値オブジェクト Id / Money / Duration / TimeRange を確立する

## Meta

- **type**: new-feature
- **slug**: shared-kernel
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 新しい port/adapter 追加、既存パターンと異なる設計選択、振る舞い/契約を変える修正、構造的リファクタリング → true。いずれにも該当しない → false -->

## 背景

全ドメインパッケージ（scheduling / crm / notification …）が依存する**共有カーネル**を最初に確立する。
`docs/アーキテクチャ/domain-model.md` が値オブジェクト Id / Money / Duration / TimeRange を `packages/shared`（shared-kernel 層）に置くと定めており、本 request はその最初の実体化にあたる。
共有カーネルをフレームワーク非依存（`next` / `react` / `drizzle-orm` / `zod` 非 import）に保つこと自体が、業種・配信・永続化をまたぐ汎用性の物理的担保である（`model.md` B-1〜B-4）。

## 現状コードの前提

- `pnpm-workspace.yaml:3` が `packages/*` を workspace として認識する（`apps/*` と並ぶ glob 済み）。
- ルート `package.json:9-12` のスクリプトは `turbo run <task>`（dev / build / lint / check-types）。`test` タスクは未定義。
- `packages/` ディレクトリはまだ存在しない（現状は `apps/web` の Next.js 最小 scaffold のみ）。
- `.specrunner/config.json:5-8` の verification は `pnpm -r --if-present run {check-types,test,lint,build}` で各パッケージのスクリプトを直接叩く。

## 要件

<!-- 最重量部: パッケージ scaffold（workspace 配線・vitest・スクリプト）と branded Id の型レベル不変条件。これらを行間に隠さず名指しする。 -->

1. **packages/shared パッケージを新設する**。name は `@koma/shared`、純粋 TS。`dependencies` に `next` / `react` / `drizzle-orm` / `zod` を入れない（`model.md` B-1〜B-4）。`tsconfig.json`・vitest 設定・スクリプト `check-types`（`tsc --noEmit`）/ `test`（`vitest run`）/ `lint` を持ち、pnpm workspace に組み込む。公開 API は `src/index.ts` から re-export する。

2. **Id — branded typed identifier**。実体は `string` だが型レベルで別ブランドの Id を相互代入できない（`Id<'Customer'>` と `Id<'Booking'>` は非互換）。生成は標準 `crypto.randomUUID()`（Node 20+、依存ゼロ）。文字列からの parse と検証（不正値は拒否）を備える。等価は値ベース。

3. **Money — 通貨付き金額**。amount は**整数の最小通貨単位**で保持し浮動小数を使わない。通貨は最初 JPY を扱う。加算・減算・比較を提供し、**通貨不一致の演算はエラーにする**。不変（生成後は変更不可）。

4. **Duration — 期間**。内部をミリ秒の整数で保持し `ofMinutes` / `ofHours` 等のファクトリを持つ。非負。

5. **TimeRange — 時間区間**。`start < end` を不変条件とする**半開区間 `[start, end)`**。`overlaps` / `contains` / `duration` を提供する。隣接（前枠の `end` == 次枠の `start`）は overlap としない。これが二重予約判定の基礎になる（`dynamic-model.md`）。

6. すべての値オブジェクトは**不変**で、vitest テストを伴う。各 public 型・関数は `@koma/shared` の `src/index.ts` から import 可能にする。

## スコープ外

- DomainEvent 基底型・EventBus port（別 request）
- 他ドメインパッケージ（scheduling / crm / notification / db）の新設（別 request）
- Drizzle スキーマ・永続化・直列化フォーマット
- 複数通貨の換算レート・i18n
- タイムゾーン処理（TimeRange は時刻の絶対値のみを扱い、表示 tz は配信層の責務）
- ルート `package.json` への `test` turbo タスク追加（verification は `pnpm -r --if-present run test` で各パッケージのスクリプトを直接叩くため不要）

## 受け入れ基準

<!-- 機械検証できる文にする。 -->

- [ ] `packages/shared/package.json` の name が `@koma/shared` で、`grep -E '"(next|react|drizzle-orm|zod)"' packages/shared/package.json` が 0 件（禁止依存なし＝B-1〜B-4）
- [ ] `pnpm -F @koma/shared run check-types` が成功する（workspace に認識されている）
- [ ] Id: 別ブランドの Id を代入すると型エラーになる（`@ts-expect-error` でガードしたテストがある）／同一文字列由来の Id は値等価
- [ ] Money: amount が整数の最小通貨単位で保持され、通貨不一致の加算がエラーになることをテストで固定する
- [ ] TimeRange: `overlaps` / `contains` の真理値表をテストで固定する（隣接 `[a,b)`+`[b,c)` は overlap=false、`start >= end` は構築不可）
- [ ] 各値オブジェクト（Id / Money / Duration / TimeRange）に vitest テストがある
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green

## architect 評価済みの設計判断

<!-- 採用案 + 却下案。 -->

- **値オブジェクトは不変・値等価**。生成後変更不可にし、等価判定は構造に基づく。却下: 可変 setter（共有参照経由の不変条件破壊を招く）。
- **Id は branded string type**（`type Id<B> = string & { readonly __brand: B }`）。runtime は素の文字列でシリアライズ・比較が軽い。生成は `crypto.randomUUID()`。却下: クラスベース Id（直列化・比較・DB 往復のコストが高い）／`uuid` 等の外部依存（標準 API で足りるのでカーネルに依存を増やさない＝B-4 の精神）。
- **Money は整数の最小通貨単位 + 通貨タグ**。JPY は最小単位が円なので amount=円。却下: 浮動小数（丸め誤差）／金額を装飾文字列で保持（演算のたびに parse が要る）。通貨不一致演算はサイレントに 0 換算せずエラーで弾く。
- **TimeRange は半開区間 `[start, end)`**。隣接枠を衝突扱いしないため。却下: 閉区間 `[start, end]`（連続予約が常に重なり扱いになる）。時刻の内部表現は epoch ミリ秒の数値に寄せ、`Date` の可変性と tz 依存を避ける。
- **Duration は内部ミリ秒整数**。分・時のファクトリで意図を表現。却下: 浮動小数の「分」（端数で枠計算がずれる）。
- **adr: true** の理由: 共有カーネルの値オブジェクト・パターン（branded Id / 整数 Money / 半開 TimeRange）を確立する構造的決定であり、以降の全ドメインパッケージの前提になるため記録する。
