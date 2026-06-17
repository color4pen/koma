import { describe, expect, it } from 'vitest';

import { parseResourceInput } from './parse-resource-input';

describe('parseResourceInput', () => {
  describe('有効入力', () => {
    it('全フィールド指定で ok: true と Resource を返す', () => {
      const result = parseResourceInput({
        name: '田中',
        kind: 'スタイリスト',
        capacity: '3',
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.resource.name).toBe('田中');
      expect(result.resource.kind).toBe('スタイリスト');
      expect(result.resource.capacity).toBe(3);
    });

    it('capacity 省略時にデフォルト 1 で ok: true を返す', () => {
      const result = parseResourceInput({
        name: '個室A',
        kind: '個室',
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.resource.capacity).toBe(1);
    });

    it('capacity が "1" で正常に数値変換される', () => {
      const result = parseResourceInput({
        name: 'スタッフ',
        kind: '人',
        capacity: '1',
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.resource.capacity).toBe(1);
    });

    it('返された Resource は id を持つ', () => {
      const result = parseResourceInput({
        name: '田中',
        kind: 'スタイリスト',
        capacity: '2',
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.resource.id).toBeDefined();
    });

    it('前後の空白が trim された name で ok: true を返す', () => {
      const result = parseResourceInput({
        name: '  田中  ',
        kind: 'スタイリスト',
        capacity: '1',
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.resource.name).toBe('田中');
    });
  });

  describe('name バリデーション', () => {
    it('name が空文字で ok: false かつ errors.name が存在する', () => {
      const result = parseResourceInput({
        name: '',
        kind: 'スタイリスト',
        capacity: '1',
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.name).toBeDefined();
      expect(result.errors.name.length).toBeGreaterThan(0);
    });

    it('name がスペースのみで ok: false かつ errors.name が存在する', () => {
      const result = parseResourceInput({
        name: '   ',
        kind: 'スタイリスト',
        capacity: '1',
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.name).toBeDefined();
      expect(result.errors.name.length).toBeGreaterThan(0);
    });
  });

  describe('kind バリデーション', () => {
    it('kind が空文字で ok: false かつ errors.kind が存在する', () => {
      const result = parseResourceInput({
        name: '田中',
        kind: '',
        capacity: '1',
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.kind).toBeDefined();
      expect(result.errors.kind.length).toBeGreaterThan(0);
    });
  });

  describe('capacity バリデーション', () => {
    it('capacity が "0" で ok: false かつ errors.capacity が存在する', () => {
      const result = parseResourceInput({
        name: '田中',
        kind: 'スタイリスト',
        capacity: '0',
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.capacity).toBeDefined();
      expect(result.errors.capacity.length).toBeGreaterThan(0);
    });

    it('capacity が "-1" で ok: false かつ errors.capacity が存在する', () => {
      const result = parseResourceInput({
        name: '田中',
        kind: 'スタイリスト',
        capacity: '-1',
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.capacity).toBeDefined();
      expect(result.errors.capacity.length).toBeGreaterThan(0);
    });

    it('capacity が "1.5" で ok: false かつ errors.capacity が存在する', () => {
      const result = parseResourceInput({
        name: '田中',
        kind: 'スタイリスト',
        capacity: '1.5',
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.capacity).toBeDefined();
      expect(result.errors.capacity.length).toBeGreaterThan(0);
    });

    it('capacity が "abc" で ok: false かつ errors.capacity が存在する', () => {
      const result = parseResourceInput({
        name: '田中',
        kind: 'スタイリスト',
        capacity: 'abc',
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.capacity).toBeDefined();
      expect(result.errors.capacity.length).toBeGreaterThan(0);
    });
  });

  describe('型ガード', () => {
    it('raw が文字列の場合に ok: false を返す', () => {
      const result = parseResourceInput('invalid');
      expect(result.ok).toBe(false);
    });

    it('raw が null の場合に ok: false を返す', () => {
      const result = parseResourceInput(null);
      expect(result.ok).toBe(false);
    });
  });
});
