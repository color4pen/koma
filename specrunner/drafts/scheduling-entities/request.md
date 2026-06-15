# packages/scheduling を新設し、予約参照エンティティ Resource / Service（種別マッチング付き）を確立する

## Meta

- **type**: new-feature
- **slug**: scheduling-entities
- **base-branch**: main
- **adr**: true

<!-- adr 判断基準: 新しい port/adapter 追加、既存パターンと異なる設計選択、振る舞い/契約を変える修正、構造的リファクタリング → true。いずれにも該当しない → false -->

## 背景

予約コア `packages/scheduling`（`@koma/scheduling`、domain 層）を新設し、Booking が参照する2つのエンティティ **Resource**（予約枠の主体＝人/席/部屋/機材の抽象）と **Service**（提供メニュー）を確立する。

`docs/アーキテクチャ/domain-model.md` が Resource / Service / Availability を scheduling 内の「Booking の参照先」と定め、Booking の不変条件「`resourceId` は `Service` が対応する `Resource` 種別に属する」を要求している。本 request はその参照先のうち **Resource と Service、および両者の種別マッチング**を実体化する（Availability は時間ルールの policy として別 request、Booking 集約と空き枠導出も別 request）。

これは最初の **domain パッケージ**でもあり、以降の crm / notification が踏襲する「純粋 TS・shared だけに依存・factory で構築時検証・immutable」という domain パッケージのパターンを確立する。業種固有語彙（menu / 指名 等）は型・公開 API に持ち込まない（`model.md` B-6）。

## 現状コードの前提

<!-- 現状のコードについての断定（「今のコードはこうなっている」）は file:line を伴ってこの節に書く。
     これらは未検証の前提として扱われ、design / request-review が実コードと突き合わせる。 -->

- `pnpm-workspace.yaml:3` が `packages/*` を workspace として認識する。現状 `packages/` 配下は `shared` のみ。
- `packages/shared`（`@koma/shared`）は `src/index.ts` から値オブジェクト `Id` / `Money` / `Duration` / `TimeRange` ＋ `DomainEvent` / `EventBus` を re-export する。`Id<Brand>` は branded string、`Money` は整数最小通貨単位＋通貨タグ、`Duration` は非負ミリ秒整数。
- `packages/shared/package.json` の `dependencies` は空（`{}`）、devDeps に `typescript` / `vitest` / `eslint` 系。scripts は `check-types`（`tsc --noEmit`）/ `test`（`vitest run`）/ `lint`（`eslint .`）。`build` script は持たない。
- `packages/shared/tsconfig.json` は `target/module: ES2022`・`moduleResolution: bundler`・`strict: true`・`noEmit: true`。`vitest.config.ts` は `include: ['src/**/*.test.ts']`。ESM で相対 import は `.js` 拡張子付き。
- `.specrunner/config.json` の verification は `pnpm -r --if-present run {check-types,test,lint,build}`（各パッケージのスクリプトを直接叩く。`build` 未定義パッケージは `--if-present` でスキップ）。

## 要件

<!-- 最重量部: 新パッケージの workspace 配線、ResourceKind の開いた型設計（業種中立）、Service↔Resource の種別マッチング。 -->

1. **packages/scheduling パッケージを新設する**。name は `@koma/scheduling`、純粋 TS（domain 層）。`dependencies` は `@koma/shared`（workspace 参照）**のみ**。`next` / `react` / `drizzle-orm` / `zod` を入れない（`model.md` B-1〜B-4）。兄弟 domain（crm / notification）も import しない（B-5）。`tsconfig.json` / `vitest.config.ts` / `eslint.config.js` / scripts（`check-types` / `test` / `lint`）は `packages/shared` の構成に揃える。公開 API は `src/index.ts` から re-export する。

2. **ResourceKind — 予約枠の種別タグ**。人/席/部屋/機材などを表す**開いた**識別子（業種ごとに値を増やせる）。固定 enum にせず、業種固有語彙を型に焼き込まない（B-6）。branded string（`string & { readonly __brand }`）として factory で構築し、空文字は拒否する。値等価。

3. **Resource — 予約枠の主体**。`Id<'Resource'>`・`kind: ResourceKind`・表示名 `name` を持つ immutable なエンティティ。factory で構築し、生成後は変更不可（`readonly` ＋ freeze）。

4. **Service — 提供メニュー**。`Id<'Service'>`・`name`・所要 `duration: Duration`（shared）・料金 `price: Money`（shared）・対応種別 `eligibleResourceKinds: ResourceKind[]` を持つ immutable なエンティティ。factory で構築し、**duration は正（0 不可）**・**eligibleResourceKinds は非空**を構築時に強制する（違反は throw）。

5. **canBePerformedBy(service, resource): boolean — 種別マッチング**。`resource.kind` が `service.eligibleResourceKinds` に含まれるとき true。これが Booking 不変条件「resource は service の対応種別に属する」の純粋な土台になる。

6. すべてのエンティティ・値オブジェクトは immutable で vitest テストを伴い、`Resource` / `Service` / `ResourceKind` ＋各 factory ＋ `canBePerformedBy` を `@koma/scheduling` の `src/index.ts` から import 可能にする。

## スコープ外

- **Availability**（営業時間・休業・例外の policy、`openWindowsOn` 等の時間導出）— 別 request（時間ルールと precedence をまとめて扱う）。
- **Booking 集約・BookingStatus 状態機械・二重予約不変条件・Repository port** — 別 request（Repository port は永続化排他が要る Booking で導入する）。
- **空き枠導出 `availableSlots`** — 別 request（Availability × Resource × Service × active Bookings の crown jewel）。
- **Drizzle スキーマ・永続化**（`packages/db`）— 別 request。
- **PricingPolicy 等の戦略 interface・カスタムフィールド schema** — 拡張点であり別 request。Service は `price: Money` を直接持つに留める。
- **import 境界 lint（dependency-cruiser 等の歯）の導入** — 別 request。本 request の依存方向は package.json の dependencies で担保し grep で検証する。

## 受け入れ基準

<!-- 機械検証できる文にする。 -->

- [ ] `packages/scheduling/package.json` の name が `@koma/scheduling`、`dependencies` が `@koma/shared` のみで、`grep -E '"(next|react|drizzle-orm|zod)"' packages/scheduling/package.json` が 0 件（B-1〜B-4）。兄弟 domain（`@koma/crm` / `@koma/notification`）への依存も無い（B-5）
- [ ] `pnpm -F @koma/scheduling run check-types` が成功する（workspace に認識されている）
- [ ] ResourceKind: 空文字での構築が拒否され、同一文字列由来の ResourceKind は値等価（test）
- [ ] Service: `duration` が 0/負での構築が throw、`eligibleResourceKinds` が空での構築が throw（test で構築不可を固定）
- [ ] `canBePerformedBy` の真理値表をテストで固定する（`resource.kind ∈ service.eligibleResourceKinds` → true、それ以外 → false）
- [ ] Resource / Service が immutable（生成後の変更が型 or freeze で防がれる）であることをテストで確認する
- [ ] `Resource` / `Service` / `ResourceKind` ＋ factory ＋ `canBePerformedBy` が `@koma/scheduling` の `src/index.ts` から import 可能
- [ ] `pnpm -r --if-present run check-types && pnpm -r --if-present run test` が green（既存 `@koma/shared` テスト無変更で green）

## architect 評価済みの設計判断

<!-- 採用案 + 却下案。 -->

- **Resource / Service は scheduling（domain）に置く**。却下: shared に置く（これらは業務エンティティであって全層共有の値オブジェクトではない。kernel に domain 概念を引き込むと B-4 の業種中立が濁る）。
- **ResourceKind は branded な開いた string（factory 構築）**。人/席/部屋/機材は業種で増えるため固定 enum にしない（B-6 の業種中立）。却下 enum（語彙を型に焼き込む）／却下 素の `string`（typo を防げず型安全でない）。
- **Service は所要を `Duration`、料金を `Money`（ともに shared）で持つ**。kernel の不変条件（非負・整数最小通貨単位・通貨一致）を再利用する。却下: `number`(分) / `number`(円)（浮動小数誤差・通貨取り違えを防げず、kernel を確立した意味が消える）。
- **本 request は Booking の参照エンティティ（Resource / Service）に限定し、Repository port を導入しない**。port は永続化排他が必要になる Booking 集約の request で入れる（未使用 port を先に作らない＝`model.md` 様式の「未使用 port を入れない」）。Availability は時間ルールの policy として別軸なので別 request に分ける。
- **エンティティは immutable・factory で構築時検証**。不正状態（空種別・非正 duration・空対応種別）は構築時に throw して表現不能にする。却下: 可変 setter（共有参照経由で不変条件を破壊しうる）。
- **canBePerformedBy は純粋関数**（`(service, resource) => boolean`）。Booking の種別不変条件の検証に scheduling のユースケースが再利用する。
- **adr: true** の理由: 最初の domain パッケージを新設し、以降の crm / notification が踏襲する domain パッケージのパターン（純粋 TS・shared のみ依存・factory 構築時検証・immutable・index 集約）と ResourceKind の開いた型設計を確立する構造的決定であるため記録する。
