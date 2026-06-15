import { describe, it, expect } from 'vitest';
import { createId, parseId, isEqualId, type Id } from './id.js';

describe('Id', () => {
  describe('createId', () => {
    it('returns a UUID v4 formatted string', () => {
      const id = createId<'Customer'>();
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('returns unique values on each call', () => {
      const a = createId<'Customer'>();
      const b = createId<'Customer'>();
      expect(a).not.toBe(b);
    });
  });

  describe('parseId', () => {
    it('accepts a valid UUID v4 string', () => {
      const raw = '550e8400-e29b-41d4-a716-446655440000';
      expect(() => parseId<'Customer'>(raw)).not.toThrow();
      expect(parseId<'Customer'>(raw)).toBe(raw);
    });

    it('throws on empty string', () => {
      expect(() => parseId<'Customer'>('')).toThrow();
    });

    it('throws on non-UUID string', () => {
      expect(() => parseId<'Customer'>('not-a-uuid')).toThrow();
    });

    it('throws on UUID v1 (version digit != 4)', () => {
      expect(() =>
        parseId<'Customer'>('550e8400-e29b-11d4-a716-446655440000'),
      ).toThrow();
    });
  });

  describe('isEqualId', () => {
    it('returns true for Ids from the same source string', () => {
      const raw = '550e8400-e29b-41d4-a716-446655440000';
      const a = parseId<'Customer'>(raw);
      const b = parseId<'Customer'>(raw);
      expect(isEqualId(a, b)).toBe(true);
    });

    it('returns false for Ids from different strings', () => {
      const a = createId<'Customer'>();
      const b = createId<'Customer'>();
      expect(isEqualId(a, b)).toBe(false);
    });
  });

  describe('type safety', () => {
    it('Id<Customer> and Id<Booking> are not assignable to each other', () => {
      const customerId = createId<'Customer'>();
      // @ts-expect-error — Id<'Customer'> is not assignable to Id<'Booking'>
      const _bookingId: Id<'Booking'> = customerId;
      void _bookingId;
    });
  });
});
