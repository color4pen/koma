import { describe, it, expect } from 'vitest';
import { createId, createTimeRange } from '@koma/shared';
import { availableSlots } from './available-slots.js';
import { createBooking } from './booking.js';

const makeIds = () => ({
  customerId: createId<'Customer'>(),
  serviceId: createId<'Service'>(),
  resourceId: createId<'Resource'>(),
});

function makeActiveBooking(start: number, end: number) {
  return createBooking({
    ...makeIds(),
    slot: createTimeRange(start, end),
  });
}

describe('availableSlots', () => {
  describe('capacity が一杯の枠は除外される', () => {
    it('開窓 [0,120) / duration=60 / 既存 [0,120) 1 件 / capacity=1 → 空配列', () => {
      const result = availableSlots({
        openWindows: [createTimeRange(0, 120)],
        duration: { milliseconds: 60 },
        existingActive: [makeActiveBooking(0, 120)],
        capacity: 1,
      });
      expect(result).toEqual([]);
    });

    it('開窓 [0,180) / duration=60 / 既存 [0,60) 1 件 / capacity=1 → [60,120) と [120,180) のみ', () => {
      const result = availableSlots({
        openWindows: [createTimeRange(0, 180)],
        duration: { milliseconds: 60 },
        existingActive: [makeActiveBooking(0, 60)],
        capacity: 1,
      });
      expect(result).toEqual([createTimeRange(60, 120), createTimeRange(120, 180)]);
    });
  });

  describe('step 既定 = duration（back-to-back）', () => {
    it('開窓 [0,180) / duration=60 / 既存なし / capacity=1 / step 省略 → 3 枠', () => {
      const result = availableSlots({
        openWindows: [createTimeRange(0, 180)],
        duration: { milliseconds: 60 },
        existingActive: [],
        capacity: 1,
      });
      expect(result).toEqual([
        createTimeRange(0, 60),
        createTimeRange(60, 120),
        createTimeRange(120, 180),
      ]);
    });
  });

  describe('step 指定で候補粒度が変わる', () => {
    it('開窓 [0,120) / duration=60 / 既存なし / capacity=1 / step=30 → 3 枠', () => {
      const result = availableSlots({
        openWindows: [createTimeRange(0, 120)],
        duration: { milliseconds: 60 },
        existingActive: [],
        capacity: 1,
        step: { milliseconds: 30 },
      });
      expect(result).toEqual([
        createTimeRange(0, 60),
        createTimeRange(30, 90),
        createTimeRange(60, 120),
      ]);
    });
  });

  describe('窓に収まらない末尾は除外', () => {
    it('開窓 [0,90) / duration=60 / 既存なし / capacity=1 → [0,60) の 1 枠のみ', () => {
      const result = availableSlots({
        openWindows: [createTimeRange(0, 90)],
        duration: { milliseconds: 60 },
        existingActive: [],
        capacity: 1,
      });
      expect(result).toEqual([createTimeRange(0, 60)]);
    });

    it('開窓 [0,30) / duration=60 → 空配列', () => {
      const result = availableSlots({
        openWindows: [createTimeRange(0, 30)],
        duration: { milliseconds: 60 },
        existingActive: [],
        capacity: 1,
      });
      expect(result).toEqual([]);
    });
  });

  describe('開窓をまたぐ枠を作らない', () => {
    it('開窓 [0,60) と [120,180) / duration=60 → [0,60) と [120,180) の 2 枠（ギャップ部分なし）', () => {
      const result = availableSlots({
        openWindows: [createTimeRange(0, 60), createTimeRange(120, 180)],
        duration: { milliseconds: 60 },
        existingActive: [],
        capacity: 1,
      });
      expect(result).toEqual([createTimeRange(0, 60), createTimeRange(120, 180)]);
    });
  });

  describe('capacity-aware（canAccommodate 経由）', () => {
    it('capacity=2 で 1 件重なる → [0,60) と [60,120) の 2 枠（1+1=2 ≤ 2）', () => {
      const result = availableSlots({
        openWindows: [createTimeRange(0, 120)],
        duration: { milliseconds: 60 },
        existingActive: [makeActiveBooking(0, 60)],
        capacity: 2,
      });
      expect(result).toEqual([createTimeRange(0, 60), createTimeRange(60, 120)]);
    });

    it('capacity=2 で 2 件重なる → [60,120) の 1 枠のみ（2+1=3 > 2）', () => {
      const result = availableSlots({
        openWindows: [createTimeRange(0, 120)],
        duration: { milliseconds: 60 },
        existingActive: [makeActiveBooking(0, 60), makeActiveBooking(0, 60)],
        capacity: 2,
      });
      expect(result).toEqual([createTimeRange(60, 120)]);
    });
  });

  describe('出力が開始時刻の昇順', () => {
    it('開窓を逆順 [120,180), [0,60) で渡す → [0,60), [120,180) の順で返る', () => {
      const result = availableSlots({
        openWindows: [createTimeRange(120, 180), createTimeRange(0, 60)],
        duration: { milliseconds: 60 },
        existingActive: [],
        capacity: 1,
      });
      expect(result).toEqual([createTimeRange(0, 60), createTimeRange(120, 180)]);
    });
  });

  describe('純関数（同一入力で 2 回呼んで同一結果）', () => {
    it('同一引数で 2 回呼び出し、結果が deep equal', () => {
      const params = {
        openWindows: [createTimeRange(0, 180)],
        duration: { milliseconds: 60 },
        existingActive: [makeActiveBooking(60, 120)],
        capacity: 2,
      };
      const result1 = availableSlots(params);
      const result2 = availableSlots(params);
      expect(result1).toEqual(result2);
    });
  });

  describe('空の開窓リスト', () => {
    it('openWindows = [] → 空配列', () => {
      const result = availableSlots({
        openWindows: [],
        duration: { milliseconds: 60 },
        existingActive: [],
        capacity: 1,
      });
      expect(result).toEqual([]);
    });
  });
});
