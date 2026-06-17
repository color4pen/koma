import { describe, expect, it } from 'vitest';

import { createService, createInMemoryServiceRepository } from '@koma/catalog';
import { createCustomer, createInMemoryCustomerRepository, createContactInfo } from '@koma/crm';
import { createResource, createInMemoryResourceRepository } from '@koma/resource';
import { createBooking, createInMemoryBookingRepository } from '@koma/scheduling';
import { createId, createMoney, ofMinutes } from '@koma/shared';

import { getDashboardCounts } from './dashboard';

describe('getDashboardCounts', () => {
  it('空の repo で全 0 を返す', async () => {
    const customerRepo = createInMemoryCustomerRepository();
    const resourceRepo = createInMemoryResourceRepository();
    const serviceRepo = createInMemoryServiceRepository();
    const bookingRepo = createInMemoryBookingRepository();

    const counts = await getDashboardCounts({ customerRepo, resourceRepo, serviceRepo, bookingRepo });

    expect(counts).toEqual({ customers: 0, resources: 0, services: 0, bookings: 0 });
  });

  it('各 repo に既知件数を save した状態で正しい件数を返す', async () => {
    const customerRepo = createInMemoryCustomerRepository();
    const resourceRepo = createInMemoryResourceRepository();
    const serviceRepo = createInMemoryServiceRepository();
    const bookingRepo = createInMemoryBookingRepository();

    // customers: 2件
    const customer1 = createCustomer({ name: '山田太郎', contact: createContactInfo({ phone: '090-1111-2222' }) });
    const customer2 = createCustomer({ name: '鈴木花子', contact: createContactInfo({ phone: '090-3333-4444' }) });
    await customerRepo.save(customer1);
    await customerRepo.save(customer2);

    // resources: 1件
    const resource1 = createResource({ name: 'スタイリスト A', kind: 'stylist', capacity: 1 });
    await resourceRepo.save(resource1);

    // services: 3件
    const service1 = createService({ name: 'カット', duration: ofMinutes(60), price: createMoney(5000, 'JPY') });
    const service2 = createService({ name: 'カラー', duration: ofMinutes(90), price: createMoney(8000, 'JPY') });
    const service3 = createService({ name: 'パーマ', duration: ofMinutes(120), price: createMoney(10000, 'JPY') });
    await serviceRepo.save(service1);
    await serviceRepo.save(service2);
    await serviceRepo.save(service3);

    // bookings: 1件
    const BASE_MS = new Date('2026-07-01T10:00:00.000Z').getTime();
    const HOUR_MS = 60 * 60 * 1000;
    const booking1 = createBooking({
      customerId: customer1.id,
      serviceId: service1.id,
      resourceId: resource1.id,
      slot: { start: BASE_MS, end: BASE_MS + HOUR_MS },
    });
    await bookingRepo.save(booking1);

    const counts = await getDashboardCounts({ customerRepo, resourceRepo, serviceRepo, bookingRepo });

    expect(counts).toEqual({ customers: 2, resources: 1, services: 3, bookings: 1 });
  });
});
