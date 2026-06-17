import { describe, expect, it } from 'vitest';

import { parseBookingInput } from './parse-booking-input';

const VALID_INPUT = {
  customerId: 'c1',
  serviceId: 's1',
  resourceId: 'r1',
  startAt: '2026-07-01T10:00',
};

describe('parseBookingInput', () => {
  describe('有効入力', () => {
    it('全フィールド有効で ok: true かつ各フィールドが正しい', () => {
      const result = parseBookingInput(VALID_INPUT);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.input.customerId).toBe('c1');
      expect(result.input.serviceId).toBe('s1');
      expect(result.input.resourceId).toBe('r1');
      expect(result.input.startMillis).toBe(new Date('2026-07-01T10:00').getTime());
    });
  });

  describe('customerId バリデーション', () => {
    it('customerId が空文字で ok: false かつ errors.customerId が存在', () => {
      const result = parseBookingInput({ ...VALID_INPUT, customerId: '' });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.customerId).toBeDefined();
    });
  });

  describe('serviceId バリデーション', () => {
    it('serviceId が空文字で ok: false かつ errors.serviceId が存在', () => {
      const result = parseBookingInput({ ...VALID_INPUT, serviceId: '' });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.serviceId).toBeDefined();
    });
  });

  describe('resourceId バリデーション', () => {
    it('resourceId が空文字で ok: false かつ errors.resourceId が存在', () => {
      const result = parseBookingInput({ ...VALID_INPUT, resourceId: '' });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.resourceId).toBeDefined();
    });
  });

  describe('startAt バリデーション', () => {
    it('startAt が空文字で ok: false かつ errors.startAt が存在', () => {
      const result = parseBookingInput({ ...VALID_INPUT, startAt: '' });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.startAt).toBeDefined();
    });

    it('startAt が "not-a-date" で ok: false かつ errors.startAt が存在', () => {
      const result = parseBookingInput({ ...VALID_INPUT, startAt: 'not-a-date' });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.startAt).toBeDefined();
    });

    it('startAt が "abc" で ok: false かつ errors.startAt が存在', () => {
      const result = parseBookingInput({ ...VALID_INPUT, startAt: 'abc' });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.startAt).toBeDefined();
    });
  });

  describe('型ガード', () => {
    it('raw が null で ok: false を返す', () => {
      const result = parseBookingInput(null);

      expect(result.ok).toBe(false);
    });
  });
});
