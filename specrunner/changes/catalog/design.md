# Design: packages/catalog — Service 集約と ServiceRepository port

## Context

`packages/resource` と `packages/crm` が「ドメインパッケージ + Repository port（`src/port/`）+ in-memory 実装」パターンを確立済み。`catalog` コンテキストは `Service` 集約を同パターンで追加する。

`Service` は scheduling の「予約 = 顧客 × サービス × リソース × 時間枠」で使われるサービス定義。`@koma/shared` が提供する `Duration`（非負）・`Money`（整数最小通貨単位）・`Id<Brand>` を組み合わせて構成する。

spec-review（request-review-result-001.md）から 2 件の指摘あり:
- **MEDIUM**: `price` の非負制約が request に未定義。`createMoney` は負の整数を許容するため catalog 層でガードが必要。
- **LOW**: `name` の空文字許可/不可が未明文化。既存パッケージ（resource / crm）は空文字を許容している。

## Goals / Non-Goals

**Goals**:

- `packages/catalog` パッケージを新設し、workspace に統合する
- `Service` 集約を immutable 型 + ファクトリ関数 + 更新関数で実装する
- `ServiceRepository` port interface を `src/port/` に定義する
- in-memory 実装を提供する
- vitest テストで不変条件と Repository 契約を固定する

**Non-Goals**:

- PricingPolicy 戦略 interface（拡張点として将来導入）
- 税・オプション・割引・回数券
- Resource 実体との紐付け検証（種別タグで疎結合参照のみ）
- scheduling / Booking 連携
- Drizzle 永続化（`packages/db` で後続）
- 検索 / 絞り込み / ページネーション
- マルチテナント

## Decisions

### D1: resource パッケージのファイル構造・設定をそのまま踏襲する

**Rationale**: resource が確立したパターンを再発明せず横展開する。開発者の認知負荷を下げ、将来パッケージ追加時にも同じパターンを踏める。

ファイル構造:
```
packages/catalog/
├── package.json          # @koma/catalog, @koma/shared に workspace:* 依存
├── tsconfig.json         # resource と同一設定
├── eslint.config.js      # resource と同一設定
├── vitest.config.ts      # resource と同一設定
└── src/
    ├── index.ts                          # barrel export
    ├── service.ts                        # Service 型 + createService + updateService
    ├── service.test.ts                   # Service 不変条件テスト
    ├── port/
    │   └── service-repository.ts         # ServiceRepository interface
    ├── in-memory-service-repository.ts   # Map ベース in-memory 実装
    └── in-memory-service-repository.test.ts  # Repository 契約テスト
```

**Alternatives considered**: 独自の構造やモノファイル。却下 — 既存パターンからの逸脱は正当化できない。

### D2: `duration` は正（`> 0`）を `createService` でガードする

`@koma/shared` の `Duration` は非負（`>= 0`）を保証する。Service の所要時間は 0 分を許さない（0 分のメニューは無意味）ため、`createService` 内で `duration.milliseconds > 0` を追加検証する。

**Rationale**: Duration の型レベル制約（非負）と Service のドメイン制約（正）は責務が異なる。shared の Duration を「正のみ」に変更すると TimeRange 等の他用途に影響するため、ドメイン層で追加ガードするのが適切。

**Alternatives considered**: shared に `PositiveDuration` 型を追加。却下 — 現段階で Duration を使うのは catalog のみ。追加の型を正当化するには用途が不足。

### D3: `price` は非負（`>= 0`）を `createService` でガードする

spec-review MEDIUM 指摘を踏まえ、`createService` で `price.amount >= 0` をガードする。`createMoney` は整数であれば負も許容するが、サービス料金として負は業務上無意味。0 円は無料メニューとして許容する。

**Rationale**: Money 側に非負制約を入れると、将来の返金処理（subtractMoney 結果）等に支障をきたす。catalog ドメイン層で「サービス料金は非負」という業務制約をガードするのが責務の分離として正しい。

**Alternatives considered**: Money 自体に非負制約を追加。却下 — Money は汎用値オブジェクトであり、特定ドメインの制約を持ち込むべきでない。

### D4: `resourceKinds` は `readonly string[]` で Resource を疎結合参照する

`Service` が対応できる Resource の種別を文字列タグの配列で持つ。resource パッケージの `Resource.kind` と文字列で突き合わせる。catalog は resource を import しない。

**Rationale**: catalog と resource は兄弟コンテキスト（B-5）。型レベルで結合すると依存が逆流する。種別タグ（文字列）による疎結合参照は scheduling / delivery が composition 時に突き合わせる。

**Alternatives considered**: `Resource` の id を直接持つ。却下 — catalog が resource エンティティに強結合し B-5 違反に近づく。

### D5: `name` は既存パターンに倣い空文字を許容する

resource / crm の既存コードは `name` に空文字制約を持たない。catalog も同じ慣習に従う。将来的に全パッケージで非空制約を入れる場合は別 request で統一する。

**Rationale**: 整合性。1 パッケージだけ異なる制約を持つと不統一になる。

### D6: `updateService` は `createService` に委譲して全不変条件を再検証する

resource の `updateResource` と同パターン。patch を受け取り、`createService` に渡すことで duration 正・price 非負の不変条件を再検証する。

**Alternatives considered**: 個別フィールドの setter。却下 — immutable 更新パターンと相容れない。

## Risks / Trade-offs

- **[Risk]** `resourceKinds` のタグ値に typo があっても catalog 単体では検出できない → **Mitigation**: scheduling / delivery で Resource.kind との突き合わせ時に検出する。catalog 単体のスコープでは疎結合のトレードオフとして受容。
- **[Risk]** `price.amount >= 0` のガードは request に明記されていない追加制約 → **Mitigation**: spec-review の MEDIUM 指摘を根拠として設計判断に格上げ。テストで固定する。

## Open Questions

なし。
