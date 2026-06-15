import { describe, it, expect } from 'vitest';
import { createId, createTimeRange } from '@koma/shared';
import {
  createBooking,
  restoreBooking,
  transitionBooking,
} from './booking.js';

const makeSlot = () => createTimeRange(1000, 2000);

const makeIds = () => ({
  customerId: createId<'Customer'>(),
  serviceId: createId<'Service'>(),
  resourceId: createId<'Resource'>(),
});

describe('createBooking', () => {
  it('必須フィールドのみで構築でき、status が pending である', () => {
    const ids = makeIds();
    const booking = createBooking({
      ...ids,
      slot: makeSlot(),
    });
    expect(booking.status).toBe('pending');
    expect(booking.customerId).toBe(ids.customerId);
    expect(booking.serviceId).toBe(ids.serviceId);
    expect(booking.resourceId).toBe(ids.resourceId);
  });

  it('id 省略時に自動生成される', () => {
    const booking = createBooking({
      ...makeIds(),
      slot: makeSlot(),
    });
    expect(typeof booking.id).toBe('string');
    expect(booking.id.length).toBeGreaterThan(0);
  });

  it('id を指定した場合はその値が使われる', () => {
    const id = createId<'Booking'>();
    const booking = createBooking({
      id,
      ...makeIds(),
      slot: makeSlot(),
    });
    expect(booking.id).toBe(id);
  });

  it('customFields 省略時に空オブジェクトが設定される', () => {
    const booking = createBooking({
      ...makeIds(),
      slot: makeSlot(),
    });
    expect(booking.customFields).toEqual({});
  });

  it('customFields を指定した場合はその値が設定される', () => {
    const booking = createBooking({
      ...makeIds(),
      slot: makeSlot(),
      customFields: { note: 'test', count: 2 },
    });
    expect(booking.customFields).toEqual({ note: 'test', count: 2 });
  });

  it('返却値が frozen である', () => {
    const booking = createBooking({
      ...makeIds(),
      slot: makeSlot(),
    });
    expect(Object.isFrozen(booking)).toBe(true);
  });
});

describe('restoreBooking', () => {
  it('任意の status で復元できる', () => {
    const id = createId<'Booking'>();
    const ids = makeIds();
    const slot = makeSlot();

    const booking = restoreBooking({
      id,
      ...ids,
      slot,
      status: 'confirmed',
      customFields: {},
    });

    expect(booking.id).toBe(id);
    expect(booking.status).toBe('confirmed');
  });

  it('cancelled status で復元できる', () => {
    const booking = restoreBooking({
      id: createId<'Booking'>(),
      ...makeIds(),
      slot: makeSlot(),
      status: 'cancelled',
      customFields: {},
    });
    expect(booking.status).toBe('cancelled');
  });

  it('返却値が frozen である', () => {
    const booking = restoreBooking({
      id: createId<'Booking'>(),
      ...makeIds(),
      slot: makeSlot(),
      status: 'no-show',
      customFields: {},
    });
    expect(Object.isFrozen(booking)).toBe(true);
  });
});

describe('transitionBooking', () => {
  it('pending → confirmed が成功する', () => {
    const booking = createBooking({ ...makeIds(), slot: makeSlot() });
    const next = transitionBooking(booking, 'confirmed');
    expect(next.status).toBe('confirmed');
  });

  it('pending → cancelled が成功する', () => {
    const booking = createBooking({ ...makeIds(), slot: makeSlot() });
    const next = transitionBooking(booking, 'cancelled');
    expect(next.status).toBe('cancelled');
  });

  it('confirmed → cancelled が成功する', () => {
    const pending = createBooking({ ...makeIds(), slot: makeSlot() });
    const confirmed = transitionBooking(pending, 'confirmed');
    const next = transitionBooking(confirmed, 'cancelled');
    expect(next.status).toBe('cancelled');
  });

  it('confirmed → completed が成功する', () => {
    const pending = createBooking({ ...makeIds(), slot: makeSlot() });
    const confirmed = transitionBooking(pending, 'confirmed');
    const next = transitionBooking(confirmed, 'completed');
    expect(next.status).toBe('completed');
  });

  it('confirmed → no-show が成功する', () => {
    const pending = createBooking({ ...makeIds(), slot: makeSlot() });
    const confirmed = transitionBooking(pending, 'confirmed');
    const next = transitionBooking(confirmed, 'no-show');
    expect(next.status).toBe('no-show');
  });

  it('pending → completed は throw する', () => {
    const booking = createBooking({ ...makeIds(), slot: makeSlot() });
    expect(() => transitionBooking(booking, 'completed')).toThrow();
  });

  it('pending → no-show は throw する', () => {
    const booking = createBooking({ ...makeIds(), slot: makeSlot() });
    expect(() => transitionBooking(booking, 'no-show')).toThrow();
  });

  it('cancelled からの任意の遷移は throw する', () => {
    const booking = restoreBooking({
      id: createId<'Booking'>(),
      ...makeIds(),
      slot: makeSlot(),
      status: 'cancelled',
      customFields: {},
    });
    expect(() => transitionBooking(booking, 'pending')).toThrow();
    expect(() => transitionBooking(booking, 'confirmed')).toThrow();
  });

  it('completed からの任意の遷移は throw する', () => {
    const booking = restoreBooking({
      id: createId<'Booking'>(),
      ...makeIds(),
      slot: makeSlot(),
      status: 'completed',
      customFields: {},
    });
    expect(() => transitionBooking(booking, 'pending')).toThrow();
  });

  it('no-show からの任意の遷移は throw する', () => {
    const booking = restoreBooking({
      id: createId<'Booking'>(),
      ...makeIds(),
      slot: makeSlot(),
      status: 'no-show',
      customFields: {},
    });
    expect(() => transitionBooking(booking, 'confirmed')).toThrow();
  });

  it('同一状態への遷移は throw する', () => {
    const booking = createBooking({ ...makeIds(), slot: makeSlot() });
    expect(() => transitionBooking(booking, 'pending')).toThrow();
  });

  it('遷移後も元の Booking の status が変わらない（immutability）', () => {
    const booking = createBooking({ ...makeIds(), slot: makeSlot() });
    transitionBooking(booking, 'confirmed');
    expect(booking.status).toBe('pending');
  });

  it('遷移後の Booking は異なるオブジェクト参照である', () => {
    const booking = createBooking({ ...makeIds(), slot: makeSlot() });
    const next = transitionBooking(booking, 'confirmed');
    expect(next).not.toBe(booking);
  });
});
