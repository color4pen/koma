# ADR-003: 初のドメインパッケージ（@koma/crm）の確立と「ドメインパッケージ + Repository port + in-memory 実装」パターン

- **status**: accepted
- **date**: 2026-06-15
- **change**: crm
- **deciders**: architect, spec-runner

## Context

Koma のモジュラモノリスは `packages/shared`（共有カーネル）のみを持ち、ドメインパッケージがまだ存在しない状態にあった。`docs/アーキテクチャ/model.md` はヘキサゴナルアーキテクチャを採用し、各ドメインは「domain パッケージが port（interface）を定義し、具象実装（adapter）は外側（`packages/db` 等）が担う」と定めている（B-2）。

`packages/crm`（`@koma/crm`）は monorepo 初のドメインパッケージである。Customer 集約・ContactInfo 値オブジェクト・CustomerRepository port・in-memory 実装を確立し、以降の全ドメインパッケージ（scheduling / notification / resource / catalog）が踏襲する**「ドメインパッケージ + Repository port + in-memory 実装」のパターン**を先例として敷く。

ADR-001（shared-kernel-value-objects）と ADR-002（shared-events-domain-event-bus）が確立した規約（readonly 型エイリアス + ファクトリ関数 + `Object.freeze`、class 不使用、禁止依存ゼロ）を集約にも継承する。

## Decisions

### D1: パッケージ scaffold — @koma/shared に倣う

`packages/crm/package.json` は `@koma/shared` と同一の scaffold を踏襲する。`private` / `type: module` / `exports: { ".": "./src/index.ts" }` / scripts `check-types`(`tsc --noEmit`) `test`(`vitest run`) `lint`(`eslint .`)。`dependencies` に `@koma/shared`（`workspace:*`）。禁止依存（`next` / `react` / `drizzle-orm` / `zod`）はゼロとする。`build` スクリプトは持たない（内部 workspace パッケージはソース参照で十分）。

**採用理由**: 初のドメインパッケージとして ADR-001 の scaffold 先例を継承し、後続パッケージが迷わず踏襲できるテンプレートにする。`@koma/shared` の検証済みパターンとの差分を最小化する。

**却下案**: 独自の build / bundler 設定 → 内部 workspace パッケージには不要な ceremony。`dist/` 生成は CI を遅くするだけで emit 先の管理コストが生じる。

---

### D2: Customer 集約 — readonly 型エイリアス + ファクトリ関数 + Object.freeze

```typescript
type Customer = {
  readonly id: Id<'Customer'>;
  readonly name: string;
  readonly contact: ContactInfo;
  readonly tags: readonly string[];
  readonly notes: string;
  readonly customFields: Readonly<Record<string, CustomFieldValue>>;
}
```

`createCustomer` ファクトリ関数で構築し、`Object.freeze` で runtime 不変性を保証する。更新は `updateCustomer(customer, patch)` が新しい `Customer` を返す。元インスタンスは変更しない（immutable 更新）。

**採用理由**: ADR-001 が確立した「readonly 型 + ファクトリ + `Object.freeze`・class 不使用」パターンを集約にも適用し、規約を統一する。immutable 更新により共有参照経由の不変条件破壊を防ぐ。

**却下案**:
- class + setter → 共有参照経由の不変条件破壊リスク。既存パッケージが class 不使用のパターンを確立済み
- spread のみで更新 → ContactInfo の不変条件（最低 1 つ）が検証されない。ファクトリ/更新関数で集約の不変条件を強制する

---

### D3: ContactInfo 値オブジェクト — 「電話 / メールの少なくとも 1 つ」を構築時に検証

```typescript
type ContactInfo = {
  readonly phone: string | null;
  readonly email: string | null;
}
```

`createContactInfo` ファクトリで構築時に「少なくとも 1 つ」を検証し、両方 null または空文字なら例外を投げる。電話番号・メールのフォーマット検証はドメインの責務外とする（入力検証は delivery 境界の責務）。

**採用理由**: ドメインは値オブジェクトの構造不変条件（少なくとも 1 つ存在する）だけを守る。フォーマット検証をドメインに持ち込むと業種・地域ごとの差異がドメインに漏れ、業種中立性（`model.md` B-6）が損なわれる。

**却下案**:
- 素の string フィールドを Customer に直置き → 「最低 1 つ」の不変条件を型で表現できない
- discriminated union（PhoneOnly / EmailOnly / Both） → フィールド追加のたびにバリアント爆発。runtime 検証で十分

---

### D4: customFields — Record<string, CustomFieldValue> の容れ物のみ

```typescript
type CustomFieldValue = string | number | boolean;
```

スキーマ定義・検証はドメインが持たない。ドメインはキーの存在・値の読み書きのみを提供する（拡張点。`domain-model.md` 拡張点 1）。スキーマの定義と検証は delivery / 設定が担う。

**採用理由**: `model.md` B-6（業種固有の語彙をドメインに持ち込まない）を満たす。美容サロンの「担当者」、飲食の「アレルギー」等は `customFields` で表現し、ドメインコードを汚さない。`CustomFieldValue` は JSON 直列化可能な最小プリミティブに限定する。

**却下案**:
- 業種別フィールドをドメインに first-class で持つ → B-6 違反。業種中立を壊す
- `Map<string, unknown>` → JSON 直列化で `Map` は素直に扱えない
- `unknown` 型 → 型安全性が低い。プリミティブ union に限定して最低限の型制約を与える

---

### D5: CustomerRepository port — interface をドメインの src/port/ に配置

```typescript
type CustomerRepository = {
  save(customer: Customer): Promise<void>;
  findById(id: Id<'Customer'>): Promise<Customer | null>;
  list(): Promise<Customer[]>;
}
```

型エイリアスとして定義。ドメインパッケージの `src/port/customer-repository.ts` に配置する。具象実装（Drizzle）は `packages/db` が後続で提供する。

`save` は upsert セマンティクス（同一 id なら上書き、新規なら挿入）とする。返り値は `Promise<void>`（ID 生成は呼び出し側が `createId` で事前に行う）。

**採用理由**: `dynamic-model.md` の永続化束縛に従い、domain が port を定義し adapter が実装する。`src/port/` 配置により `model.md` §2 の層 mapping に適合する。upsert セマンティクスにより save の呼び出し側が insert/update を区別する必要がない。後続ドメインパッケージが同一パターンで対応できる先例となる。

**却下案**:
- `insert` / `update` を分離 → 呼び出し側の判断負荷が増す。in-memory では Map.set で自然に upsert になる
- `save` が `Customer` を返す → ID 生成済みの集約を受け取るため、返す意味が薄い

---

### D6: 非同期 port シグネチャ — 全メソッドを Promise<T> で統一

全メソッドは `Promise<T>` を返す。後続で実装される Drizzle アダプタは本質的に非同期であり、port を同期シグネチャにすると adapter 実装時に port 契約の破壊的変更が確定する。Hexagonal の原則では port は安定した契約であるべきため、当初から非同期シグネチャとする。in-memory 実装は `Promise.resolve()` でラップして契約を満たす。

**採用理由**: `packages/db`（Drizzle）実装時に port 破壊的変更が不要となる。後続の全ドメインパッケージ（scheduling / notification）が踏襲する際も同一の非同期シグネチャパターンで対応できる。

**却下案**: 同期シグネチャ（`void` / `T | null` / `T[]`）→ in-memory 実装は単純になるが、Drizzle アダプタ実装時に port 契約の破壊的変更が確定する。後続の全ドメインパッケージに誤ったパターンが波及する。

---

### D7: in-memory CustomerRepository — ファクトリ関数 + クロージャ

```typescript
function createInMemoryCustomerRepository(): CustomerRepository
```

`Map<string, Customer>` を内部状態に持つクロージャベース。`save` は `Map.set` 後に `Promise.resolve()` を返す。`findById` は `Promise.resolve(map.get(id) ?? null)` を返す。`list` は `Promise.resolve([...map.values()])` を返す。

**採用理由**: ADR-002 の `createInMemoryEventBus` が確立したファクトリ関数 + クロージャパターンに従い、規約を統一する。外部依存ゼロで、テストとデフォルト実装を兼ねる。

**却下案**:
- class `InMemoryCustomerRepository` → 既存パッケージがファクトリ関数パターンを確立している。一貫性を損なう
- 配列ベース → `findById` で O(n) 走査が要る。Map は O(1)

---

### D8: 単一テナント — tenantId を持たない

`Customer` に `tenantId` フィールドを持たない。単一店舗（単一テナント）のユーザー方針に従う。

**採用理由**: ユーザー方針として現時点では単一店舗。将来 Organization を上流に足す移行で対応できる（`customFields` 含む全フィールドはそのまま引き継げる）。

**却下案**: マルチテナント（`tenantId` 追加）→ 現時点で必要のない複雑性。単一テナントでシンプルに始め、必要になったときに Organisation を上流に足す migration で対応する。

---

### D9: ファイル配置

```
packages/crm/
  package.json
  tsconfig.json
  vitest.config.ts
  eslint.config.js
  src/
    customer.ts                            — Customer 型 + createCustomer + updateCustomer
    customer.test.ts
    contact-info.ts                        — ContactInfo 型 + createContactInfo
    contact-info.test.ts
    port/
      customer-repository.ts              — CustomerRepository 型（port interface）
    in-memory-customer-repository.ts
    in-memory-customer-repository.test.ts
    index.ts                              — 公開 API の re-export
```

**採用理由**: sibling テスト配置（プロジェクト規約）。port は `src/port/` に配置（`model.md` §2 mapping）。ContactInfo は Customer と独立した値オブジェクトとして別ファイルに分離し、単体テスト可能にする。

**却下案**: 全てを 1 ファイルに → ファイルが大きくなり、port と実装の分離が曖昧になる。

## Alternatives Considered

### Alternative 1: ドメインから直接 DB/ORM アクセス（D5 却下）

```typescript
// packages/crm から drizzle-orm を直接 import
import { db } from '@koma/db'
```

**Pros**: 実装がシンプルになる。port/adapter の分離が不要。

**Cons**: `model.md` B-2 違反。永続化技術がドメインに漏れ、ORM の型・SQL 構文がドメインロジックに混入する。テスト時に DB が必要になり、ドメインの純粋性が失われる。将来の DB 変更でドメインも修正が必要になる。

**Why not**: ヘキサゴナルアーキテクチャの根本原則（domain は infra を知らない）に違反する。テスト可能性・変更容易性が著しく損なわれる。

---

### Alternative 2: port を shared-kernel（@koma/shared）に置く

```typescript
// packages/shared/src/port/customer-repository.ts
```

**Pros**: 全パッケージから参照しやすい。

**Cons**: `CustomerRepository` は CRM ドメインの関心事であり、shared-kernel に置くと shared-kernel が特定ドメインの知識を持つことになる。shared-kernel は業種・ドメインを横断する汎用型のみを持つべき（ADR-001）。

**Why not**: `src/port/` をドメインパッケージ内に置くことで、ドメインの凝集性を保ちつつ hexagonal の境界を表現する。

---

### Alternative 3: Repository に insert / update を分離

```typescript
type CustomerRepository = {
  insert(customer: Customer): Promise<void>;
  update(customer: Customer): Promise<void>;
  findById(id: Id<'Customer'>): Promise<Customer | null>;
  list(): Promise<Customer[]>;
}
```

**Pros**: insert と update の意図が明示的になる。

**Cons**: 呼び出し側が「存在確認 → 分岐」を毎回行う必要があり、判断負荷が増す。in-memory では `Map.set` で自然に upsert になるため、分離する実装上の意義がない。楽観的ロック等が必要になった場合は `update` の戻り値変更で対応できる。

**Why not**: upsert セマンティクスは「ID 生成済みの集約を渡せば保存できる」というシンプルなモデルを保つ。集約レベルでは insert/update の区別は不要であり、最小インターフェースが保守性を高める。

---

### Alternative 4: 同期 port シグネチャ（D6 却下）

```typescript
type CustomerRepository = {
  save(customer: Customer): void;
  findById(id: Id<'Customer'>): Customer | null;
  list(): Customer[];
}
```

**Pros**: in-memory 実装がシンプル。`Promise.resolve()` のラップが不要。

**Cons**: `packages/db`（Drizzle）実装時に port 契約の破壊的変更が確定する。Hexagonal の原則では port は安定した契約であるべき。後続の全ドメインパッケージ（scheduling / notification）がこの誤ったパターンを踏襲してしまう。

**Why not**: port は一度確立すると変更コストが高い。当初から非同期シグネチャを採用し、Drizzle アダプタ実装時の破壊的変更を防ぐ。

## Consequences

### Positive

- `packages/crm` が後続ドメインパッケージ（scheduling / notification / resource / catalog）の scaffold テンプレートになる。「このパッケージを見れば作り方がわかる」という先例が機械検証（check-types / test 25 件 / lint）で担保されている
- CustomerRepository port が `src/port/` に定義されることで、ドメインが永続化技術から分離される。`packages/db`（Drizzle）実装時に port 契約を変えずにアダプタを差し替えられる
- in-memory 実装により、CRM を使う上位サービスのテストが DB なしで書ける
- 非同期 port シグネチャにより、Drizzle アダプタ実装時に port 破壊的変更が不要となる
- 禁止依存（`next` / `react` / `drizzle-orm` / `zod`）ゼロを物理的に担保し、業種・配信・永続化からの独立性を保つ

### Negative / Trade-offs

- 非同期 port に合わせて in-memory 実装は `Promise.resolve()` でラップする必要がある。同期の値を `await` するオーバーヘッドは無視できるが、`await` を書く手間が増す
- `Object.freeze` の shallow 性により、`tags`（配列）と `customFields`（Record）はネストフィールドが変更可能。型レベルでの `readonly`・`Readonly<Record<...>>` 保護で補完する（ADR-001 D6 の制約と同じ）
- `customFields` の型安全性は `as any` 経由の注入を防げない。スキーマ検証は delivery 境界の責務であり、ドメインは容れ物のみを提供するという設計意図の周知が必要

## References

- `docs/アーキテクチャ/model.md` — 層・依存規律 B-1〜B-6、port の所在定義
- `docs/アーキテクチャ/domain-model.md` — Customer 集約・ContactInfo・customFields の定義
- `docs/アーキテクチャ/dynamic-model.md` — 永続化束縛（domain が port を定義し adapter が実装する）
- `specrunner/changes/crm/design.md` — 詳細設計判断（D1〜D7）
- `specrunner/adr/001-shared-kernel-value-objects.md` — 共有カーネルの確立と既存規約
- `specrunner/adr/002-shared-events-domain-event-bus.md` — EventBus port パターンの先例
- `packages/crm/src/port/customer-repository.ts` — CustomerRepository port 定義
- `packages/crm/src/in-memory-customer-repository.ts` — createInMemoryCustomerRepository 実装
