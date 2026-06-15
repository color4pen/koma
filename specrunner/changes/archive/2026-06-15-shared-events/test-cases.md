# Test Cases: shared-events

## Summary

- **Total**: 15 cases
- **Automated** (unit/integration): 14
- **Manual**: 1
- **Priority**: must: 11, should: 3, could: 1

---

### TC-001: 具体イベント型が DomainEvent を拡張できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: DomainEvent は具体イベント型の拡張基盤である > Scenario: 具体イベント型が DomainEvent を拡張できる

---

### TC-002: publish したイベントが同じ name の subscriber に届く

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: EventBus の publish はイベント名に一致する subscriber にのみ配送する > Scenario: publish したイベントが同じ name の subscriber に届く

---

### TC-003: 異なる name の subscriber にはイベントが届かない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: EventBus の publish はイベント名に一致する subscriber にのみ配送する > Scenario: 異なる name の subscriber にはイベントが届かない

---

### TC-004: subscriber がいないイベントの publish はエラーなく完了する

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: EventBus の publish はイベント名に一致する subscriber にのみ配送する > Scenario: subscriber がいないイベントの publish はエラーなく完了する

---

### TC-005: unsubscribe 後はイベントが届かない

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: subscribe は購読解除関数を返す > Scenario: unsubscribe 後はイベントが届かない

---

### TC-006: unsubscribe は他の subscriber に影響しない

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: subscribe は購読解除関数を返す > Scenario: unsubscribe は他の subscriber に影響しない

---

### TC-007: publish 後にハンドラの副作用が即座に観測できる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: InMemoryEventBus の publish は同期でハンドラを呼び出す > Scenario: publish 後にハンドラの副作用が即座に観測できる

---

### TC-008: 正しいイベント型のプロパティにアクセスできる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: subscribe の handler は EventMap に基づく型安全なイベント型を受け取る > Scenario: 正しいイベント型のプロパティにアクセスできる

---

### TC-009: EventMap に存在しないプロパティへのアクセスはコンパイルエラーになる

**Category**: unit
**Priority**: must
**Source**: spec.md > Requirement: subscribe の handler は EventMap に基づく型安全なイベント型を受け取る > Scenario: EventMap に存在しないプロパティへのアクセスはコンパイルエラーになる

---

### TC-010: 2 つのハンドラが同じイベントを受け取る

**Category**: unit
**Priority**: should
**Source**: spec.md > Requirement: 同一 name に複数のハンドラを登録できる > Scenario: 2 つのハンドラが同じイベントを受け取る

---

### TC-011: name フィールドが欠けた型は DomainEvent に代入できない

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-01

**GIVEN** `name` フィールドを持たない型 `{ readonly occurredAt: number }` の値
**WHEN** その値を `DomainEvent` 型の変数に代入しようとする（`@ts-expect-error` でガード）
**THEN** コンパイルエラーが発生し、`@ts-expect-error` が有効に機能して `check-types` が pass する

---

### TC-012: DomainEvent / EventMap / EventBus が @koma/shared から import 可能

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `packages/shared/src/index.ts` に `DomainEvent`、`EventMap`、`EventBus` の re-export が追加されている
**WHEN** `import type { DomainEvent, EventMap, EventBus } from '@koma/shared'` と書く
**THEN** 型エラーなくコンパイルが通る（`check-types` が pass する）

---

### TC-013: createInMemoryEventBus が @koma/shared から import 可能

**Category**: unit
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `packages/shared/src/index.ts` に `createInMemoryEventBus` の re-export が追加されている
**WHEN** `import { createInMemoryEventBus } from '@koma/shared'` と書く
**THEN** 型エラーなくコンパイルが通り、実行時にも `createInMemoryEventBus` が関数として利用可能である

---

### TC-014: packages/shared/package.json に禁止依存が含まれない

**Category**: manual
**Priority**: must
**Source**: tasks.md > T-03

**GIVEN** `packages/shared/package.json` が存在する
**WHEN** `grep -E '"(next|react|drizzle-orm|zod)"' packages/shared/package.json` を実行する
**THEN** マッチ件数が 0 件である（禁止依存が一切追加されていない）

---

### TC-015: EventMap に定義されていないイベントを publish するとコンパイルエラーになる

**Category**: unit
**Priority**: could
**Source**: design.md > D2

**GIVEN** `{ TestHappened: { name: 'TestHappened'; occurredAt: number } }` を EventMap とした `EventBus<M>` インスタンス
**WHEN** `publish({ name: 'UnknownEvent', occurredAt: Date.now() })` と書く（`@ts-expect-error` でガード）
**THEN** コンパイルエラーが発生し、`@ts-expect-error` が有効に機能して `check-types` が pass する

---

## Result

```yaml
result: completed
total: 15
automated: 14
manual: 1
must: 11
should: 3
could: 1
blocked_reasons: []
```
