import { describe, it, expect } from 'vitest';
import {
  createMoney,
  addMoney,
  subtractMoney,
  compareMoney,
  isEqualMoney,
} from './money.js';

describe('Money', () => {
  describe('createMoney', () => {
    it('creates money with an integer amount', () => {
      const m = createMoney(1000, 'JPY');
      expect(m.amount).toBe(1000);
      expect(m.currency).toBe('JPY');
    });

    it('throws when amount is a decimal', () => {
      expect(() => createMoney(100.5, 'JPY')).toThrow();
    });

    it('allows negative integer amounts', () => {
      const m = createMoney(-500, 'JPY');
      expect(m.amount).toBe(-500);
    });

    it('allows zero', () => {
      const m = createMoney(0, 'JPY');
      expect(m.amount).toBe(0);
    });

    it('returns a frozen object', () => {
      const m = createMoney(100, 'JPY');
      expect(Object.isFrozen(m)).toBe(true);
    });
  });

  describe('addMoney', () => {
    it('adds two same-currency amounts', () => {
      const a = createMoney(300, 'JPY');
      const b = createMoney(200, 'JPY');
      const result = addMoney(a, b);
      expect(result.amount).toBe(500);
      expect(result.currency).toBe('JPY');
    });

    it('throws on currency mismatch', () => {
      // Force a different "currency" via type assertion to test runtime guard
      const a = createMoney(300, 'JPY');
      const b = { amount: 200, currency: 'USD' } as unknown as ReturnType<
        typeof createMoney
      >;
      expect(() => addMoney(a, b)).toThrow();
    });
  });

  describe('subtractMoney', () => {
    it('subtracts two same-currency amounts', () => {
      const a = createMoney(500, 'JPY');
      const b = createMoney(200, 'JPY');
      const result = subtractMoney(a, b);
      expect(result.amount).toBe(300);
      expect(result.currency).toBe('JPY');
    });

    it('throws on currency mismatch', () => {
      const a = createMoney(500, 'JPY');
      const b = { amount: 200, currency: 'USD' } as unknown as ReturnType<
        typeof createMoney
      >;
      expect(() => subtractMoney(a, b)).toThrow();
    });
  });

  describe('compareMoney', () => {
    it('returns negative when a < b', () => {
      const a = createMoney(100, 'JPY');
      const b = createMoney(200, 'JPY');
      expect(compareMoney(a, b)).toBeLessThan(0);
    });

    it('returns zero when a === b', () => {
      const a = createMoney(100, 'JPY');
      const b = createMoney(100, 'JPY');
      expect(compareMoney(a, b)).toBe(0);
    });

    it('returns positive when a > b', () => {
      const a = createMoney(300, 'JPY');
      const b = createMoney(100, 'JPY');
      expect(compareMoney(a, b)).toBeGreaterThan(0);
    });

    it('throws on currency mismatch', () => {
      const a = createMoney(100, 'JPY');
      const b = { amount: 100, currency: 'USD' } as unknown as ReturnType<
        typeof createMoney
      >;
      expect(() => compareMoney(a, b)).toThrow();
    });
  });

  describe('isEqualMoney', () => {
    it('returns true for same amount and currency', () => {
      const a = createMoney(100, 'JPY');
      const b = createMoney(100, 'JPY');
      expect(isEqualMoney(a, b)).toBe(true);
    });

    it('returns false for different amounts', () => {
      const a = createMoney(100, 'JPY');
      const b = createMoney(200, 'JPY');
      expect(isEqualMoney(a, b)).toBe(false);
    });

    it('returns false for different currencies', () => {
      const a = createMoney(100, 'JPY');
      const b = { amount: 100, currency: 'USD' } as unknown as ReturnType<
        typeof createMoney
      >;
      expect(isEqualMoney(a, b)).toBe(false);
    });
  });
});
