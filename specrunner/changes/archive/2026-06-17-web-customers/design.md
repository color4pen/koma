# Design: web-customers — delivery 層の顧客一覧・登録管理画面（composition root / server action / zod-mini 境界検証）

## Context

`apps/web` は Next.js 15 の最小スキャフォールド（`layout.tsx` / `page.tsx` / `next.config.ts` / `package.json`）で、依存は `next` / `react` / `react-dom` のみ。ワークスペースパッケージの参照もゼロである。

`@koma/crm`（`packages/crm`）は Customer 集約（`createCustomer` / `updateCustomer`）、ContactInfo 値オブジェクト（`createContactInfo`、電話・メール≥1 必須）、CustomerRepository port（`save` / `findById` / `list`）、および `createInMemoryCustomerRepository` を export している。全 export は TypeScript ソース（`"exports": { ".": "./src/index.ts" }`）。

`docs/アーキテクチャ/model.md` は delivery 層（`apps/web`）を composition root と位置づけ、`zod/mini` による入力検証を delivery 境界に置く（B-3）と定めている。ドメインは `zod` を import しない。

本変更は delivery 層の最初のスライスであり、以降の全 delivery 機能が踏襲する 3 つのパターンを確立する: (1) composition root（具象生成を 1 箇所に閉じる DI）、(2) server action（薄いユースケース層）、(3) `zod/mini` 境界検証（フィールドエラーの UX ＋ ドメイン不変条件の二段防御）。

### 現状コードの前提

- `@koma/crm` は `@koma/shared`（`workspace:*`）に依存し、`Id<'Customer'>` / `createId` を使う。`@koma/shared` も TypeScript ソース export。
- `apps/web/tsconfig.json` に `"@/*": ["./*"]` パスエイリアスが設定済み。
- `apps/web` に `vitest` / `zod` / `@koma/crm` は未導入。

## Goals / Non-Goals

**Goals**:

- `apps/web` に `@koma/crm`（`workspace:*`）と `zod` を dependencies に、`vitest` を devDependencies に追加し、`test` スクリプトを定義する
- composition root パターンを確立する: `globalThis` を使った singleton `CustomerRepository`（具象生成を 1 箇所に閉じる）
- `parseCustomerInput` を `zod/mini` スキーマ検証 ＋ ドメインファクトリ呼び出しの純関数として実装し、vitest テストで固定する
- `createCustomerAction` server action を薄く実装する（純関数 → save → revalidate）
- `app/customers/page.tsx`（server component）で顧客一覧を表示し、`'use client'` フォームコンポーネントで登録を受け付ける
- `next build` を通す（`transpilePackages` でワークスペース TS ソースを処理する）
- 後続 delivery 機能が踏襲するファイル配置・パターンの先例を確立する

**Non-Goals**:

- 顧客の編集・削除（一覧・登録のみ）
- Drizzle 永続化（本スライスは in-memory）
- 認証・認可
- 検索 / 絞り込み / ページネーション
- スタイリング（最小限の素 HTML）
- Resource / Service / 予約画面（後続スライス）

## Decisions

### D1: ファイル配置 — delivery 層の慣例を確立する

```
apps/web/
  package.json              — 依存追加
  next.config.ts            — transpilePackages 追加
  vitest.config.ts          — 新規
  lib/
    composition-root.ts     — 新規: singleton CustomerRepository
    parse-customer-input.ts — 新規: zod/mini 検証 + ドメイン構築
    parse-customer-input.test.ts — 新規: 単体テスト
  app/
    customers/
      page.tsx              — 新規: server component（一覧 + フォーム配置）
      actions.ts            — 新規: 'use server'（createCustomerAction）
      customer-form.tsx     — 新規: 'use client'（登録フォーム）
```

- `lib/` にルート横断のユーティリティ（composition root・検証関数）を配置する。テストは sibling 配置（プロジェクト規約）。
- `app/customers/` にルート固有ファイル（page / action / client component）を co-locate する。Next.js App Router は `page.tsx` 以外のファイルをルートとして扱わないため co-location が安全。
- server action は `app/customers/actions.ts` に分離し、`'use server'` ディレクティブで宣言する。ページと 1:1 で co-locate することで見通しを保つ。

**Rationale**: domain パッケージの sibling テスト配置を delivery にも適用する。`lib/` と `app/` の分離により「ルート非依存のロジック」と「ルート固有の配信」を明確に区分する。後続の Resource / Booking 画面でも同一レイアウトを踏襲する。

**Alternatives considered**: `lib/customers/` ディレクトリに action・検証を集約 → 却下。action は `'use server'` ディレクティブを持ちルートに密結合するため `app/` 側に置く方が自然。

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
- 具象生成（`createInMemoryCustomerRepository`）をこの 1 箇所に閉じる。Drizzle 移行時はこの 1 ファイルのみ差し替えれば全画面が切り替わる。
- 戻り値型は port（`CustomerRepository`）。具象型は外部に漏れない。

**Rationale**: architect 評価済み。具象生成の散在を防ぎ、adapter の swappability を構造的に保証する。`globalThis` パターンは Next.js 公式の推奨プラクティスに合致する。

**Alternatives considered**: (a) モジュールレベル変数 → HMR でインスタンスがリセットされ開発体験が悪い。(b) page / action で直接 `createInMemoryCustomerRepository()` → 具象生成が散在し Drizzle 移行で全箇所修正が必要（architect 却下済み）。(c) DI コンテナ → solo 開発で過剰な ceremony（`model.md` の制約）。

### D3: `parseCustomerInput` — zod/mini 検証 ＋ ドメインファクトリの純関数

```typescript
// lib/parse-customer-input.ts
import * as z from 'zod/mini';
import { createContactInfo, createCustomer, type Customer } from '@koma/crm';

type ParseSuccess = { ok: true; customer: Customer };
type ParseFailure = { ok: false; errors: Record<string, string[]> };
export type ParseCustomerInputResult = ParseSuccess | ParseFailure;

export function parseCustomerInput(raw: unknown): ParseCustomerInputResult
```

- 引数は `unknown`（配信境界の生データ）。zod/mini スキーマが形状を検証する。
- スキーマ: `name`（非空文字列）、`phone`（任意文字列）、`email`（任意文字列）。オブジェクトレベルの refinement で「phone または email の少なくとも一方が非空」を要求する。
- 検証成功時: `createContactInfo({ phone, email })` → `createCustomer({ name, contact })` でドメイン `Customer` を構築して `{ ok: true, customer }` を返す。
- 検証失敗時: zod のイシューをフィールド名ごとに集約し `{ ok: false, errors: { name: [...], ... } }` を返す。repo には一切触れない。
- ドメインファクトリ（`createContactInfo`）が throw する可能性（zod 検証をすり抜けたエッジケース）にも防御的に catch し、`ok: false` を返す。

**Rationale**: architect 評価済み「二段の防御」。zod/mini がユーザー向けフィールドエラーを返し（UX）、ドメインファクトリが集約不変条件を最終保証する（安全性）。純関数に抽出することで repo・server action の副作用から切り離しテスト可能にする。

**Alternatives considered**: (a) server action 内に検証ロジックを直書き → テスト不能（architect 却下済み）。(b) ドメインに zod スキーマを持たせる → B-3 違反（architect 却下済み）。(c) zod のみで不変条件も担う → ドメイン不変条件が配信境界に漏れ、別チャネルでの再利用時に不変条件が欠落するリスク。

### D4: server action — 薄いユースケース

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

**Rationale**: architect 評価済み。server action を「純関数 + save + revalidate」のパイプラインに限定し、テスト可能なロジックを外に出す。`useActionState` のシグネチャに従うことで React 19 の標準的なフォーム処理パターンを確立する。

**Alternatives considered**: (a) `redirect` でページ遷移 → フィールドエラーをインライン表示できない。(b) `useFormState`（react-dom）→ React 19 で `useActionState`（react）に移行済み。

### D5: server / client コンポーネント境界

- `app/customers/page.tsx` は **server component**: `getCustomerRepository().list()` で顧客一覧を取得し描画する。フォーム部分は `CustomerForm` client component に委譲する。
- `app/customers/customer-form.tsx` は **`'use client'`**: `useActionState` でフォーム状態（エラー・送信中）を管理し、`createCustomerAction` を呼ぶ。
- 一覧表示は server component 内で完結する（client component に Customer データを渡す必要がない）。`revalidatePath` により action 成功後にページが再描画され一覧が更新される。

**Rationale**: server component を最大限活用し、client JavaScript を最小化する。`'use client'` は状態管理が必要なフォームのみに限定する。Customer オブジェクトのシリアライズ問題を回避する。

**Alternatives considered**: (a) ページ全体を `'use client'` → サーバーサイド一覧取得の利点を失う。(b) フォームも server component（`<form action={serverAction}>`）→ フィールドエラーのインライン表示に `useActionState` が必要で、client component が必須。

### D6: `next.config.ts` — `transpilePackages` でワークスペース TS ソースを処理

```typescript
const nextConfig: NextConfig = {
  transpilePackages: ['@koma/crm', '@koma/shared'],
};
```

- `@koma/crm` と `@koma/shared` は `"exports": { ".": "./src/index.ts" }` で TypeScript ソースを直接 export している。Next.js の webpack ビルドはデフォルトで `node_modules` を外部扱いするため、`transpilePackages` で明示的にトランスパイル対象に含める必要がある。
- `@koma/shared` は `@koma/crm` の推移的依存だが、webpack が `@koma/crm` ソースを処理する際に `@koma/shared` の import に遭遇するため、`transpilePackages` に含めなければビルドが失敗する。

**Rationale**: Turborepo の Internal Packages パターンに従い、ワークスペースパッケージを TypeScript ソースのまま配信アプリに取り込む。ビルドステップの追加（各パッケージに `build` script）を避け、開発体験を維持する。

**Alternatives considered**: (a) 各パッケージに `build` script + `dist/` 出力 → 開発時のウォッチ設定が複雑化し、既存パッケージ（shared / crm / resource / catalog / scheduling）の設計方針に反する。(b) `transpilePackages` なしで動作を期待 → webpack が `.ts` ファイルを処理できずビルド失敗。

### D7: vitest.config.ts — パスエイリアスの解決

```typescript
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    include: ['lib/**/*.test.ts', 'app/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

- `@/*` エイリアスを tsconfig.json と同一に解決する。
- vitest は TypeScript を native にトランスフォームするため、ワークスペースパッケージの `.ts` export は追加設定なしで解決できる。

**Rationale**: `parseCustomerInput.test.ts` が `@koma/crm` を import する際、vitest のデフォルト TypeScript サポートで対応する。パスエイリアスのみ追加設定が必要。

**Alternatives considered**: `tsconfig.json` を vitest に読ませるプラグイン（`vitest-tsconfig-paths`）→ 依存追加。`resolve.alias` で十分。

## Risks / Trade-offs

[Risk] **delivery 層の先例効果** — 本変更が確立するファイル配置・composition root・検証パターンを後続の全 delivery 機能が踏襲する。不備があると全画面に波及する。
→ Mitigation: verification（`check-types` / `test` / `build`）を受け入れ基準に含め健全性を機械検証する。architect 評価済みの設計判断に従い差分を最小化する。

[Risk] **`transpilePackages` の推移的依存解決** — `@koma/shared` を `transpilePackages` に含めないと、`@koma/crm` のソース内 `@koma/shared` import でビルドが失敗する可能性がある。
→ Mitigation: `@koma/crm` と `@koma/shared` の両方を `transpilePackages` に明示する。ビルド検証で確認する。

[Risk] **in-memory repository のデータ揮発性** — サーバー再起動・HMR でデータが消える（production 用途には使えない）。
→ Mitigation: 設計意図通り。本スライスは in-memory で out-of-the-box 動作を実現し、Drizzle 永続化は後続スライスで composition root の 1 箇所を差し替えて対応する。

[Risk] **`zod/mini` の API 安定性** — `zod/mini` は zod v4 で導入された tree-shakeable サブパス。API が安定しているか。
→ Mitigation: `safeParse` / `z.object` / `z.string` / `z.optional` / `.check` のみ使用する最小サブセットに留める。

## Open Questions

なし。request の architect 評価済み設計判断に従い、未決定事項はない。
