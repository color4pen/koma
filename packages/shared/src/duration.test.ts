import { describe, it, expect } from 'vitest';
import {
  ofMilliseconds,
  ofMinutes,
  ofHours,
  toMilliseconds,
  toMinutes,
  isEqualDuration,
} from './duration.js';

describe('Duration', () => {
  describe('ofMilliseconds', () => {
    it('allows zero', () => {
      const d = ofMilliseconds(0);
      expect(d.milliseconds).toBe(0);
    });

    it('throws for negative values', () => {
      expect(() => ofMilliseconds(-1)).toThrow();
    });

    it('throws for non-integer values', () => {
      expect(() => ofMilliseconds(1.5)).toThrow();
    });

    it('returns a frozen object', () => {
      const d = ofMilliseconds(1000);
      expect(Object.isFrozen(d)).toBe(true);
    });
  });

  describe('ofMinutes', () => {
    it('converts 30 minutes to 1_800_000 ms', () => {
      const d = ofMinutes(30);
      expect(d.milliseconds).toBe(1_800_000);
    });

    it('converts 0 minutes to 0 ms', () => {
      const d = ofMinutes(0);
      expect(d.milliseconds).toBe(0);
    });
  });

  describe('ofHours', () => {
    it('converts 1 hour to 3_600_000 ms', () => {
      const d = ofHours(1);
      expect(d.milliseconds).toBe(3_600_000);
    });

    it('converts 2 hours to 7_200_000 ms', () => {
      const d = ofHours(2);
      expect(d.milliseconds).toBe(7_200_000);
    });
  });

  describe('toMilliseconds', () => {
    it('returns the milliseconds value', () => {
      const d = ofMilliseconds(5000);
      expect(toMilliseconds(d)).toBe(5000);
    });
  });

  describe('toMinutes', () => {
    it('converts milliseconds to minutes', () => {
      const d = ofMinutes(45);
      expect(toMinutes(d)).toBe(45);
    });
  });

  describe('isEqualDuration', () => {
    it('returns true for durations with the same milliseconds', () => {
      const a = ofMinutes(30);
      const b = ofMilliseconds(1_800_000);
      expect(isEqualDuration(a, b)).toBe(true);
    });

    it('returns false for durations with different milliseconds', () => {
      const a = ofMinutes(30);
      const b = ofMinutes(60);
      expect(isEqualDuration(a, b)).toBe(false);
    });
  });
});
