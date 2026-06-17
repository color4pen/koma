import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { createBooking, restoreBooking } from '@koma/scheduling';
import { createId, createTimeRange } from '@koma/shared';
import { createDrizzleClient } from './client.js';
import { createDrizzleBookingRepository } from './drizzle-booking-repository.js';
import { type DrizzleClient } from './client.js';

const CREATE_BOOKINGS_TABLE = `
  CREATE TABLE IF NOT EXISTS bookings (
    id            TEXT PRIMARY KEY,
    customer_id   TEXT NOT NULL,
    service_id    TEXT NOT NULL,
    resource_id   TEXT NOT NULL,
    start_millis  BIGINT NOT NULL,
    end_millis    BIGINT NOT NULL,
    status        TEXT NOT NULL,
    custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb
  )
`;

let pglite: PGlite;
let db: DrizzleClient;

beforeEach(async () => {
  pglite = new PGlite();
  await pglite.exec(CREATE_BOOKINGS_TABLE);
  db = createDrizzleClient(pglite);
});

afterEach(async () => {
  await pglite.close();
});

describe('DrizzleBookingRepository', () => {
  // テスト 1: save → findById で slot と status が往復する
  it('save した Booking を findById で全フィールド一致で取得できる', async () => {
    const repo = createDrizzleBookingRepository(db);
    const customerId = createId<'Customer'>();
    const serviceId = createId<'Service'>();
    const resourceId = createId<'Resource'>();
    const slot = createTimeRange(1_700_000_000_000, 1_700_003_600_000);
    const booking = createBooking({
      customerId,
      serviceId,
      resourceId,
      slot,
      customFields: { note: 'VIP', visits: 3, active: true },
    });

    await repo.save(booking);
    const found = await repo.findById(booking.id);

    expect(found).not.toBeNull();
    expect(found!.id).toBe(booking.id);
    expect(found!.customerId).toBe(booking.customerId);
    expect(found!.serviceId).toBe(booking.serviceId);
    expect(found!.resourceId).toBe(booking.resourceId);
    expect(found!.slot.start).toBe(slot.start);
    expect(found!.slot.end).toBe(slot.end);
    expect(found!.status).toBe('pending');
    expect(found!.customFields).toEqual(booking.customFields);
  });

  // テスト 2: 未保存 id は null
  it('未保存の id で findById すると null が返る', async () => {
    const repo = createDrizzleBookingRepository(db);
    const id = createId<'Booking'>();
    const result = await repo.findById(id);
    expect(result).toBeNull();
  });

  // テスト 3: list が保存分を返す
  it('複数の Booking を save し、list が全件返す', async () => {
    const repo = createDrizzleBookingRepository(db);
    const customerId = createId<'Customer'>();
    const serviceId = createId<'Service'>();
    const resourceId = createId<'Resource'>();

    const booking1 = createBooking({
      customerId,
      serviceId,
      resourceId,
      slot: createTimeRange(1_700_000_000_000, 1_700_003_600_000),
    });
    const booking2 = createBooking({
      customerId,
      serviceId,
      resourceId,
      slot: createTimeRange(1_700_010_000_000, 1_700_013_600_000),
    });
    const booking3 = createBooking({
      customerId,
      serviceId,
      resourceId,
      slot: createTimeRange(1_700_020_000_000, 1_700_023_600_000),
    });

    await repo.save(booking1);
    await repo.save(booking2);
    await repo.save(booking3);

    const list = await repo.list();
    expect(list).toHaveLength(3);
    const ids = list.map((b) => b.id);
    expect(ids).toContain(booking1.id);
    expect(ids).toContain(booking2.id);
    expect(ids).toContain(booking3.id);
  });

  // テスト 4: 同一 id 再 save で更新（upsert）
  it('同一 id で再 save すると既存データが更新される（upsert）', async () => {
    const repo = createDrizzleBookingRepository(db);
    const customerId = createId<'Customer'>();
    const serviceId = createId<'Service'>();
    const resourceId = createId<'Resource'>();
    const slot = createTimeRange(1_700_000_000_000, 1_700_003_600_000);
    const booking = createBooking({ customerId, serviceId, resourceId, slot });

    await repo.save(booking);

    const newSlot = createTimeRange(1_700_100_000_000, 1_700_103_600_000);
    const updated = restoreBooking({
      id: booking.id,
      customerId,
      serviceId,
      resourceId,
      slot: newSlot,
      status: 'confirmed',
      customFields: {},
    });
    await repo.save(updated);

    const found = await repo.findById(booking.id);
    expect(found!.status).toBe('confirmed');
    expect(found!.slot.start).toBe(newSlot.start);
    expect(found!.slot.end).toBe(newSlot.end);

    const list = await repo.list();
    expect(list).toHaveLength(1);
  });

  // テスト 5: findActiveByResource が該当 resource の active のみ返す
  it('findActiveByResource が指定 resource の active のみ返す', async () => {
    const repo = createDrizzleBookingRepository(db);
    const customerId = createId<'Customer'>();
    const serviceId = createId<'Service'>();
    const targetResourceId = createId<'Resource'>();
    const otherResourceId = createId<'Resource'>();

    // 同一 resource に pending・confirmed・cancelled を保存
    const pendingBooking = restoreBooking({
      id: createId<'Booking'>(),
      customerId,
      serviceId,
      resourceId: targetResourceId,
      slot: createTimeRange(1_700_000_000_000, 1_700_003_600_000),
      status: 'pending',
      customFields: {},
    });
    const confirmedBooking = restoreBooking({
      id: createId<'Booking'>(),
      customerId,
      serviceId,
      resourceId: targetResourceId,
      slot: createTimeRange(1_700_010_000_000, 1_700_013_600_000),
      status: 'confirmed',
      customFields: {},
    });
    const cancelledBooking = restoreBooking({
      id: createId<'Booking'>(),
      customerId,
      serviceId,
      resourceId: targetResourceId,
      slot: createTimeRange(1_700_020_000_000, 1_700_023_600_000),
      status: 'cancelled',
      customFields: {},
    });

    // 別 resource に pending を保存
    const otherResourceBooking = restoreBooking({
      id: createId<'Booking'>(),
      customerId,
      serviceId,
      resourceId: otherResourceId,
      slot: createTimeRange(1_700_030_000_000, 1_700_033_600_000),
      status: 'pending',
      customFields: {},
    });

    await repo.save(pendingBooking);
    await repo.save(confirmedBooking);
    await repo.save(cancelledBooking);
    await repo.save(otherResourceBooking);

    const active = await repo.findActiveByResource(targetResourceId);

    expect(active).toHaveLength(2);
    const activeIds = active.map((b) => b.id);
    expect(activeIds).toContain(pendingBooking.id);
    expect(activeIds).toContain(confirmedBooking.id);
    // terminal 状態は含まない
    expect(activeIds).not.toContain(cancelledBooking.id);
    // 別 resource の予約は含まない
    expect(activeIds).not.toContain(otherResourceBooking.id);
  });

  // テスト 6: bigint 往復（大きな epoch ms 値）
  it('2026年の epoch ms (1_800_000_000_000) が欠損なく往復する', async () => {
    const repo = createDrizzleBookingRepository(db);
    const customerId = createId<'Customer'>();
    const serviceId = createId<'Service'>();
    const resourceId = createId<'Resource'>();
    // 2026年以降の大きな epoch ms 値
    const startMillis = 1_800_000_000_000;
    const endMillis = 1_800_003_600_000;
    const slot = createTimeRange(startMillis, endMillis);
    const booking = createBooking({ customerId, serviceId, resourceId, slot });

    await repo.save(booking);
    const found = await repo.findById(booking.id);

    expect(found).not.toBeNull();
    expect(found!.slot.start).toBe(startMillis);
    expect(found!.slot.end).toBe(endMillis);
  });
});
