import { type TimeRange, type Duration, createTimeRange } from '@koma/shared';
import { type Booking } from './booking.js';
import { canAccommodate } from './can-accommodate.js';

/**
 * 開窓（絶対 TimeRange）× 所要 Duration × 既存 active 予約 × capacity から
 * 予約可能な時間枠を返す純関数。
 *
 * @param openWindows - 絶対時刻の開窓（例: 営業時間を展開した絶対 TimeRange）
 * @param duration    - 1 枠の長さ
 * @param existingActive - 対象 Resource の既存 active 予約
 * @param capacity    - Resource の最大収容数
 * @param step        - 候補開始の刻み（省略時は duration と同じ = back-to-back）
 * @returns 予約可能な枠 TimeRange[]（開始時刻の昇順）
 */
export function availableSlots(params: {
  openWindows: TimeRange[];
  duration: Duration;
  existingActive: Booking[];
  capacity: number;
  step?: Duration;
}): TimeRange[] {
  const { openWindows, duration, existingActive, capacity } = params;
  const effectiveStep = params.step ?? duration;

  const sortedWindows = openWindows.slice().sort((a, b) => a.start - b.start);

  const result: TimeRange[] = [];

  for (const window of sortedWindows) {
    let cursor = window.start;

    while (cursor + duration.milliseconds <= window.end) {
      const candidateSlot = createTimeRange(cursor, cursor + duration.milliseconds);

      if (canAccommodate(existingActive, candidateSlot, capacity)) {
        result.push(candidateSlot);
      }

      cursor += effectiveStep.milliseconds;
    }
  }

  return result;
}
