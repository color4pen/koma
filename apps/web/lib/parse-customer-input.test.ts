import { describe, expect, it } from 'vitest';

import { parseCustomerInput } from './parse-customer-input';

describe('parseCustomerInput', () => {
  describe('有効入力', () => {
    it('名前と電話番号のみで ok: true と Customer を返す', () => {
      const result = parseCustomerInput({
        name: '山田太郎',
        phone: '090-1234-5678',
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.customer.name).toBe('山田太郎');
      expect(result.customer.contact.phone).toBe('090-1234-5678');
      expect(result.customer.contact.email).toBeNull();
    });

    it('名前とメールのみで ok: true と Customer を返す', () => {
      const result = parseCustomerInput({
        name: '山田太郎',
        email: 'test@example.com',
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.customer.name).toBe('山田太郎');
      expect(result.customer.contact.email).toBe('test@example.com');
      expect(result.customer.contact.phone).toBeNull();
    });

    it('名前・電話・メール全てで ok: true と Customer を返す', () => {
      const result = parseCustomerInput({
        name: '山田太郎',
        phone: '090-1234-5678',
        email: 'test@example.com',
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.customer.contact.phone).toBe('090-1234-5678');
      expect(result.customer.contact.email).toBe('test@example.com');
    });

    it('返された Customer は id を持ち、デフォルト値が設定されている', () => {
      const result = parseCustomerInput({
        name: '山田太郎',
        phone: '090-1234-5678',
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.customer.id).toBeDefined();
      expect(result.customer.tags).toEqual([]);
      expect(result.customer.notes).toBe('');
      expect(result.customer.customFields).toEqual({});
    });

    it('前後の空白が trim された名前で ok: true を返す', () => {
      const result = parseCustomerInput({
        name: '  山田太郎  ',
        phone: '090-1234-5678',
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.customer.name).toBe('山田太郎');
    });
  });

  describe('名前バリデーション', () => {
    it('name が空文字の場合に ok: false かつ errors.name が存在する', () => {
      const result = parseCustomerInput({
        name: '',
        phone: '090-1234-5678',
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.name).toBeDefined();
      expect(result.errors.name.length).toBeGreaterThan(0);
    });

    it('name がスペースのみの場合に ok: false かつ errors.name が存在する', () => {
      const result = parseCustomerInput({
        name: '   ',
        phone: '090-1234-5678',
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.name).toBeDefined();
      expect(result.errors.name.length).toBeGreaterThan(0);
    });
  });

  describe('連絡先バリデーション', () => {
    it('phone も email も未指定の場合に ok: false かつ連絡先エラーが存在する', () => {
      const result = parseCustomerInput({ name: '山田太郎' });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      const hasContactError =
        result.errors.contact != null ||
        result.errors._form != null ||
        Object.keys(result.errors).some(
          (k) => k !== 'name' && result.errors[k].length > 0,
        );
      expect(hasContactError).toBe(true);
    });

    it('phone と email が両方空文字の場合に ok: false かつ連絡先エラーが存在する', () => {
      const result = parseCustomerInput({
        name: '山田太郎',
        phone: '',
        email: '',
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      const hasContactError =
        result.errors.contact != null ||
        result.errors._form != null ||
        Object.keys(result.errors).some(
          (k) => k !== 'name' && result.errors[k].length > 0,
        );
      expect(hasContactError).toBe(true);
    });
  });

  describe('型ガード', () => {
    it('raw が文字列の場合に ok: false を返す', () => {
      const result = parseCustomerInput('invalid');
      expect(result.ok).toBe(false);
    });

    it('raw が null の場合に ok: false を返す', () => {
      const result = parseCustomerInput(null);
      expect(result.ok).toBe(false);
    });
  });
});
