/**
 * DailyTimeRange — 日内時間帯（真夜中からの分、半開区間 [open, close)）
 *
 * 絶対時刻 TimeRange（epoch ms）とは別概念。
 * tz 非依存で週次稼働・例外を定義するために使用する。
 */
export type DailyTimeRange = {
  readonly open: number;
  readonly close: number;
};

/**
 * DailyTimeRange を生成するファクトリ関数。
 * 不変条件: open, close は整数、0 <= open < close <= 1440
 */
export function createDailyTimeRange(open: number, close: number): DailyTimeRange {
  if (!Number.isInteger(open) || !Number.isInteger(close)) {
    throw new Error(
      `open and close must be integers, got: open=${open}, close=${close}`,
    );
  }
  if (open < 0 || close > 1440) {
    throw new Error(
      `open and close must be in [0, 1440], got: open=${open}, close=${close}`,
    );
  }
  if (open >= close) {
    throw new Error(
      `open must be less than close, got: open=${open}, close=${close}`,
    );
  }

  return Object.freeze({ open, close });
}

/**
 * 2 つの DailyTimeRange が半開区間 [open, close) として重なるかを判定する。
 * 隣接（a.close === b.open）は overlap しない。
 */
export function dailyTimeRangeOverlaps(a: DailyTimeRange, b: DailyTimeRange): boolean {
  return a.open < b.close && b.open < a.close;
}

/**
 * 2 つの DailyTimeRange が等価かを判定する。
 */
export function isEqualDailyTimeRange(a: DailyTimeRange, b: DailyTimeRange): boolean {
  return a.open === b.open && a.close === b.close;
}
