# Test Cases: apps/web に管理ナビゲーションとダッシュボード home を追加する

## Summary

- **Total**: 13 cases
- **Automated** (unit/integration): 2
- **Manual**: 11
- **Priority**: must: 7, should: 4, could: 2

---

### TC-001: layout にナビゲーションリンクが存在する

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 全ページに共通ナビゲーションヘッダを表示する > Scenario: layout にナビゲーションリンクが存在する

---

### TC-002: ナビゲーションは server component である

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: 全ページに共通ナビゲーションヘッダを表示する > Scenario: ナビゲーションは server component である

---

### TC-003: 空の repo で全 0 を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: getDashboardCounts は 4 セクションの件数を正しく集計する > Scenario: 空の repo で全 0 を返す

---

### TC-004: 各 repo に既知件数がある場合に正しい件数を返す

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: getDashboardCounts は 4 セクションの件数を正しく集計する > Scenario: 各 repo に既知件数がある場合に正しい件数を返す

---

### TC-005: ダッシュボード home に 4 セクションのカードが表示される

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: ダッシュボード home が 4 セクションの件数とリンクを表示する > Scenario: ダッシュボード home に 4 セクションのカードが表示される

---

### TC-006: ダッシュボード home は server component である

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: ダッシュボード home が 4 セクションの件数とリンクを表示する > Scenario: ダッシュボード home は server component である

---

### TC-007: monorepo 全体の検証が green

**Category**: manual
**Priority**: must
**Source**: spec.md > Requirement: ビルドとテストが通る > Scenario: monorepo 全体の検証が green

---

### TC-008: DashboardCounts 型が export されている

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-02: getDashboardCounts 純関数を作成する

**GIVEN** `apps/web/lib/dashboard.ts` が作成されている
**WHEN** ファイルを確認する
**THEN** `export type DashboardCounts = { customers: number; resources: number; services: number; bookings: number }` が存在する

---

### TC-009: getDashboardCounts は Promise.all で 4 repo を並行呼び出しする

**Category**: manual
**Priority**: could
**Source**: design.md > D2: ダッシュボード集計を純関数 getDashboardCounts(deps) に分離する

**GIVEN** `apps/web/lib/dashboard.ts` が作成されている
**WHEN** ファイルを確認する
**THEN** `Promise.all` を使って 4 つの `list()` を並行呼び出ししており、逐次呼び出しになっていない

---

### TC-010: テストファイルが正しいパスに配置されている

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-03: getDashboardCounts の vitest テストを作成する

**GIVEN** プロジェクトが実装済み
**WHEN** ファイルシステムを確認する
**THEN** `apps/web/lib/dashboard.test.ts` が存在する

---

### TC-011: page.tsx が集計ロジックを直書きせず getDashboardCounts に委譲している

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-04: app/page.tsx をダッシュボード home に書き換える, design.md > D2

**GIVEN** `apps/web/app/page.tsx` が実装済み
**WHEN** ファイルを確認する
**THEN** `getDashboardCounts` を `@/lib/dashboard` から import して呼び出しており、件数の集計ロジックが page 内に直書きされていない

---

### TC-012: page.tsx が composition root の getter 経由で repo を取得している

**Category**: manual
**Priority**: should
**Source**: tasks.md > T-04: app/page.tsx をダッシュボード home に書き換える, design.md > D4

**GIVEN** `apps/web/app/page.tsx` が実装済み
**WHEN** ファイルを確認する
**THEN** `getCustomerRepository`・`getResourceRepository`・`getServiceRepository`・`getBookingRepository` を `@/lib/composition-root` から import して使用しており、repo の具象実装を直接生成していない

---

### TC-013: layout.tsx にアプリ名「Koma」のホームリンクが含まれる

**Category**: manual
**Priority**: could
**Source**: tasks.md > T-01: app/layout.tsx に共通ナビゲーションヘッダを追加する

**GIVEN** `apps/web/app/layout.tsx` が実装済み
**WHEN** ページをブラウザで表示する
**THEN** ヘッダにアプリ名「Koma」が表示され、`href="/"` の `<Link>` として実装されている

---

## Result

```yaml
result: completed
total: 13
automated: 2
manual: 11
must: 7
should: 4
could: 2
blocked_reasons: []
```
