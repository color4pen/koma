import { describe, expect, it } from 'vitest';

import { parseServiceInput } from './parse-service-input';

describe('parseServiceInput', () => {
  describe('有効入力', () => {
    it('全フィールド指定で ok: true と Service を返す', () => {
      const result = parseServiceInput({
        name: 'カット',
        durationMinutes: '60',
        priceYen: '5000',
        resourceKinds: 'スタイリスト',
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.service.name).toBe('カット');
      expect(result.service.duration.milliseconds).toBe(3_600_000);
      expect(result.service.price.amount).toBe(5000);
      expect(result.service.price.currency).toBe('JPY');
      expect(result.service.resourceKinds).toEqual(['スタイリスト']);
    });

    it('resourceKinds 空文字で ok: true かつ resourceKinds が [] を返す', () => {
      const result = parseServiceInput({
        name: '無料相談',
        durationMinutes: '15',
        priceYen: '0',
        resourceKinds: '',
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.service.price.amount).toBe(0);
      expect(result.service.resourceKinds).toEqual([]);
    });

    it('resourceKinds がカンマ区切りで複数種別に分割される（各要素 trim 済み）', () => {
      const result = parseServiceInput({
        name: 'トリートメント',
        durationMinutes: '30',
        priceYen: '3000',
        resourceKinds: 'スタイリスト, アシスタント , 個室',
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.service.resourceKinds).toEqual(['スタイリスト', 'アシスタント', '個室']);
    });

    it('priceYen が "0" で ok: true（無料メニュー）', () => {
      const result = parseServiceInput({
        name: '初回カウンセリング',
        durationMinutes: '30',
        priceYen: '0',
        resourceKinds: '',
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.service.price.amount).toBe(0);
    });

    it('返された Service は id を持つ', () => {
      const result = parseServiceInput({
        name: 'カット',
        durationMinutes: '60',
        priceYen: '5000',
        resourceKinds: '',
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.service.id).toBeDefined();
    });

    it('前後の空白が trim された name で ok: true を返す', () => {
      const result = parseServiceInput({
        name: '  カラー  ',
        durationMinutes: '90',
        priceYen: '8000',
        resourceKinds: '',
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.service.name).toBe('カラー');
    });
  });

  describe('name バリデーション', () => {
    it('name が空文字で ok: false かつ errors.name が存在する', () => {
      const result = parseServiceInput({
        name: '',
        durationMinutes: '60',
        priceYen: '5000',
        resourceKinds: '',
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.name).toBeDefined();
      expect(result.errors.name.length).toBeGreaterThan(0);
    });

    it('name がスペースのみで ok: false かつ errors.name が存在する', () => {
      const result = parseServiceInput({
        name: '   ',
        durationMinutes: '60',
        priceYen: '5000',
        resourceKinds: '',
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.name).toBeDefined();
      expect(result.errors.name.length).toBeGreaterThan(0);
    });
  });

  describe('durationMinutes バリデーション', () => {
    it('durationMinutes が "0" で ok: false かつ errors.durationMinutes が存在する', () => {
      const result = parseServiceInput({
        name: 'カット',
        durationMinutes: '0',
        priceYen: '5000',
        resourceKinds: '',
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.durationMinutes).toBeDefined();
      expect(result.errors.durationMinutes.length).toBeGreaterThan(0);
    });

    it('durationMinutes が "-30" で ok: false かつ errors.durationMinutes が存在する', () => {
      const result = parseServiceInput({
        name: 'カット',
        durationMinutes: '-30',
        priceYen: '5000',
        resourceKinds: '',
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.durationMinutes).toBeDefined();
      expect(result.errors.durationMinutes.length).toBeGreaterThan(0);
    });

    it('durationMinutes が "30.5" で ok: false かつ errors.durationMinutes が存在する', () => {
      const result = parseServiceInput({
        name: 'カット',
        durationMinutes: '30.5',
        priceYen: '5000',
        resourceKinds: '',
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.durationMinutes).toBeDefined();
      expect(result.errors.durationMinutes.length).toBeGreaterThan(0);
    });

    it('durationMinutes が "abc" で ok: false かつ errors.durationMinutes が存在する', () => {
      const result = parseServiceInput({
        name: 'カット',
        durationMinutes: 'abc',
        priceYen: '5000',
        resourceKinds: '',
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.durationMinutes).toBeDefined();
      expect(result.errors.durationMinutes.length).toBeGreaterThan(0);
    });
  });

  describe('priceYen バリデーション', () => {
    it('priceYen が "-100" で ok: false かつ errors.priceYen が存在する', () => {
      const result = parseServiceInput({
        name: 'カット',
        durationMinutes: '60',
        priceYen: '-100',
        resourceKinds: '',
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.priceYen).toBeDefined();
      expect(result.errors.priceYen.length).toBeGreaterThan(0);
    });

    it('priceYen が "1000.5" で ok: false かつ errors.priceYen が存在する', () => {
      const result = parseServiceInput({
        name: 'カット',
        durationMinutes: '60',
        priceYen: '1000.5',
        resourceKinds: '',
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.priceYen).toBeDefined();
      expect(result.errors.priceYen.length).toBeGreaterThan(0);
    });

    it('priceYen が "無料" で ok: false かつ errors.priceYen が存在する', () => {
      const result = parseServiceInput({
        name: 'カット',
        durationMinutes: '60',
        priceYen: '無料',
        resourceKinds: '',
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.priceYen).toBeDefined();
      expect(result.errors.priceYen.length).toBeGreaterThan(0);
    });
  });

  describe('型ガード', () => {
    it('raw が文字列の場合に ok: false を返す', () => {
      const result = parseServiceInput('invalid');
      expect(result.ok).toBe(false);
    });

    it('raw が null の場合に ok: false を返す', () => {
      const result = parseServiceInput(null);
      expect(result.ok).toBe(false);
    });
  });
});
