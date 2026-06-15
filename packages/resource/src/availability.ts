import {
  type DailyTimeRange,
  dailyTimeRangeOverlaps,
} from './daily-time-range.js';

/**
 * 曜日（0=日曜 .. 6=土曜）
 */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Availability — 週次稼働（曜日ごと）＋ 日付例外（休業・特別営業）の値オブジェクト。
 */
export type Availability = {
  readonly weeklyHours: ReadonlyMap<Weekday, readonly DailyTimeRange[]>;
  readonly exceptions: ReadonlyMap<string, readonly DailyTimeRange[]>;
};

const ALL_WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

/**
 * DailyTimeRange[] 内で overlap がないことを検証する。
 * open 昇順ソート済みの配列を前提に、隣接する要素間で overlap を確認する。
 */
function validateNoOverlap(ranges: DailyTimeRange[], context: string): void {
  const sorted = [...ranges].sort((a, b) => a.open - b.open);
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i]!;
    const next = sorted[i + 1]!;
    if (dailyTimeRangeOverlaps(current, next)) {
      throw new Error(
        `DailyTimeRange overlap detected in ${context}: [${current.open}, ${current.close}) overlaps [${next.open}, ${next.close})`,
      );
    }
  }
}

/**
 * Availability を生成するファクトリ関数。
 * - 各曜日・各例外日の DailyTimeRange[] に overlap がないことを検証する
 * - DailyTimeRange[] を open 昇順にソートして格納する
 * - 未指定の曜日は空配列（休業）として扱う
 */
export function createAvailability(params: {
  weeklyHours?: Partial<Record<Weekday, DailyTimeRange[]>>;
  exceptions?: Record<string, DailyTimeRange[]>;
} = {}): Availability {
  const { weeklyHours: weeklyHoursInput = {}, exceptions: exceptionsInput = {} } = params;

  const weeklyHoursMap = new Map<Weekday, readonly DailyTimeRange[]>();
  for (const weekday of ALL_WEEKDAYS) {
    const ranges = weeklyHoursInput[weekday] ?? [];
    validateNoOverlap(ranges, `weekday ${weekday}`);
    const sorted = Object.freeze(
      [...ranges].sort((a, b) => a.open - b.open),
    );
    weeklyHoursMap.set(weekday, sorted);
  }

  const exceptionsMap = new Map<string, readonly DailyTimeRange[]>();
  for (const [date, ranges] of Object.entries(exceptionsInput)) {
    validateNoOverlap(ranges, `exception date ${date}`);
    const sorted = Object.freeze(
      [...ranges].sort((a, b) => a.open - b.open),
    );
    exceptionsMap.set(date, sorted);
  }

  return Object.freeze({
    weeklyHours: weeklyHoursMap,
    exceptions: exceptionsMap,
  });
}

/**
 * ある日付の日内稼働時間帯を返す純関数。
 * - 例外日が設定されていればその値を返す（空配列＝休業）
 * - なければ曜日の週次稼働を返す
 * - 曜日は UTC ベースで決定的に導出する（tz 非依存）
 */
export function dailyHoursOn(availability: Availability, date: string): readonly DailyTimeRange[] {
  if (availability.exceptions.has(date)) {
    return availability.exceptions.get(date)!;
  }

  const d = new Date(date + 'T00:00:00Z');
  const weekday = d.getUTCDay();
  if (isNaN(weekday)) {
    throw new Error(`Invalid date string: ${date}`);
  }

  return availability.weeklyHours.get(weekday as Weekday) ?? [];
}
