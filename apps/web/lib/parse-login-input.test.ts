import { describe, expect, it } from 'vitest';

import { parseLoginInput } from './parse-login-input';

describe('parseLoginInput', () => {
  describe('有効入力', () => {
    it('email・password ともに非空で ok: true と値を返す', () => {
      const result = parseLoginInput({ email: 'a@b.c', password: 'x' });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.email).toBe('a@b.c');
      expect(result.password).toBe('x');
    });

    it('長い email・password でも ok: true を返す', () => {
      const result = parseLoginInput({
        email: 'admin@example.com',
        password: 'super-secret-password',
      });
      expect(result.ok).toBe(true);
    });
  });

  describe('バリデーションエラー', () => {
    it('email が空文字の場合は ok: false で errors.email が存在する', () => {
      const result = parseLoginInput({ email: '', password: 'x' });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.email).toBeDefined();
      expect(result.errors.email.length).toBeGreaterThan(0);
    });

    it('password が空文字の場合は ok: false で errors.password が存在する', () => {
      const result = parseLoginInput({ email: 'a@b.c', password: '' });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.password).toBeDefined();
      expect(result.errors.password.length).toBeGreaterThan(0);
    });

    it('両方空の場合は ok: false で errors に email と password のキーが含まれる', () => {
      const result = parseLoginInput({});
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.email).toBeDefined();
      expect(result.errors.password).toBeDefined();
    });

    it('raw が null の場合は ok: false を返す', () => {
      const result = parseLoginInput(null);
      expect(result.ok).toBe(false);
    });

    it('raw が文字列の場合は ok: false を返す', () => {
      const result = parseLoginInput('invalid');
      expect(result.ok).toBe(false);
    });
  });
});
