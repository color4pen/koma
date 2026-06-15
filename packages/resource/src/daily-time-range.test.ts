import { describe, expect, it } from 'vitest';
import {
  createDailyTimeRange,
  dailyTimeRangeOverlaps,
  isEqualDailyTimeRange,
} from './daily-time-range.js';

describe('createDailyTimeRange', () => {
  describe('正常系', () => {
    it('9:00–17:00 を構築できる', () => {
      const range = createDailyTimeRange(540, 1020);
      expect(range.open).toBe(540);
      expect(range.close).toBe(1020);
    });

    it('全日（0:00–24:00）を構築できる', () => {
      const range = createDailyTimeRange(0, 1440);
      expect(range.open).toBe(0);
      expect(range.close).toBe(1440);
    });

    it('0:00–1:00 を構築できる', () => {
      const range = createDailyTimeRange(0, 60);
      expect(range.open).toBe(0);
      expect(range.close).toBe(60);
    });

    it('返却値が frozen である', () => {
      const range = createDailyTimeRange(540, 1020);
      expect(Object.isFrozen(range)).toBe(true);
    });
  });

  describe('異常系', () => {
    it('open === close で throw する', () => {
      expect(() => createDailyTimeRange(540, 540)).toThrow();
    });

    it('open > close（逆転）で throw する', () => {
      expect(() => createDailyTimeRange(1020, 540)).toThrow();
    });

    it('open < 0 で throw する', () => {
      expect(() => createDailyTimeRange(-1, 540)).toThrow();
    });

    it('close > 1440 で throw する', () => {
      expect(() => createDailyTimeRange(540, 1441)).toThrow();
    });

    it('open が非整数で throw する', () => {
      expect(() => createDailyTimeRange(540.5, 1020)).toThrow();
    });

    it('close が非整数で throw する', () => {
      expect(() => createDailyTimeRange(540, 1020.5)).toThrow();
    });
  });
});

describe('dailyTimeRangeOverlaps', () => {
  it('重なるペアは true を返す', () => {
    const a = createDailyTimeRange(540, 1020);
    const b = createDailyTimeRange(720, 1080);
    expect(dailyTimeRangeOverlaps(a, b)).toBe(true);
  });

  it('一方が他方を内包する場合は true を返す', () => {
    const a = createDailyTimeRange(540, 1080);
    const b = createDailyTimeRange(600, 900);
    expect(dailyTimeRangeOverlaps(a, b)).toBe(true);
  });

  it('隣接（close === open）は false を返す（半開区間）', () => {
    const a = createDailyTimeRange(540, 720);
    const b = createDailyTimeRange(720, 1020);
    expect(dailyTimeRangeOverlaps(a, b)).toBe(false);
  });

  it('離れたペアは false を返す', () => {
    const a = createDailyTimeRange(540, 720);
    const b = createDailyTimeRange(780, 1020);
    expect(dailyTimeRangeOverlaps(a, b)).toBe(false);
  });
});

describe('isEqualDailyTimeRange', () => {
  it('同値のとき true を返す', () => {
    const a = createDailyTimeRange(540, 1020);
    const b = createDailyTimeRange(540, 1020);
    expect(isEqualDailyTimeRange(a, b)).toBe(true);
  });

  it('open が異なるとき false を返す', () => {
    const a = createDailyTimeRange(540, 1020);
    const b = createDailyTimeRange(600, 1020);
    expect(isEqualDailyTimeRange(a, b)).toBe(false);
  });

  it('close が異なるとき false を返す', () => {
    const a = createDailyTimeRange(540, 1020);
    const b = createDailyTimeRange(540, 960);
    expect(isEqualDailyTimeRange(a, b)).toBe(false);
  });
});
