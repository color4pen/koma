import { describe, it, expect, beforeEach } from 'vitest';
import { createId, createTimeRange } from '@koma/shared';
import { createBooking, restoreBooking } from './booking.js';
import { createInMemoryBookingRepository } from './in-memory-booking-repository.js';
import { type BookingRepository } from './port/booking-repository.js';

const makeSlot = () => createTimeRange(1000, 2000);

const makeIds = () => ({
  customerId: createId<'Customer'>(),
  serviceId: createId<'Service'>(),
  resourceId: createId<'Resource'>(),
});

describe('InMemoryBookingRepository', () => {
  let repo: BookingRepository;

  beforeEach(() => {
    repo = createInMemoryBookingRepository();
  });

  describe('基本操作', () => {
    it('save した Booking を findById で取得できる', async () => {
      const booking = createBooking({ ...makeIds(), slot: makeSlot() });
      await repo.save(booking);
      const found = await repo.findById(booking.id);
      expect(found).toEqual(booking);
    });

    it('未保存の id で findById すると null が返る', async () => {
      const id = createId<'Booking'>();
      const found = await repo.findById(id);
      expect(found).toBeNull();
    });

    it('空の状態で list が空配列を返す', async () => {
      const result = await repo.list();
      expect(result).toEqual([]);
    });

    it('save → list で保存分が含まれる', async () => {
      const booking = createBooking({ ...makeIds(), slot: makeSlot() });
      await repo.save(booking);
      const result = await repo.list();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(booking);
    });

    it('複数の Booking を save し list が全件返す', async () => {
      const b1 = createBooking({ ...makeIds(), slot: makeSlot() });
      const b2 = createBooking({ ...makeIds(), slot: makeSlot() });
      const b3 = createBooking({ ...makeIds(), slot: makeSlot() });
      await repo.save(b1);
      await repo.save(b2);
      await repo.save(b3);
      const result = await repo.list();
      expect(result).toHaveLength(3);
    });

    it('同一 id で save を 2 回呼ぶと上書き（upsert）される', async () => {
      const ids = makeIds();
      const booking = createBooking({ ...ids, slot: makeSlot() });
      await repo.save(booking);

      const updated = restoreBooking({
        ...booking,
        status: 'confirmed',
        customFields: {},
      });
      await repo.save(updated);

      const found = await repo.findById(booking.id);
      expect(found?.status).toBe('confirmed');

      const all = await repo.list();
      expect(all).toHaveLength(1);
    });
  });

  describe('findActiveByResource', () => {
    it('active (pending) な Booking のみ返す', async () => {
      const resourceId = createId<'Resource'>();
      const ids = { customerId: createId<'Customer'>(), serviceId: createId<'Service'>(), resourceId };

      const pending = createBooking({ ...ids, slot: makeSlot() });
      const cancelled = restoreBooking({
        id: createId<'Booking'>(),
        ...ids,
        slot: makeSlot(),
        status: 'cancelled',
        customFields: {},
      });

      await repo.save(pending);
      await repo.save(cancelled);

      const result = await repo.findActiveByResource(resourceId);
      expect(result).toHaveLength(1);
      expect(result[0]?.status).toBe('pending');
    });

    it('active (confirmed) な Booking も返す', async () => {
      const resourceId = createId<'Resource'>();
      const ids = { customerId: createId<'Customer'>(), serviceId: createId<'Service'>(), resourceId };

      const confirmed = restoreBooking({
        id: createId<'Booking'>(),
        ...ids,
        slot: makeSlot(),
        status: 'confirmed',
        customFields: {},
      });

      await repo.save(confirmed);

      const result = await repo.findActiveByResource(resourceId);
      expect(result).toHaveLength(1);
      expect(result[0]?.status).toBe('confirmed');
    });

    it('terminal (cancelled / completed / no-show) な Booking は除外される', async () => {
      const resourceId = createId<'Resource'>();
      const ids = { customerId: createId<'Customer'>(), serviceId: createId<'Service'>(), resourceId };

      for (const status of ['cancelled', 'completed', 'no-show'] as const) {
        await repo.save(
          restoreBooking({
            id: createId<'Booking'>(),
            ...ids,
            slot: makeSlot(),
            status,
            customFields: {},
          }),
        );
      }

      const result = await repo.findActiveByResource(resourceId);
      expect(result).toHaveLength(0);
    });

    it('指定 resourceId の Booking のみ返す（他 resource は除外）', async () => {
      const resourceIdA = createId<'Resource'>();
      const resourceIdB = createId<'Resource'>();

      const bookingA = createBooking({
        customerId: createId<'Customer'>(),
        serviceId: createId<'Service'>(),
        resourceId: resourceIdA,
        slot: makeSlot(),
      });
      const bookingB = createBooking({
        customerId: createId<'Customer'>(),
        serviceId: createId<'Service'>(),
        resourceId: resourceIdB,
        slot: makeSlot(),
      });

      await repo.save(bookingA);
      await repo.save(bookingB);

      const result = await repo.findActiveByResource(resourceIdA);
      expect(result).toHaveLength(1);
      expect(result[0]?.resourceId).toBe(resourceIdA);
    });

    it('active かつ該当 resource に一致する Booking がない場合は空配列', async () => {
      const resourceId = createId<'Resource'>();
      const ids = { customerId: createId<'Customer'>(), serviceId: createId<'Service'>(), resourceId };

      await repo.save(
        restoreBooking({
          id: createId<'Booking'>(),
          ...ids,
          slot: makeSlot(),
          status: 'cancelled',
          customFields: {},
        }),
      );

      const result = await repo.findActiveByResource(resourceId);
      expect(result).toHaveLength(0);
    });
  });
});
