# Design: crm

## Context

Koma は Turborepo + pnpm workspaces のモジュラモノリスで、`packages/shared`（`@koma/shared`）が値オブジェクト（Id / Money / Duration / TimeRange）と DomainEvent / EventBus 契約を提供する共有カーネルとして確立済み。`packages/` には `shared` のみが存在し、ドメインパッケージはまだ無い。

`docs/アーキテクチャ/model.md` は `packages/crm` を domain 層に配置し、`shared` のみに依存する（B-1〜B-5）と定めている。`domain-model.md` は Customer を `Id<'Customer'>` で識別される集約とし、連絡先の最低 1 つ保持と `customFields` の値容れ物を不変条件として定義している。`dynamic-model.md` は永続化束縛として「domain が port を定義し、adapter（db）が実装する」パターンを定めている。

本変更は monorepo 初のドメインパッケージ追加であり、以降の全ドメインパッケージ（scheduling / notification）が踏襲する「ドメインパッケージ + Repository port + in-memory 実装」のパターンを確立する。

## Goals / Non-Goals

**Goals**:

- `packages/crm`（`@koma/crm`）を pnpm workspace に組み込み、`check-types` / `test` / `lint` スクリプトが動作する状態にする
- Customer 集約と ContactInfo 値オブジェクトを実装し、不変条件（連絡先最低 1 つ・immutable 更新）を vitest テストで固定する
- CustomerRepository port（interface）をドメインに定義し、永続化の seam を確立する
- in-memory CustomerRepository 実装をテスト/デフォルト用に提供する
- 禁止依存（`next` / `react` / `drizzle-orm` / `zod`）をゼロに保ち B-1〜B-5 を物理的に満たす
- 後続ドメインパッケージが踏襲できるパッケージ構造・port 配置・テストパターンの先例を確立する

**Non-Goals**:

- Drizzle 永続化（`packages/db` は後続 request）
- 検索 / 絞り込み / ソート / ページネーション（本 request は最小 `list` のみ）
- 認証・ユーザー（`iam` は別コンテキスト）
- マルチテナント（単一テナント方針）
- 来店履歴の集計（`reporting` は別コンテキスト）
- カスタムフィールドのスキーマ定義・検証（拡張点として値の容れ物のみ）
- `build` スクリプト（純粋 TS の内部パッケージはソース参照で十分）

## Decisions

### D1: パッケージ scaffold — @koma/shared に倣う

`packages/crm/package.json` は `@koma/shared` と同一の scaffold を踏襲する: `private` / `type: module` / `exports: { ".": "./src/index.ts" }` / scripts `check-types`(`tsc --noEmit`) `test`(`vitest run`) `lint`(`eslint .`) / devDeps に eslint・typescript・vitest。`dependencies` に `@koma/shared`（`workspace:*`）を加える。`tsconfig.json` / `vitest.config.ts` / `eslint.config.js` も同一パターン。

**Rationale**: 初のドメインパッケージとして先例を確立する。`@koma/shared` が検証済みの scaffold パターンを持っているため、同一にすることで後続パッケージでも迷わない。

**Alternatives considered**: 独自の build / bundler 設定 → 内部 workspace パッケージには不要な ceremony（D1 は shared-kernel の設計判断を継承）。

### D2: Customer 集約 — readonly 型エイリアス + ファクトリ関数 + Object.freeze

```
type Customer = {
  readonly id: Id<'Customer'>;
  readonly name: string;
  readonly contact: ContactInfo;
  readonly tags: readonly string[];
  readonly notes: string;
  readonly customFields: Readonly<Record<string, CustomFieldValue>>;
}
```

`createCustomer` ファクトリ関数で構築し、`Object.freeze` で runtime 不変性を保証する。更新は `updateCustomer(customer, patch)` が新しい `Customer` を返すパターンとする。元インスタンスは変更しない。

**Rationale**: `@koma/shared` の値オブジェクトが確立した「readonly 型 + ファクトリ + Object.freeze」パターンを集約にも適用する。class を使わず関数ベースで統一する。immutable 更新により共有参照経由の不変条件破壊を防ぐ。

**Alternatives considered**:
- class + setter → 共有参照経由の不変条件破壊リスク。既存パッケージが class 不使用のパターンを確立している
- spread のみで更新 → ContactInfo の不変条件（最低 1 つ）が検証されない。ファクトリ/更新関数で集約の不変条件を強制する

### D3: ContactInfo 値オブジェクト — 「電話 / メールの少なくとも 1 つ」を構築時に検証

```
type ContactInfo = {
  readonly phone: string | null;
  readonly email: string | null;
}
```

`createContactInfo(phone, email)` ファクトリで構築時に「少なくとも 1 つ」を検証。両方 null なら例外を投げる。`Object.freeze` で runtime 不変。

電話番号・メールアドレスのフォーマット検証はドメインの責務外とする（入力検証は delivery 境界の `zod/mini` が担う）。ドメインは「存在するか」の構造不変条件のみを守る。

**Rationale**: フォーマット検証をドメインに持ち込むと B-3 の精神（検証は delivery 境界）に反し、業種や地域ごとのフォーマット差異がドメインに漏れる。ドメインは値オブジェクトの構造不変条件（少なくとも 1 つ存在する）だけを守る。

**Alternatives considered**:
- 素の string フィールドを Customer に直置き → 「最低 1 つ」の不変条件を型で表現できない。値オブジェクトに閉じ込めることで不変条件を 1 箇所で守れる
- discriminated union（PhoneOnly / EmailOnly / Both）→ フィールド追加のたびにバリアント爆発。runtime 検証で十分

### D4: customFields — Record<string, CustomFieldValue> の容れ物のみ

```
type CustomFieldValue = string | number | boolean;
type Customer = { ...; readonly customFields: Readonly<Record<string, CustomFieldValue>> }
```

スキーマ定義・検証は持たない。ドメインはキーの存在・値の読み書きのみを提供する。スキーマの定義と検証は delivery / 設定が担う（拡張点。`domain-model.md` 拡張点 1）。

**Rationale**: B-6（業種固有の語彙をドメインに持ち込まない）を満たす。美容サロンの「担当者」、飲食の「アレルギー」等は customFields で表現し、ドメインコードを汚さない。`CustomFieldValue` の union は JSON 直列化可能な最小プリミティブに限定する。

**Alternatives considered**:
- `Map<string, unknown>` → JSON 直列化で `Map` は素直に扱えない。`Record` + `Readonly` で十分
- `unknown` 型の値 → 型安全性が低い。プリミティブ union に限定して最低限の型制約を与える

### D5: CustomerRepository port — interface をドメインの src/port/ に配置

```
type CustomerRepository = {
  save(customer: Customer): void;
  findById(id: Id<'Customer'>): Customer | null;
  list(): Customer[];
}
```

型エイリアスとして定義。ドメインパッケージの `src/port/customer-repository.ts` に配置する。具象実装（Drizzle）は `packages/db` が後続で提供する。

`save` は upsert セマンティクス（同一 id なら上書き、新規なら挿入）とする。返り値は `void`（ID 生成は呼び出し側が `createId` で事前に行う）。

**Rationale**: `dynamic-model.md` の永続化束縛に従い、domain が port を定義し adapter が実装する。`src/port/` に配置することで `model.md` §2 の層 mapping（ports = 各 domain パッケージ内の `src/port/`）に適合する。upsert セマンティクスにより save の呼び出し側が insert/update を区別する必要がない。

**Alternatives considered**:
- `insert` / `update` を分離 → 呼び出し側の判断負荷が増す。in-memory では Map.set で自然に upsert になる
- `save` が `Customer` を返す → ID 生成済みの集約を受け取るため、返す意味が薄い

### D6: in-memory CustomerRepository — Map ベースのファクトリ関数

```
function createInMemoryCustomerRepository(): CustomerRepository
```

`Map<string, Customer>` を内部状態に持つクロージャベース。`save` は `Map.set`（id をキー）、`findById` は `Map.get ?? null`、`list` は `[...Map.values()]`。

**Rationale**: `@koma/shared` の `createInMemoryEventBus` が確立したファクトリ関数 + クロージャパターンに従う。外部依存ゼロで、テストとデフォルト実装を兼ねる。

**Alternatives considered**:
- class `InMemoryCustomerRepository` → 既存パッケージがファクトリ関数パターンを確立しているため統一
- 配列ベース → findById で O(n) 走査が要る。Map は O(1)

### D7: ファイル配置

```
packages/crm/
  package.json
  tsconfig.json
  vitest.config.ts
  eslint.config.js
  src/
    customer.ts              — Customer 型 + createCustomer + updateCustomer
    customer.test.ts         — Customer のテスト
    contact-info.ts          — ContactInfo 型 + createContactInfo
    contact-info.test.ts     — ContactInfo のテスト
    port/
      customer-repository.ts — CustomerRepository 型（port interface）
    in-memory-customer-repository.ts      — createInMemoryCustomerRepository
    in-memory-customer-repository.test.ts — in-memory 実装のテスト
    index.ts                 — 公開 API の re-export
```

**Rationale**: sibling テスト配置（プロジェクト規約）。port は `src/port/` に配置（`model.md` §2 mapping）。ContactInfo は Customer とは独立した値オブジェクトとして別ファイルに分離し、単体テスト可能にする。

**Alternatives considered**: 全てを 1 ファイルに → ファイルが大きくなり、port と実装の分離が曖昧になる

## Risks / Trade-offs

[Risk] **初のドメインパッケージの先例効果** — `packages/crm` のパッケージ構造・port 配置・テストパターンが後続の scheduling / notification のテンプレートになる。不備があると全ドメインパッケージに波及する。
→ Mitigation: verification（check-types / test / lint）を受け入れ基準に含め、scaffold の健全性を機械検証する。`@koma/shared` の検証済みパターンを踏襲して差分を最小化する。

[Risk] **Object.freeze の shallow 性** — Customer は `tags`（配列）と `customFields`（Record）をネストしている。shallow freeze では内部の配列・オブジェクトが変更可能。
→ Mitigation: `tags` は `readonly string[]` 型で型レベル保護。`customFields` は `Readonly<Record<...>>` 型。ファクトリ関数内で tags を `Object.freeze` し、customFields も `Object.freeze` する（1 段 deep freeze で十分な shallow 構造）。

[Risk] **customFields の型安全性の限界** — `CustomFieldValue = string | number | boolean` は runtime では何でも入り得る（`as any` 経由）。スキーマ検証がドメイン外にあるため、不正値の混入は delivery 次第。
→ Mitigation: 設計意図通り、ドメインは容れ物のみの責務。スキーマ検証は delivery / 設定で行う（拡張点 1）。

## Open Questions

なし。request と architect 評価により設計判断は確定済み。
