import { describe, it, expect } from 'vitest';
import {
  createTimeRange,
  overlaps,
  contains,
  timeRangeDuration,
  isEqualTimeRange,
} from './time-range.js';

describe('TimeRange', () => {
  describe('createTimeRange', () => {
    it('creates a range when start < end', () => {
      const r = createTimeRange(100, 300);
      expect(r.start).toBe(100);
      expect(r.end).toBe(300);
    });

    it('throws when start === end', () => {
      expect(() => createTimeRange(100, 100)).toThrow();
    });

    it('throws when start > end', () => {
      expect(() => createTimeRange(300, 100)).toThrow();
    });

    it('returns a frozen object', () => {
      const r = createTimeRange(100, 200);
      expect(Object.isFrozen(r)).toBe(true);
    });
  });

  describe('overlaps', () => {
    it('complete overlap: [100,300) vs [100,300) → true', () => {
      const a = createTimeRange(100, 300);
      const b = createTimeRange(100, 300);
      expect(overlaps(a, b)).toBe(true);
    });

    it('partial overlap: [100,300) vs [200,400) → true', () => {
      const a = createTimeRange(100, 300);
      const b = createTimeRange(200, 400);
      expect(overlaps(a, b)).toBe(true);
    });

    it('containment: [100,400) vs [200,300) → true', () => {
      const a = createTimeRange(100, 400);
      const b = createTimeRange(200, 300);
      expect(overlaps(a, b)).toBe(true);
    });

    it('adjacent: [100,200) vs [200,300) → false (no double-booking)', () => {
      const a = createTimeRange(100, 200);
      const b = createTimeRange(200, 300);
      expect(overlaps(a, b)).toBe(false);
    });

    it('fully separated: [100,200) vs [300,400) → false', () => {
      const a = createTimeRange(100, 200);
      const b = createTimeRange(300, 400);
      expect(overlaps(a, b)).toBe(false);
    });

    it('is symmetric: overlaps(A,B) === overlaps(B,A)', () => {
      const a = createTimeRange(100, 300);
      const b = createTimeRange(200, 400);
      expect(overlaps(a, b)).toBe(overlaps(b, a));

      const c = createTimeRange(100, 200);
      const d = createTimeRange(200, 300);
      expect(overlaps(c, d)).toBe(overlaps(d, c));
    });
  });

  describe('contains', () => {
    it('contains the start point: contains([100,300), 100) → true', () => {
      const r = createTimeRange(100, 300);
      expect(contains(r, 100)).toBe(true);
    });

    it('contains an interior point: contains([100,300), 200) → true', () => {
      const r = createTimeRange(100, 300);
      expect(contains(r, 200)).toBe(true);
    });

    it('does not contain the end point: contains([100,300), 300) → false', () => {
      const r = createTimeRange(100, 300);
      expect(contains(r, 300)).toBe(false);
    });

    it('does not contain a point before start: contains([100,300), 50) → false', () => {
      const r = createTimeRange(100, 300);
      expect(contains(r, 50)).toBe(false);
    });
  });

  describe('timeRangeDuration', () => {
    it('returns the correct duration in milliseconds', () => {
      const r = createTimeRange(1000, 4600);
      const d = timeRangeDuration(r);
      expect(d.milliseconds).toBe(3600);
    });
  });

  describe('isEqualTimeRange', () => {
    it('returns true for ranges with the same start and end', () => {
      const a = createTimeRange(100, 300);
      const b = createTimeRange(100, 300);
      expect(isEqualTimeRange(a, b)).toBe(true);
    });

    it('returns false for ranges with different start', () => {
      const a = createTimeRange(100, 300);
      const b = createTimeRange(150, 300);
      expect(isEqualTimeRange(a, b)).toBe(false);
    });

    it('returns false for ranges with different end', () => {
      const a = createTimeRange(100, 300);
      const b = createTimeRange(100, 400);
      expect(isEqualTimeRange(a, b)).toBe(false);
    });
  });
});
