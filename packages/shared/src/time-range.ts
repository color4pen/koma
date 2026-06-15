import { ofMilliseconds, type Duration } from './duration.js';

export type TimeRange = {
  readonly start: number;
  readonly end: number;
};

export function createTimeRange(start: number, end: number): TimeRange {
  if (start >= end) {
    throw new Error(
      `TimeRange requires start < end, got start=${start} end=${end}`,
    );
  }
  return Object.freeze({ start, end });
}

export function overlaps(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}

export function contains(range: TimeRange, point: number): boolean {
  return range.start <= point && point < range.end;
}

export function timeRangeDuration(range: TimeRange): Duration {
  return ofMilliseconds(range.end - range.start);
}

export function isEqualTimeRange(a: TimeRange, b: TimeRange): boolean {
  return a.start === b.start && a.end === b.end;
}
