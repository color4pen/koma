import { beforeEach, describe, expect, it } from 'vitest';

import { createInMemoryServiceRepository, createService } from '@koma/catalog';
import { createResource, createInMemoryResourceRepository } from '@koma/resource';
import { createInMemoryBookingRepository } from '@koma/scheduling';
import type { Id } from '@koma/shared';
import { createMoney, ofMinutes } from '@koma/shared';

import { createBookingUseCase } from './create-booking-use-case';
import type { CreateBookingDeps } from './create-booking-use-case';

// 固定の epoch ミリ秒: 2026-07-01 10:00 UTC
const BASE_MS = new Date('2026-07-01T10:00:00.000Z').getTime();
const HOUR_MS = 60 * 60 * 1000;

function makeDeps(): CreateBookingDeps {
  return {
    serviceRepo: createInMemoryServiceRepository(),
    resourceRepo: createInMemoryResourceRepository(),
    bookingRepo: createInMemoryBookingRepository(),
  };
}

describe('createBookingUseCase', () => {
  let deps: CreateBookingDeps;

  beforeEach(() => {
    deps = makeDeps();
  });

  describe('正常系: 有効な入力で予約が作成される', () => {
    it('capacity=1 の Resource と 60 分の Service で ok: true が返り booking が保存される', async () => {
      const service = createService({
        name: 'カット',
        duration: ofMinutes(60),
        price: createMoney(5000, 'JPY'),
      });
      const resource = createResource({ name: 'スタイリスト A', kind: 'stylist', capacity: 1 });

      await deps.serviceRepo.save(service);
      await deps.resourceRepo.save(resource);

      const result = await createBookingUseCase(deps, {
        customerId: 'customer-1' as Id<'Customer'>,
        serviceId: service.id,
        resourceId: resource.id,
        startMillis: BASE_MS,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.booking.status).toBe('pending');
      expect(result.booking.slot.end - result.booking.slot.start).toBe(HOUR_MS);

      const saved = await deps.bookingRepo.list();
      expect(saved).toHaveLength(1);
    });
  });

  describe('二重予約防止: capacity=1 で同一 Resource・重なる時刻の 2 件目は no-capacity', () => {
    it('10:00〜11:00 の予約後、10:30〜11:30 の予約で no-capacity', async () => {
      const service = createService({
        name: 'カット',
        duration: ofMinutes(60),
        price: createMoney(5000, 'JPY'),
      });
      const resource = createResource({ name: 'スタイリスト A', kind: 'stylist', capacity: 1 });

      await deps.serviceRepo.save(service);
      await deps.resourceRepo.save(resource);

      const input = {
        customerId: 'customer-1' as Id<'Customer'>,
        serviceId: service.id,
        resourceId: resource.id,
      };

      // 1件目: 10:00〜11:00
      const first = await createBookingUseCase(deps, {
        ...input,
        startMillis: BASE_MS,
      });
      expect(first.ok).toBe(true);

      // 2件目: 10:30〜11:30（重複）
      const second = await createBookingUseCase(deps, {
        ...input,
        startMillis: BASE_MS + 30 * 60 * 1000,
      });

      expect(second.ok).toBe(false);
      if (second.ok) return;
      expect(second.reason).toBe('no-capacity');
    });
  });

  describe('隣接時刻: capacity=1 で [a,b)+[b,c) は ok', () => {
    it('10:00〜11:00 の予約後、11:00〜12:00 の予約で ok', async () => {
      const service = createService({
        name: 'カット',
        duration: ofMinutes(60),
        price: createMoney(5000, 'JPY'),
      });
      const resource = createResource({ name: 'スタイリスト A', kind: 'stylist', capacity: 1 });

      await deps.serviceRepo.save(service);
      await deps.resourceRepo.save(resource);

      const input = {
        customerId: 'customer-1' as Id<'Customer'>,
        serviceId: service.id,
        resourceId: resource.id,
      };

      // 1件目: 10:00〜11:00
      const first = await createBookingUseCase(deps, {
        ...input,
        startMillis: BASE_MS,
      });
      expect(first.ok).toBe(true);

      // 2件目: 11:00〜12:00（隣接）
      const second = await createBookingUseCase(deps, {
        ...input,
        startMillis: BASE_MS + HOUR_MS,
      });

      expect(second.ok).toBe(true);
    });
  });

  describe('capacity=2 で 2 件 ok、3 件目は no-capacity', () => {
    it('同一時刻で 2 件目まで ok、3 件目は no-capacity', async () => {
      const service = createService({
        name: 'カット',
        duration: ofMinutes(60),
        price: createMoney(5000, 'JPY'),
      });
      const resource = createResource({ name: 'チェア', kind: 'chair', capacity: 2 });

      await deps.serviceRepo.save(service);
      await deps.resourceRepo.save(resource);

      const input = {
        customerId: 'customer-1' as Id<'Customer'>,
        serviceId: service.id,
        resourceId: resource.id,
        startMillis: BASE_MS,
      };

      const first = await createBookingUseCase(deps, input);
      expect(first.ok).toBe(true);

      const second = await createBookingUseCase(deps, input);
      expect(second.ok).toBe(true);

      const third = await createBookingUseCase(deps, input);
      expect(third.ok).toBe(false);
      if (third.ok) return;
      expect(third.reason).toBe('no-capacity');
    });
  });

  describe('service-not-found: 存在しない serviceId', () => {
    it('serviceRepo にサービスを save しないと service-not-found', async () => {
      const resource = createResource({ name: 'スタイリスト A', kind: 'stylist', capacity: 1 });
      await deps.resourceRepo.save(resource);

      const result = await createBookingUseCase(deps, {
        customerId: 'customer-1' as Id<'Customer'>,
        serviceId: 'nonexistent-service' as Id<'Service'>,
        resourceId: resource.id,
        startMillis: BASE_MS,
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason).toBe('service-not-found');
    });
  });

  describe('resource-not-found: 存在しない resourceId', () => {
    it('serviceRepo にサービスを save するが resourceRepo にリソースを save しないと resource-not-found', async () => {
      const service = createService({
        name: 'カット',
        duration: ofMinutes(60),
        price: createMoney(5000, 'JPY'),
      });
      await deps.serviceRepo.save(service);

      const result = await createBookingUseCase(deps, {
        customerId: 'customer-1' as Id<'Customer'>,
        serviceId: service.id,
        resourceId: 'nonexistent-resource' as Id<'Resource'>,
        startMillis: BASE_MS,
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason).toBe('resource-not-found');
    });
  });
});
