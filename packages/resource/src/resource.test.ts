import { describe, it, expect } from 'vitest';
import { createResource, updateResource } from './resource.js';

describe('createResource', () => {
  it('必須フィールド（name, kind）のみで構築できる', () => {
    const resource = createResource({ name: 'スタイリスト A', kind: 'staff' });
    expect(resource.name).toBe('スタイリスト A');
    expect(resource.kind).toBe('staff');
  });

  it('id を省略したとき自動生成される', () => {
    const resource = createResource({ name: 'スタイリスト A', kind: 'staff' });
    expect(typeof resource.id).toBe('string');
    expect(resource.id.length).toBeGreaterThan(0);
  });

  it('capacity を省略したとき既定値 1 が設定される', () => {
    const resource = createResource({ name: 'スタイリスト A', kind: 'staff' });
    expect(resource.capacity).toBe(1);
  });

  it('capacity に正整数を指定して構築できる', () => {
    const resource = createResource({
      name: '会議室 A',
      kind: 'room',
      capacity: 10,
    });
    expect(resource.capacity).toBe(10);
  });

  it('capacity: 0 で throw する', () => {
    expect(() =>
      createResource({ name: 'スタイリスト A', kind: 'staff', capacity: 0 }),
    ).toThrow();
  });

  it('capacity: -1 で throw する', () => {
    expect(() =>
      createResource({ name: 'スタイリスト A', kind: 'staff', capacity: -1 }),
    ).toThrow();
  });

  it('capacity: 1.5 で throw する', () => {
    expect(() =>
      createResource({ name: 'スタイリスト A', kind: 'staff', capacity: 1.5 }),
    ).toThrow();
  });

  it('返却値が frozen である', () => {
    const resource = createResource({ name: 'スタイリスト A', kind: 'staff' });
    expect(Object.isFrozen(resource)).toBe(true);
  });
});

describe('updateResource', () => {
  it('新しい Resource を返し、元は変更されない', () => {
    const original = createResource({ name: 'スタイリスト A', kind: 'staff' });
    const updated = updateResource(original, { name: 'スタイリスト B' });
    expect(updated).not.toBe(original);
    expect(original.name).toBe('スタイリスト A');
    expect(updated.name).toBe('スタイリスト B');
  });

  it('id を保持する', () => {
    const original = createResource({ name: 'スタイリスト A', kind: 'staff' });
    const updated = updateResource(original, { name: 'スタイリスト B' });
    expect(updated.id).toBe(original.id);
  });

  it('capacity を不正値に更新しようとすると throw する', () => {
    const original = createResource({ name: 'スタイリスト A', kind: 'staff' });
    expect(() => updateResource(original, { capacity: 0 })).toThrow();
    expect(() => updateResource(original, { capacity: -1 })).toThrow();
    expect(() => updateResource(original, { capacity: 1.5 })).toThrow();
  });
});
