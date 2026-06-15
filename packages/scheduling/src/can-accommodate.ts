import { type TimeRange, overlaps } from '@koma/shared';
import { type Booking } from './booking.js';

/**
 * 提案する slot を加えたとき、任意の時刻で重なる active 予約数が capacity を超えないかを判定する。
 * 半開区間 [start, end) で隣接する予約は重ならないものとする。
 *
 * @param existingActive - 同一 Resource の既存 active 予約（isActive 済みのものを渡す）
 * @param slot - 提案する時間枠
 * @param capacity - Resource の最大収容数
 * @returns 収容可能なら true
 */
export function canAccommodate(
  existingActive: Booking[],
  slot: TimeRange,
  capacity: number,
): boolean {
  // slot と重なる既存予約のみ対象にする
  const overlapping = existingActive.filter((b) => overlaps(b.slot, slot));

  if (overlapping.length === 0) {
    // 重なりなし: 提案の1件のみ → capacity >= 1 前提で常に true
    return true;
  }

  // スイープライン方式で最大同時重なり数を算出する
  // 各予約の start に +1、end に -1 のイベントを作成
  type Event = { time: number; delta: number };
  const events: Event[] = [];

  for (const b of overlapping) {
    events.push({ time: b.slot.start, delta: 1 });
    events.push({ time: b.slot.end, delta: -1 });
  }

  // 時刻でソート。同時刻は -1（終了）を先に処理する
  // → 半開区間 [start, end) で end と次の start が同時刻なら重ならない
  events.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time;
    return a.delta - b.delta; // -1 が先
  });

  let current = 0;
  let maxConcurrent = 0;

  for (const e of events) {
    current += e.delta;
    if (current > maxConcurrent) {
      maxConcurrent = current;
    }
  }

  // 提案の1件を加えた最大同時数が capacity を超えるなら false
  return maxConcurrent + 1 <= capacity;
}
