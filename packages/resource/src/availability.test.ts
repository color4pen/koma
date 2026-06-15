import { describe, expect, it } from 'vitest';
import { createDailyTimeRange } from './daily-time-range.js';
import { createAvailability, dailyHoursOn } from './availability.js';

describe('createAvailability', () => {
  describe('正常系', () => {
    it('月–金 9:00–17:00 の週次稼働を構築できる', () => {
      const range = createDailyTimeRange(540, 1020);
      const availability = createAvailability({
        weeklyHours: {
          1: [range], // 月
          2: [range], // 火
          3: [range], // 水
          4: [range], // 木
          5: [range], // 金
        },
      });
      expect(availability.weeklyHours.get(1)).toEqual([{ open: 540, close: 1020 }]);
      expect(availability.weeklyHours.get(0)).toEqual([]); // 日（未設定）
    });

    it('1 日に複数の時間帯（午前 + 午後）を設定できる（overlap なし）', () => {
      const morning = createDailyTimeRange(540, 720);  // 9:00–12:00
      const afternoon = createDailyTimeRange(780, 1020); // 13:00–17:00
      const availability = createAvailability({
        weeklyHours: { 1: [morning, afternoon] },
      });
      expect(availability.weeklyHours.get(1)).toHaveLength(2);
    });

    it('隣接する時間帯で構築できる', () => {
      const a = createDailyTimeRange(540, 720);
      const b = createDailyTimeRange(720, 1020);
      expect(() =>
        createAvailability({ weeklyHours: { 1: [a, b] } }),
      ).not.toThrow();
    });

    it('例外日（空配列＝休業）を設定できる', () => {
      const availability = createAvailability({
        exceptions: { '2026-12-25': [] },
      });
      expect(availability.exceptions.get('2026-12-25')).toEqual([]);
    });

    it('例外日（特別営業時間）を設定できる', () => {
      const special = createDailyTimeRange(600, 900);
      const availability = createAvailability({
        exceptions: { '2026-06-16': [special] },
      });
      expect(availability.exceptions.get('2026-06-16')).toEqual([{ open: 600, close: 900 }]);
    });

    it('全曜日未指定（weeklyHours 空）で構築できる', () => {
      const availability = createAvailability({ weeklyHours: {} });
      expect(availability.weeklyHours.get(1)).toEqual([]);
    });

    it('weeklyHours / exceptions 省略で構築できる', () => {
      const availability = createAvailability();
      expect(availability.weeklyHours.get(1)).toEqual([]);
      expect(availability.exceptions.size).toBe(0);
    });

    it('DailyTimeRange[] が open 昇順にソートされて格納される', () => {
      const b = createDailyTimeRange(780, 1020);
      const a = createDailyTimeRange(540, 720);
      const availability = createAvailability({ weeklyHours: { 1: [b, a] } });
      const ranges = availability.weeklyHours.get(1)!;
      expect(ranges[0]!.open).toBe(540);
      expect(ranges[1]!.open).toBe(780);
    });
  });

  describe('異常系', () => {
    it('同一曜日内で overlap する DailyTimeRange → throw', () => {
      const a = createDailyTimeRange(540, 780);
      const b = createDailyTimeRange(720, 1020);
      expect(() =>
        createAvailability({ weeklyHours: { 1: [a, b] } }),
      ).toThrow();
    });

    it('同一例外日内で overlap する DailyTimeRange → throw', () => {
      const a = createDailyTimeRange(540, 780);
      const b = createDailyTimeRange(720, 1020);
      expect(() =>
        createAvailability({ exceptions: { '2026-06-16': [a, b] } }),
      ).toThrow();
    });
  });
});

describe('dailyHoursOn', () => {
  const range9to17 = createDailyTimeRange(540, 1020);
  const range10to15 = createDailyTimeRange(600, 900);

  const baseAvailability = createAvailability({
    weeklyHours: {
      1: [range9to17], // 月
      2: [range9to17], // 火
      3: [range9to17], // 水
      4: [range9to17], // 木
      5: [range9to17], // 金
    },
  });

  it('例外日 → 例外の時間帯を返す', () => {
    const availability = createAvailability({
      weeklyHours: {
        1: [range9to17],
        2: [range9to17],
        3: [range9to17],
        4: [range9to17],
        5: [range9to17],
      },
      exceptions: { '2026-06-16': [range10to15] },
    });
    const result = dailyHoursOn(availability, '2026-06-16');
    expect(result).toEqual([{ open: 600, close: 900 }]);
  });

  it('例外日（空配列）→ [] を返す（休業）', () => {
    const availability = createAvailability({
      weeklyHours: {
        1: [range9to17],
        2: [range9to17],
        3: [range9to17],
        4: [range9to17],
        5: [range9to17],
      },
      exceptions: { '2026-12-25': [] },
    });
    const result = dailyHoursOn(availability, '2026-12-25');
    expect(result).toEqual([]);
  });

  it('例外なし → 曜日の週次稼働を返す', () => {
    const result = dailyHoursOn(baseAvailability, '2026-06-16'); // 火曜
    expect(result).toEqual([{ open: 540, close: 1020 }]);
  });

  it('週次未設定の曜日 → [] を返す', () => {
    const result = dailyHoursOn(baseAvailability, '2026-06-14'); // 日曜（未設定）
    expect(result).toEqual([]);
  });

  describe('曜日導出の正確性', () => {
    const sundayRange = createDailyTimeRange(600, 900);
    const mondayRange = createDailyTimeRange(540, 1020);
    const tuesdayRange = createDailyTimeRange(480, 960);
    const wednesdayRange = createDailyTimeRange(420, 900);
    const thursdayRange = createDailyTimeRange(360, 840);
    const fridayRange = createDailyTimeRange(300, 780);
    const saturdayRange = createDailyTimeRange(600, 720);

    const weekAvailability = createAvailability({
      weeklyHours: {
        0: [sundayRange],    // 日
        1: [mondayRange],    // 月
        2: [tuesdayRange],   // 火
        3: [wednesdayRange], // 水
        4: [thursdayRange],  // 木
        5: [fridayRange],    // 金
        6: [saturdayRange],  // 土
      },
    });

    it('2026-06-14 は日曜日（Weekday 0）', () => {
      const result = dailyHoursOn(weekAvailability, '2026-06-14');
      expect(result).toEqual([{ open: 600, close: 900 }]);
    });

    it('2026-06-15 は月曜日（Weekday 1）', () => {
      const result = dailyHoursOn(weekAvailability, '2026-06-15');
      expect(result).toEqual([{ open: 540, close: 1020 }]);
    });

    it('2026-06-16 は火曜日（Weekday 2）', () => {
      const result = dailyHoursOn(weekAvailability, '2026-06-16');
      expect(result).toEqual([{ open: 480, close: 960 }]);
    });

    it('2026-06-17 は水曜日（Weekday 3）', () => {
      const result = dailyHoursOn(weekAvailability, '2026-06-17');
      expect(result).toEqual([{ open: 420, close: 900 }]);
    });

    it('2026-06-18 は木曜日（Weekday 4）', () => {
      const result = dailyHoursOn(weekAvailability, '2026-06-18');
      expect(result).toEqual([{ open: 360, close: 840 }]);
    });

    it('2026-06-19 は金曜日（Weekday 5）', () => {
      const result = dailyHoursOn(weekAvailability, '2026-06-19');
      expect(result).toEqual([{ open: 300, close: 780 }]);
    });

    it('2026-06-20 は土曜日（Weekday 6）', () => {
      const result = dailyHoursOn(weekAvailability, '2026-06-20');
      expect(result).toEqual([{ open: 600, close: 720 }]);
    });
  });

  it('不正な日付文字列で throw する', () => {
    expect(() => dailyHoursOn(baseAvailability, 'not-a-date')).toThrow();
  });

  it('同一入力で同一出力を返す（純関数）', () => {
    const result1 = dailyHoursOn(baseAvailability, '2026-06-16');
    const result2 = dailyHoursOn(baseAvailability, '2026-06-16');
    expect(result1).toEqual(result2);
  });
});
