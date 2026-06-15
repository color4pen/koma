import { describe, it, expect } from 'vitest';
import { createId, createTimeRange } from '@koma/shared';
import { canAccommodate } from './can-accommodate.js';
import { createBooking, restoreBooking } from './booking.js';

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

function makeConfirmedBooking(start: number, end: number) {
  const pending = makeActiveBooking(start, end);
  return restoreBooking({ ...pending, status: 'confirmed', customFields: {} });
}

describe('canAccommodate', () => {
  it('既存予約なし + capacity=1 → true', () => {
    const slot = createTimeRange(100, 200);
    expect(canAccommodate([], slot, 1)).toBe(true);
  });

  it('capacity=1 で完全に重なる active 予約 1 件 → false', () => {
    const slot = createTimeRange(100, 200);
    const existing = makeActiveBooking(100, 200);
    expect(canAccommodate([existing], slot, 1)).toBe(false);
  });

  it('capacity=1 で部分的に重なる active 予約 1 件 → false', () => {
    const slot = createTimeRange(100, 200);
    const existing = makeActiveBooking(150, 250);
    expect(canAccommodate([existing], slot, 1)).toBe(false);
  });

  it('隣接する半開区間 [a,b) + [b,c) + capacity=1 → true（隣接は重複しない）', () => {
    // 既存: [100, 200)、提案: [200, 300)
    const proposedSlot = createTimeRange(200, 300);
    const existing = makeActiveBooking(100, 200);
    expect(canAccommodate([existing], proposedSlot, 1)).toBe(true);
  });

  it('capacity=2 で 1 件重なり → true（1+1=2 ≤ 2）', () => {
    const slot = createTimeRange(100, 200);
    const existing = makeActiveBooking(100, 200);
    expect(canAccommodate([existing], slot, 2)).toBe(true);
  });

  it('capacity=2 で 2 件同時重なり → false（2+1=3 > 2）', () => {
    const slot = createTimeRange(100, 200);
    const existing1 = makeActiveBooking(100, 200);
    const existing2 = makeConfirmedBooking(100, 200);
    expect(canAccommodate([existing1, existing2], slot, 2)).toBe(false);
  });

  it('部分的重なり: 前半のみ・後半のみ各 1 件（2 件同士は重ならない）+ capacity=2 → true', () => {
    // 提案: [100, 300)
    // 前半のみ重なる: [50, 150) → 提案と [100,150) で重なる
    // 後半のみ重なる: [250, 350) → 提案と [250,300) で重なる
    // 2 件同士は [50,150) と [250,350) で重ならない
    const proposedSlot = createTimeRange(100, 300);
    const firstHalf = makeActiveBooking(50, 150);
    const secondHalf = makeActiveBooking(250, 350);
    // ピーク時: 前半区間では 1 件重なり、後半区間では 1 件重なり、同時に重なる瞬間はない
    // → maxConcurrent = 1、1+1 = 2 ≤ 2 → true
    expect(canAccommodate([firstHalf, secondHalf], proposedSlot, 2)).toBe(true);
  });

  it('capacity=3 で 2 件同時重なり → true（2+1=3 ≤ 3）', () => {
    const slot = createTimeRange(100, 200);
    const existing1 = makeActiveBooking(100, 200);
    const existing2 = makeConfirmedBooking(100, 200);
    expect(canAccommodate([existing1, existing2], slot, 3)).toBe(true);
  });

  it('capacity=2 で 既存 1 件が隣接（重ならない）+ 1 件が重なる → true（1+1=2 ≤ 2）', () => {
    // 隣接: [0, 100)（重ならない）、重なる: [100, 200)
    const slot = createTimeRange(100, 200);
    const adjacent = makeActiveBooking(0, 100);
    const overlapping = makeActiveBooking(150, 250);
    expect(canAccommodate([adjacent, overlapping], slot, 2)).toBe(true);
  });
});
