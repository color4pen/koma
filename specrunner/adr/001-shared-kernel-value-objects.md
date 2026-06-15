# ADR-001: 共有カーネル（packages/shared）の確立と値オブジェクトパターン

- **status**: accepted
- **date**: 2026-06-15
- **change**: shared-kernel
- **deciders**: architect, spec-runner

## Context

Koma は Turborepo + pnpm workspaces のモジュラモノリスであり、`apps/web`（Next.js）に加えて将来的に `packages/scheduling` / `crm` / `notification` / `db` 等の複数ドメインパッケージを持つ。これらが共通で扱う型（識別子・金額・期間・時間区間）の表現方法と不変条件を、最初のパッケージ追加時点で統一的に確立する必要がある。

`docs/アーキテクチャ/domain-model.md` は値オブジェクト `Id<Brand>` / `Money` / `Duration` / `TimeRange` を `packages/shared`（shared-kernel 層）に置くと定めており、この決定はその最初の実体化にあたる。

共有カーネルはフレームワーク非依存（`next` / `react` / `drizzle-orm` / `zod` を import しない純粋 TS）でなければならない（`model.md` B-1〜B-4）。これが業種・配信・永続化をまたぐ汎用性の物理的担保となる。

## Decisions

### D1: パッケージ配信方式 — ソース参照（no build）

`package.json` の `exports` を `"./src/index.ts"` に向け、消費者が TypeScript ソースを直接 import する。`build` スクリプトは持たない。

**採用理由**: 内部 workspace パッケージは npm publish しない。Next.js は `transpilePackages` で workspace TS を直接処理でき、vitest もソースを直接読む。`dist/` 生成は不要な ceremony。

**却下案**: `tsc --build` で `dist/` に emit → 内部パッケージに build ステップを挟む複雑さに見合わない。

---

### D2: Id — branded string type + ファクトリ関数

```typescript
type Id<Brand extends string> = string & { readonly __brand: Brand }
```

runtime 値は素の文字列。型レベルで `Id<'Customer'>` と `Id<'Booking'>` を非互換にする。生成は `crypto.randomUUID()`（Node 20+ 標準 API）、parse は UUID v4 正規表現で検証し不正値はエラー。等価は `===`（文字列比較）。

**採用理由**: シリアライズ・JSON 往復・DB 格納がゼロコスト。外部依存なし。型レベルの安全性と runtime の軽さを両立する。

**却下案**:
- クラスベース Id → 直列化・比較・DB 往復のコストが高く、`JSON.stringify` で情報が欠落する
- `uuid` パッケージ → 標準 API で足りるのにカーネルに依存を増やす（B-4 の精神に反する）

**制約**: branded type は runtime では素の文字列。`as any` や `JSON.parse` 経由の値は brand を経由しない。deserialize 時は必ず `parseId` を通す規約とする。

---

### D3: Money — 整数最小通貨単位 + 通貨タグの frozen object

```typescript
type Currency = 'JPY'
type Money = { readonly amount: number; readonly currency: Currency }
```

`amount` は整数の最小通貨単位（JPY では円）。`Object.freeze` で runtime 不変性を保証。加算・減算・比較は通貨一致時のみ許可し、不一致は例外を投げる。

**採用理由**: 浮動小数の丸め誤差を構造的に排除。通貨不一致のサイレント変換は会計バグの温床なのでエラーで弾く。

**却下案**:
- 浮動小数の金額 → 丸め誤差
- 装飾文字列（`"¥1,000"`）→ 演算のたびに parse が要る
- 通貨不一致を 0 換算 → サイレントなデータ損失

---

### D4: Duration — 内部ミリ秒整数の frozen object

```typescript
type Duration = { readonly milliseconds: number }
```

非負整数。`ofMinutes` / `ofHours` / `ofMilliseconds` ファクトリで意図を表現。`Object.freeze` で不変。

**採用理由**: ミリ秒整数なら枠計算で端数が出ない。ファクトリ関数で `ofMinutes(30)` と書ける可読性を確保。

**却下案**: 浮動小数の「分」→ 端数で枠計算がずれる。

---

### D5: TimeRange — epoch ミリ秒の半開区間 `[start, end)`

```typescript
type TimeRange = { readonly start: number; readonly end: number }
```

半開区間 `[start, end)`。`start < end` を構築時に検証（違反はエラー）。`start` / `end` は epoch ミリ秒。`overlaps` / `contains` / `duration` を提供。隣接（`end === next.start`）は overlap しない。これが二重予約判定の基礎となる。

**採用理由**: 半開区間は連続予約枠が自然に隣接でき、二重予約判定で off-by-one を防ぐ。epoch ミリ秒は `Date` の可変性と tz 依存を回避する。

**却下案**:
- 閉区間 `[start, end]` → 連続予約が常に重なり扱いになる
- `Date` オブジェクト → 可変、tz 依存、比較が面倒

---

### D6: 不変性の強制方式 — `Object.freeze` + `readonly`

compound 型（Money / Duration / TimeRange）は `Object.freeze` で runtime 不変性を強制し、`readonly` で型レベル不変性を強制する二重保護を採用する。Id は primitive（string）なので本質的に不変。

**採用理由**: `readonly` だけでは `as any` やスプレッド経由の書き換えを防げない。shallow な構造には `Object.freeze` のコストが低く、防御的。

**制約**: 現時点の値オブジェクトはすべて shallow 構造。フィールドにオブジェクトを追加する場合は deep freeze を検討する。値オブジェクトは flat 構造を維持する設計方針とする。

---

### D7: テスト・lint 構成

- テスト: vitest（sibling 配置 `src/foo.test.ts`）、`vitest.config.ts` を `packages/shared/` に配置
- lint: ESLint + `typescript-eslint`（Next.js 非依存の純粋 TS パッケージに適合）
- `check-types`: `tsc --noEmit`

この scaffold は後続ドメインパッケージ（scheduling / crm / notification）のテンプレートとなる。

## Alternatives Considered

### Alternative 1: パッケージ配信に `tsc --build` + `dist/` emit（D1 却下）

**Pros**:
- 標準的な npm パッケージ配信パターンであり、消費者が TS を直接処理しなくてよい
- 型定義（`.d.ts`）が独立して存在するため IDE 補完が高速

**Cons**:
- 内部 workspace パッケージに不要な build ステップが加わり、CI が遅くなる
- `dist/` のコミット or gitignore 管理、ソースと成果物の乖離リスクが生じる
- Next.js の `transpilePackages` は TS ソース参照で動作するため二重処理になる

**Why not**: npm publish しない内部パッケージに build ceremony は不要。`--if-present` で不在スクリプトを skip できるため、`build` を持たないパッケージが verification を阻害しない。

---

### Alternative 2: クラスベース Id（D2 却下）

```typescript
class Id<Brand> {
  constructor(private readonly value: string) {}
  toString() { return this.value }
}
```

**Pros**:
- メソッドを直接持てる（`id.value`, `id.equals()` 等）
- 明示的な型でインテリセンスが直感的

**Cons**:
- `JSON.stringify` すると `{}` になりシリアライズ情報が欠落する
- DB からの読み込み・API レスポンスとの往復のたびに wrap/unwrap が必要
- `===` による等価比較が参照比較になるため、値等価には `.equals()` を強制する

**Why not**: shared-kernel の Id は DB 格納・JSON 往復・ログ出力で最も頻繁に使われる型。ゼロコストで文字列として扱える branded type が圧倒的に軽い。

---

### Alternative 3: `uuid` 外部パッケージによる Id 生成（D2 却下）

**Pros**:
- 枯れたライブラリで UUID v4/v7 等の複数バージョンに対応
- ブラウザ互換性が広い

**Cons**:
- shared-kernel に外部依存を追加する（B-4「カーネルは依存ゼロ」の精神に反する）
- Node 20+ では `crypto.randomUUID()` が標準 API として存在し、機能的に等価

**Why not**: 標準 API で足りる場面に外部パッケージを持ち込まない。依存ゼロはカーネルの可搬性の物理的担保。

---

### Alternative 4: 浮動小数の金額（Money）（D3 却下）

```typescript
type Money = { amount: number; currency: Currency }  // amount = 1000.5
```

**Pros**:
- 直感的な数値表現（`1000.5` 円など）

**Cons**:
- IEEE 754 浮動小数の丸め誤差（例: `0.1 + 0.2 = 0.30000000000000004`）が演算ごとに蓄積する
- 会計・請求計算で誤差が表面化すると修正困難

**Why not**: 最小通貨単位の整数（JPY なら円単位）で保持すれば丸め誤差は構造的に発生しない。

---

### Alternative 5: 装飾文字列による金額保持（Money）（D3 却下）

```typescript
type Money = { amount: string; currency: Currency }  // amount = "¥1,000"
```

**Pros**:
- 表示形式をそのまま保持できる

**Cons**:
- 加算・減算のたびに parse が必要でパフォーマンスとエラー処理が複雑化する
- 表示ロジックが値オブジェクトに混入する（関心の分離違反）

**Why not**: 値オブジェクトは計算に特化し、表示フォーマットは配信層の責務とする。

---

### Alternative 6: 通貨不一致のサイレント変換（Money）（D3 却下）

```typescript
// addMoney(jpyMoney, usdMoney) → USD を 0 円換算して加算
```

**Pros**:
- 例外が発生しないため呼び出し側の try-catch が不要

**Cons**:
- 換算レートが未定義の状態でサイレントに 0 換算するとデータ損失
- 会計バグが静かに本番データに混入し、検出が困難

**Why not**: 通貨不一致は必ず明示的なエラーにする。換算ロジックは別の明示的な操作として設計する（本 ADR スコープ外）。

---

### Alternative 7: 浮動小数の「分」による Duration（D4 却下）

```typescript
type Duration = { minutes: number }  // minutes = 30.5
```

**Pros**:
- 「30 分」という単位で直接扱える

**Cons**:
- 小数の分（例: `30.5`）を ms に変換すると `1830000` だが、積み重なると端数誤差が出る
- 異なる単位間の変換（分→時など）で精度が失われる

**Why not**: ミリ秒整数を内部表現とし `ofMinutes(30)` ファクトリで意図を表現する。端数は構造的に発生しない。

---

### Alternative 8: 閉区間 `[start, end]` による TimeRange（D5 却下）

```typescript
// overlaps([9:00, 10:00], [10:00, 11:00]) → true（連続予約が常に重なる）
```

**Pros**:
- 「終了時刻まで含む」という直感的な意味論

**Cons**:
- 隣接する連続予約（9:00〜10:00 と 10:00〜11:00）が常に重複判定される
- 二重予約チェックで連続予約を許可するために off-by-one の例外処理が必要になる

**Why not**: 半開区間 `[start, end)` なら隣接枠の `end === next.start` が overlap しないため、連続予約が自然に表現できる。off-by-one の特例処理が不要になる。

---

### Alternative 9: `Date` オブジェクトによる TimeRange の時刻表現（D5 却下）

```typescript
type TimeRange = { start: Date; end: Date }
```

**Pros**:
- 標準 API で人間が読みやすい形式
- `new Date('2026-01-01T09:00:00')` など ISO 文字列から直接生成できる

**Cons**:
- `Date` は可変（`date.setHours(10)` で破壊的変更が可能）
- タイムゾーン依存のメソッド（`getHours()` 等）が誤って使われると tz バグを招く
- 比較に `.getTime()` が必要で等価判定が煩雑

**Why not**: epoch ミリ秒（`number`）は本質的に不変で tz 非依存。表示 tz の処理は配信層の責務とする。

---

### Alternative 10: `readonly` のみによる不変性強制（D6 却下）

```typescript
// Object.freeze なし、型レベル readonly のみ
const money: Money = { readonly amount: 1000, readonly currency: 'JPY' }
```

**Pros**:
- zero runtime cost
- TypeScript の型システムだけで完結

**Cons**:
- `(money as any).amount = 9999` で型安全を迂回した書き換えが可能
- オブジェクトスプレッドや外部ライブラリ経由の変更を防げない

**Why not**: `Object.freeze` のコストは shallow な構造で無視できる。defense-in-depth として runtime でも不変性を保証する。

---

## Consequences

### Positive

- 全ドメインパッケージが共通の値オブジェクトパターンを持ち、Id の相互代入ミス・金額の丸め誤差・予約の二重判定 off-by-one を型レベル・テストレベルで防止できる
- `packages/shared` の scaffold が後続パッケージのテンプレートになる（verification が先例を機械的に検証済み）
- 禁止依存（`next` / `react` / `drizzle-orm` / `zod`）をゼロに保つことで、配信・永続化からの独立性が物理的に担保される

### Negative / Trade-offs

- branded type は runtime では素の文字列。deserialize 時に `parseId` を通さないと brand 安全性が失われるため、規約の周知が必要
- `Object.freeze` は shallow のみ。flat 構造の維持を設計方針として守り続ける必要がある
- 複数通貨の換算・i18n は本 ADR のスコープ外。追加時に Money の設計を再評価する

## References

- `docs/アーキテクチャ/domain-model.md` — 値オブジェクトの所在定義
- `docs/アーキテクチャ/model.md` — 層・依存規律 B-1〜B-4
- `docs/アーキテクチャ/dynamic-model.md` — 二重予約判定における TimeRange の役割
- `specrunner/changes/shared-kernel/design.md` — 詳細設計判断
