# Design: shared-kernel

## Context

Koma は Turborepo + pnpm workspaces のモジュラモノリスで、現状 `apps/web`（Next.js scaffold）のみが存在する。`pnpm-workspace.yaml` は `packages/*` を認識済みだが、`packages/` ディレクトリ自体がまだ無い。

`docs/アーキテクチャ/domain-model.md` は値オブジェクト `Id<Brand>` / `Money` / `Duration` / `TimeRange` を `packages/shared`（shared-kernel 層）に置くと定めている。`model.md` B-4 は shared-kernel が他のどのパッケージも import しない最下層・純粋 TS であることを不変条件として課す。

本変更は monorepo 初のパッケージ追加であり、パッケージ scaffold（workspace 配線・tsconfig・テスト・lint）の先例と、全ドメインパッケージが依存する値オブジェクトの型パターンを同時に確立する。

## Goals / Non-Goals

**Goals**:

- `packages/shared`（`@koma/shared`）を pnpm workspace に組み込み、`check-types` / `test` / `lint` スクリプトが動作する状態にする
- 値オブジェクト Id / Money / Duration / TimeRange を実装し、vitest テストで不変条件を固定する
- 禁止依存（`next` / `react` / `drizzle-orm` / `zod`）をゼロに保ち B-1〜B-4 を物理的に満たす
- 後続ドメインパッケージ（scheduling / crm / notification）が依存できる安定した公開 API を `src/index.ts` から export する

**Non-Goals**:

- DomainEvent / EventBus port（別 request）
- 他ドメインパッケージの新設
- Drizzle スキーマ・永続化・直列化フォーマット
- 複数通貨の換算レート・i18n
- タイムゾーン処理
- `build` スクリプト（純粋 TS の内部パッケージはソース参照で十分。`--if-present` により不在でも verification を阻害しない）
- ルート `package.json` への `test` turbo タスク追加

## Decisions

### D1: パッケージ配信方式 — ソース参照（no build）

`package.json` の `exports` を `"./src/index.ts"` に向け、消費者（`apps/web` や将来の domain パッケージ）が TypeScript ソースを直接 import する。`build` スクリプトは持たない。

**Rationale**: 内部 workspace パッケージは npm publish しない。Next.js は `transpilePackages` で workspace TS を直接処理でき、vitest も TS ソースを直接読む。`dist/` 生成は不要な ceremony。

**Alternatives considered**: `tsc --build` で `.d.ts` + `.js` を `dist/` に emit → 消費者が `dist/` を参照。内部パッケージに build ステップを挟む複雑さに見合わない。

### D2: Id — branded string type + ファクトリ関数

```
type Id<Brand extends string> = string & { readonly __brand: Brand }
```

runtime 値は素の文字列。型レベルで `Id<'Customer'>` と `Id<'Booking'>` を非互換にする。生成は `crypto.randomUUID()`、parse は UUID v4 正規表現で検証。等価は `===`（文字列比較）。

**Rationale**: シリアライズ・JSON 往復・DB 格納がゼロコスト。外部依存なし（Node 20+ 標準 API）。型レベルの安全性と runtime の軽さを両立する。

**Alternatives considered**:
- クラスベース Id → 直列化・比較・DB 往復のコストが高く、JSON.stringify で情報が欠落する
- `uuid` パッケージ → 標準 API で足りるのにカーネルに依存を増やす（B-4 の精神に反する）

### D3: Money — 整数最小通貨単位 + 通貨タグの frozen object

```
type Money = { readonly amount: number; readonly currency: Currency }
```

`amount` は整数の最小通貨単位（JPY なら円）。`Object.freeze` で runtime 不変性を保証。加算・減算・比較は通貨一致時のみ許可し、不一致は例外を投げる。

**Rationale**: 浮動小数の丸め誤差を構造的に排除。通貨不一致のサイレント変換は会計バグの温床なのでエラーで弾く。

**Alternatives considered**:
- 浮動小数の金額 → 丸め誤差
- 装飾文字列（`"¥1,000"`）→ 演算のたびに parse が要る
- 通貨不一致を 0 換算 → サイレントなデータ損失

### D4: Duration — 内部ミリ秒整数の frozen object

```
type Duration = { readonly milliseconds: number }
```

非負整数。`ofMinutes` / `ofHours` / `ofMilliseconds` ファクトリで意図を表現する。`Object.freeze` で不変。

**Rationale**: ミリ秒整数なら枠計算で端数が出ない。ファクトリ関数で「30分」を `ofMinutes(30)` と書ける可読性を確保。

**Alternatives considered**: 浮動小数の「分」→ 端数で枠計算がずれる。

### D5: TimeRange — epoch ミリ秒の半開区間 frozen object

```
type TimeRange = { readonly start: number; readonly end: number }
```

半開区間 `[start, end)`。`start < end` を構築時に検証。`start` / `end` は epoch ミリ秒（`Date.getTime()` の値）。`overlaps` / `contains` / `duration` を提供。隣接（`end === next.start`）は overlap しない。

**Rationale**: 半開区間は連続予約枠が自然に隣接でき、二重予約判定で off-by-one を防ぐ。epoch ミリ秒は `Date` の可変性と tz 依存を回避する。

**Alternatives considered**:
- 閉区間 `[start, end]` → 連続予約が常に重なり扱いになる
- `Date` オブジェクト → 可変、tz 依存、比較が面倒

### D6: 不変性の強制方式

compound 型（Money / Duration / TimeRange）は `Object.freeze` で runtime 不変性を強制し、`readonly` で型レベル不変性を強制する。Id は primitive（string）なので本質的に不変。

**Rationale**: `readonly` だけでは `as any` やスプレッド経由の書き換えを防げない。`Object.freeze` はコストが低く（shallow で足りる浅い構造）、防御的。

### D7: テスト・lint 構成

- テスト: vitest。`vitest.config.ts` を `packages/shared/` に配置。sibling 配置（`src/foo.test.ts`）。
- lint: ESLint + `typescript-eslint`。`apps/web` の `next lint` は純粋 TS パッケージには不適切なため、標準的な ESLint 構成を使う。
- `check-types`: `tsc --noEmit`。

**Rationale**: vitest はプロジェクト標準。ESLint + typescript-eslint は Next.js 非依存の純粋 TS パッケージに適合する。

## Risks / Trade-offs

[Risk] **branded type の runtime 型安全性の限界** — branded string は型レベルの区別であり、runtime では素の文字列。`as any` や `JSON.parse` の結果は brand を経由しない。
→ Mitigation: ファクトリ関数（`createId` / `parseId`）を唯一の生成経路として文書化・テストする。deserialize 時は必ず `parseId` を通す規約を確立する。

[Risk] **Object.freeze の shallow 性** — 現時点の値オブジェクトはすべて shallow（ネストなし）なので問題ないが、将来フィールドにオブジェクトを追加すると freeze が効かない。
→ Mitigation: 値オブジェクトは flat 構造を維持する設計方針とする。ネストが必要になった場合は deep freeze を検討する。

[Risk] **monorepo 初パッケージの先例効果** — `packages/shared` の scaffold（tsconfig / vitest / eslint 設定）が後続パッケージのテンプレートになる。不備があると全パッケージに波及する。
→ Mitigation: verification（check-types / test / lint）を受け入れ基準に含め、scaffold の健全性を機械検証する。

## Open Questions

なし。request と architect 評価により設計判断は確定済み。
