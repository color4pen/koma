# ADR-006: delivery 層（apps/web）の確立 — composition root / server action / zod/mini 境界検証パターン

- **status**: accepted
- **date**: 2026-06-17
- **change**: web-customers
- **deciders**: architect, spec-runner

## Context

`apps/web`（Next.js 15）は最小スキャフォールド（`layout.tsx` / `page.tsx` / `next.config.ts`）の状態であり、`@koma/crm` 等のワークスペースパッケージを一切利用していなかった。`docs/アーキテクチャ/model.md` は `apps/web` を composition root（配信層）と位置づけ、以下の制約を定めている。

- **B-3**: 入力検証は delivery 境界に置く。ドメインパッケージは `zod` を import しない
- delivery 層は domain パッケージの port interface に依存し、具象実装（adapter）を注入する責務を持つ
- delivery 層は `drizzle-orm` を直接 import しない（DB 依存は `@koma/db` が担う）

本 change は delivery 層の最初のスライス（顧客一覧・登録）として、**以降の全 delivery 機能が踏襲する 3 つの構造パターン**を同時に確立する。

1. **composition root**（`globalThis` singleton による DI: 具象生成を 1 箇所に閉じる）
2. **server action**（`'use server'` + `useActionState` シグネチャによる薄いユースケース層）
3. **`zod/mini` 境界検証**（delivery 境界でのフィールドエラー生成 + ドメインファクトリによる不変条件の二段防御）

加えて、`transpilePackages` による workspace TypeScript ソースの直接トランスパイルパターン、および `lib/` と `app/` の分離によるファイル配置規約を確立する。

過去の ADR-003（CRM ドメインパッケージ + Repository port）および ADR-005（永続化アダプタ `@koma/db`）が確立したパターンの上に、delivery 層のレイヤーを追加する形となる。

## Decisions

### D1: ファイル配置 — `lib/`（横断ロジック）と `app/`（ルート固有）の分離

```
apps/web/
  lib/
    composition-root.ts          — singleton CustomerRepository（横断）
    parse-customer-input.ts      — zod/mini 検証 + ドメイン構築（横断）
    parse-customer-input.test.ts — 単体テスト
  app/
    customers/
      page.tsx                   — server component（一覧 + フォーム配置）
      actions.ts                 — 'use server'（createCustomerAction）
      customer-form.tsx          — 'use client'（登録フォーム）
```

- `lib/` にルート横断のユーティリティ（composition root・検証関数）を配置する。テストは sibling 配置（プロジェクト規約）。
- `app/customers/` にルート固有ファイル（page / action / client component）を co-locate する。Next.js App Router は `page.tsx` 以外のファイルをルートとして扱わないため co-location が安全。
- server action は `app/customers/actions.ts` に分離し、`'use server'` ディレクティブで宣言する。ページと 1:1 で co-locate することで見通しを保つ。

**採用理由**: `lib/` と `app/` の分離により「ルート非依存のロジック」と「ルート固有の配信」を明確に区分する。後続の Resource / Service / Booking 画面でも同一レイアウトを踏襲できる。domain パッケージの sibling テスト配置を delivery にも適用する。

**却下案**:
- `lib/customers/` ディレクトリに action・検証を集約 → action は `'use server'` ディレクティブを持ちルートに密結合するため `app/` 側に置く方が自然
- `app/customers/lib/` にルート固有のロジックとして置く → composition root はアプリ全体で共有されるため `lib/` に置く必要がある

---

### D2: composition root — `globalThis` singleton パターン

```typescript
// lib/composition-root.ts
import { type CustomerRepository, createInMemoryCustomerRepository } from '@koma/crm';

const globalForApp = globalThis as unknown as {
  customerRepository: CustomerRepository | undefined;
};

export function getCustomerRepository(): CustomerRepository {
  if (!globalForApp.customerRepository) {
    globalForApp.customerRepository = createInMemoryCustomerRepository();
  }
  return globalForApp.customerRepository;
}
```

- `getCustomerRepository()` を唯一の accessor とする。server action / page はこの関数経由でのみ repo を取得する。
- `globalThis` に保持することで Next.js 開発時の HMR でモジュールが再評価されてもインスタンスを維持する（Prisma Client 等で確立済みのパターン）。
- 具象生成（`createInMemoryCustomerRepository`）をこの 1 箇所に閉じる。後続の Drizzle 移行時はこの 1 ファイルのみを差し替えれば全画面が切り替わる（swappability の実証）。
- 戻り値型は port（`CustomerRepository`）。具象型は外部に漏れない。

**採用理由**: 具象生成の散在を防ぎ、adapter の swappability を構造的に保証する。`globalThis` パターンは Next.js 公式の推奨プラクティスに合致する。DI コンテナの ceremony を避けつつ、port 境界を維持する最小の仕組みとなる。

**却下案**:
- モジュールレベル変数 → HMR でインスタンスがリセットされ開発体験が悪い
- page / action で直接 `createInMemoryCustomerRepository()` → 具象生成が散在し、Drizzle 移行で全箇所修正が必要
- DI コンテナ（inversify 等）→ solo 開発には過剰な ceremony であり、`model.md` の制約に反する

---

### D3: `parseCustomerInput` — `zod/mini` 境界検証 + ドメインファクトリの純関数

```typescript
// lib/parse-customer-input.ts
import * as z from 'zod/mini';
import { createContactInfo, createCustomer, type Customer } from '@koma/crm';

type ParseSuccess = { ok: true; customer: Customer };
type ParseFailure = { ok: false; errors: Record<string, string[]> };
export type ParseCustomerInputResult = ParseSuccess | ParseFailure;

export function parseCustomerInput(raw: unknown): ParseCustomerInputResult
```

- 引数は `unknown`（delivery 境界の生データ）。`zod/mini` スキーマが形状を検証する。
- スキーマ: `name`（trim + 非空文字列）、`phone`（任意文字列）、`email`（任意文字列）。オブジェクトレベルの refinement で「phone または email の少なくとも一方が非空」を要求する。
- 検証成功時: `createContactInfo({ phone, email })` → `createCustomer({ name, contact })` でドメイン `Customer` を構築し `{ ok: true, customer }` を返す。
- 検証失敗時: zod のイシューをフィールド名ごとに集約し `{ ok: false, errors }` を返す。repo には一切触れない。
- ドメインファクトリが throw する可能性（zod 検証をすり抜けたエッジケース）にも防御的に catch し `ok: false` を返す。

**「二段の防御」パターン**: `zod/mini` がユーザー向けフィールドエラー（UX）を提供し、`createContactInfo`/`createCustomer` が集約不変条件（安全性）を最終保証する。どちらか一方のみでは不十分（境界のみ = 不変条件が緩む、ドメインのみ = UX が悪い）。

**採用理由**: B-3 を実装するパターンとして確立する。純関数に抽出することで repo・server action の副作用から切り離しテスト可能になる。後続の全 delivery フォームが踏襲する標準パターンとなる。

**却下案**:
- server action 内に検証ロジックを直書き → テスト不能
- ドメインに zod スキーマを持たせる → B-3 違反。検証都合がドメインに漏れる
- zod のみで不変条件も担う → ドメイン不変条件が delivery 境界に漏れ、別チャネル利用時に不変条件が欠落するリスク

---

### D4: server action — `useActionState` シグネチャの薄いユースケース

```typescript
// app/customers/actions.ts
'use server';

export async function createCustomerAction(
  prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState>
```

- React 19 の `useActionState` と組み合わせるため、シグネチャは `(prevState, formData) => Promise<ActionState>` とする。
- 処理フロー: (1) `FormData` → plain object 変換 → `parseCustomerInput` 呼び出し (2) 失敗時は `{ ok: false, errors }` を返す (3) 成功時は `getCustomerRepository().save(customer)` → `revalidatePath('/customers')` → `{ ok: true }` を返す。
- server action は薄く保つ（ビジネスロジック・検証を持たない）。

**採用理由**: server action を「純関数 + save + revalidate」のパイプラインに限定し、テスト可能なロジックを外に出す。`useActionState` のシグネチャに従うことで React 19 の標準的なフォーム処理パターンを確立する。

**却下案**:
- `redirect` でページ遷移 → フィールドエラーをインライン表示できない
- `useFormState`（react-dom）→ React 19 で `useActionState`（react）に移行済みであり、非推奨

---

### D5: server / client コンポーネント境界

- `app/customers/page.tsx` は **server component**: `getCustomerRepository().list()` で顧客一覧を取得し描画する。フォーム部分は `CustomerForm` client component に委譲する。
- `app/customers/customer-form.tsx` は **`'use client'`**: `useActionState` でフォーム状態（エラー・送信中）を管理し、`createCustomerAction` を呼ぶ。
- 一覧表示は server component 内で完結する（client component に Customer データを渡す必要がない）。`revalidatePath` により action 成功後にページが再描画され一覧が更新される。

**採用理由**: server component を最大限活用し、client JavaScript を最小化する。`'use client'` は状態管理が必要なフォームのみに限定する。Customer オブジェクトのシリアライズ問題を回避する。後続の全 delivery ページが踏襲する基本的な server/client 分離パターンとなる。

**却下案**:
- ページ全体を `'use client'` → サーバーサイド一覧取得の利点を失う
- フォームも server component（`<form action={serverAction}>`）→ フィールドエラーのインライン表示に `useActionState` が必要で client component が必須

---

### D6: `transpilePackages` — workspace TypeScript ソースの直接トランスパイル

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  transpilePackages: ['@koma/crm', '@koma/shared'],
};
```

- `@koma/crm` と `@koma/shared` は `"exports": { ".": "./src/index.ts" }` で TypeScript ソースを直接 export している。Next.js の webpack はデフォルトで `node_modules` を外部扱いするため、`transpilePackages` で明示的にトランスパイル対象に含める必要がある。
- `@koma/shared` は `@koma/crm` の推移的依存であり、`@koma/crm` のソースをトランスパイルする際に `@koma/shared` の import に遭遇するため両方を明示する。
- 後続 delivery スライスで新たな workspace パッケージ（`@koma/scheduling` 等）を利用する際は、同様に `transpilePackages` に追加する。

**採用理由**: Turborepo の Internal Packages パターンに従い、各パッケージに `build` スクリプトを追加することなく TypeScript ソースを直接取り込む。開発体験（ウォッチ設定の複雑化を避ける）と既存パッケージの設計方針を維持する。

**却下案**:
- 各パッケージに `build` script + `dist/` 出力 → 開発時のウォッチ設定が複雑化し、既存パッケージの設計方針に反する
- `transpilePackages` なしで動作を期待 → webpack が `.ts` ファイルを処理できずビルド失敗

---

### D7: vitest 設定 — パスエイリアスのみ追加設定

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts', 'app/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

- vitest は TypeScript を native にトランスフォームするため、ワークスペースパッケージの `.ts` export は追加設定なしで解決できる。
- `@/*` エイリアスを `tsconfig.json` と同一に解決する追加設定のみ必要。

**採用理由**: 依存追加（`vitest-tsconfig-paths` 等）を避け、最小構成でパスエイリアスを解決する。後続の delivery テストも同一設定で動作する。

**却下案**: `tsconfig.json` を読み込むプラグイン → 追加依存が生じる。`resolve.alias` で十分。

---

### D8: `zod` バージョン — `zod/mini` サブパスと package.json の整合

- `zod` は `^4.0.0`（zod v4 semver 範囲）を指定し、インポートパス `zod/mini`（zod v4 の canonical public path）と整合させる。
- `zod/mini` は tree-shakeable variant でバンドルを小さく保つ。`zod/mini` を使う場合はフル `zod` からは import しない。

**採用理由**: package.json の制約とコードが使用する API サーフェスを整合させ、依存監査時の混乱を防ぐ。tree-shakeable variant により delivery bundle サイズを最小化する。

**却下案**:
- `^3.x` を指定しつつ `zod/v4/mini` パスを使用（zod 3.25.76 の re-export 経由）→ バージョン制約と API の不整合。将来の更新で破壊されるリスク
- フル `zod` を import → tree-shaking の利点を失う。B-3 のバンドルサイズ要件に反する

## Alternatives Considered

### Alternative 1: DI コンテナ（inversify / tsyringe 等）による依存注入

**Pros**: 大規模チームでのスケールに強い。型安全な DI が宣言的に書ける。

**Cons**: デコレータ / reflect-metadata 等の設定が必要で ceremony が大きい。solo 開発・小規模プロジェクトには過剰。Next.js の RSC モデルと相性問題が生じる可能性がある。

**Why not**: `model.md` は solo 開発・最小 ceremony を前提とする。`globalThis` singleton + 関数 accessor で delivery 層の DI 要件（単一インスタンス・差し替え可能）は十分に満たせる。

---

### Alternative 2: ドメイン層に zod スキーマを持たせ、delivery は呼び出すだけにする

**Pros**: 検証ロジックがドメインに集約される。delivery ごとの schema 定義が不要。

**Cons**: `model.md` B-3 違反。zod がドメインパッケージの依存に加わり、ドメインの純粋性が損なわれる。HTTP / CLI / GraphQL 等の複数 delivery チャネルごとに異なるフィールドエラー要件を満たせなくなる。

**Why not**: ドメインは zod を知らない（B-3）。delivery 境界での検証は delivery 固有のユーザー体験（フィールドエラーのラベル・メッセージ）を担うものであり、ドメインが担うべきでない。

---

### Alternative 3: `app/customers/page.tsx` を全て `'use client'` にする

**Pros**: 実装がシンプルになる。server/client 境界を意識しなくてよい。

**Cons**: 一覧取得が client-side fetch になり、SSR の恩恵がなくなる。サーバーサイドのキャッシュ・revalidation の仕組みを活用できない。不要な client JavaScript が増加する。

**Why not**: Next.js App Router の主要な利点（RSC による server-first 描画）を捨てることになる。本 change が確立するパターンとして、後続の全画面に悪影響を与える先例となる。

## Consequences

### Positive

- delivery 層の初スライスとして 3 つの構造パターン（composition root / server action / `zod/mini` 境界検証）が確立される。後続の Resource / Service / Booking 画面が本 ADR のパターンを先例として踏襲できる
- `globalThis` singleton + port 型によって具象生成が 1 箇所に閉じられ、Drizzle 永続化への移行が 1 ファイルの差し替えで完結することが構造的に保証される（swappability の実証）
- B-3（検証は delivery 境界・ドメインは zod を import しない）が `parseCustomerInput` という具体的な純関数として実装され、テストで固定される
- `transpilePackages` パターンにより、`@koma/crm`・`@koma/shared` の TypeScript ソースを delivery 層で直接利用できる。後続の workspace パッケージ追加でも同一手順で配線できる
- server action の `useActionState` シグネチャにより、React 19 標準のフォーム処理（フィールドエラーのインライン表示 + Pending 状態）が全フォームで一貫して利用できる

### Negative / Trade-offs

- `globalThis` singleton は in-memory repository の揮発性を持つ（サーバー再起動・HMR でデータが消える）。本スライスは設計意図通り。Drizzle 永続化は後続スライスで composition root の 1 箇所を差し替えて対応する
- `transpilePackages` に workspace パッケージを明示的に列挙する必要がある。後続スライスで新パッケージを追加する際は `next.config.ts` の更新も必要
- `parseCustomerInput` は delivery 固有の純関数であり、別 delivery チャネル（CLI / API route 等）を追加する場合は類似の parse 関数を新設する必要がある

## References

- `docs/アーキテクチャ/model.md` — 層・依存規律 B-1〜B-6（B-3: 検証は delivery 境界）
- `specrunner/adr/003-crm-domain-package-and-repository-port-pattern.md` — CustomerRepository port / ファクトリ関数パターンの確立
- `specrunner/adr/005-db-package-drizzle-pglite-persistence-adapter-pattern.md` — 永続化アダプタ層（後続 change で composition root を差し替える対象）
- `specrunner/changes/web-customers/design.md` — 詳細設計判断（D1〜D7）
- `apps/web/lib/composition-root.ts` — globalThis singleton 実装
- `apps/web/lib/parse-customer-input.ts` — zod/mini 境界検証 + ドメイン構築
- `apps/web/lib/parse-customer-input.test.ts` — 単体テスト（11 ケース）
- `apps/web/app/customers/actions.ts` — server action 実装
- `apps/web/app/customers/page.tsx` — server component 実装
- `apps/web/next.config.ts` — transpilePackages 設定
