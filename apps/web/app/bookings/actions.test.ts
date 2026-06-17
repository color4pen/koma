import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createInMemoryServiceRepository, createService } from '@koma/catalog';
import { createResource, createInMemoryResourceRepository } from '@koma/resource';
import { createInMemoryBookingRepository } from '@koma/scheduling';
import { createMoney, ofMinutes } from '@koma/shared';

// Mock next/cache so revalidatePath does not throw in test environment
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

// Each test gets its own repository instances
let testServiceRepo: ReturnType<typeof createInMemoryServiceRepository>;
let testResourceRepo: ReturnType<typeof createInMemoryResourceRepository>;
let testBookingRepo: ReturnType<typeof createInMemoryBookingRepository>;

vi.mock('@/lib/composition-root', () => ({
  getServiceRepository: () => testServiceRepo,
  getResourceRepository: () => testResourceRepo,
  getBookingRepository: () => testBookingRepo,
}));

// Import after mocks are established
const { createBookingAction } = await import('./actions');
const { revalidatePath } = await import('next/cache');

function makeFormData(fields: {
  customerId?: string;
  serviceId?: string;
  resourceId?: string;
  startAt?: string;
}): FormData {
  const fd = new FormData();
  fd.append('customerId', fields.customerId ?? '');
  fd.append('serviceId', fields.serviceId ?? '');
  fd.append('resourceId', fields.resourceId ?? '');
  fd.append('startAt', fields.startAt ?? '');
  return fd;
}

describe('createBookingAction', () => {
  let serviceId: string;
  let resourceId: string;

  beforeEach(async () => {
    testServiceRepo = createInMemoryServiceRepository();
    testResourceRepo = createInMemoryResourceRepository();
    testBookingRepo = createInMemoryBookingRepository();
    vi.clearAllMocks();

    // セットアップ: Service と Resource を事前に保存
    const service = createService({
      name: 'カット',
      duration: ofMinutes(60),
      price: createMoney(5000, 'JPY'),
    });
    const resource = createResource({ name: 'スタイリスト A', kind: 'stylist', capacity: 1 });

    await testServiceRepo.save(service);
    await testResourceRepo.save(resource);

    serviceId = service.id;
    resourceId = resource.id;
  });

  describe('TC-001: 有効なフォーム送信で予約が保存される', () => {
    it('有効な FormData で ok: true が返り bookingRepo に 1 件保存される', async () => {
      const fd = makeFormData({
        customerId: 'customer-1',
        serviceId,
        resourceId,
        startAt: '2026-07-01T10:00',
      });

      const result = await createBookingAction(null, fd);

      expect(result.ok).toBe(true);

      const saved = await testBookingRepo.list();
      expect(saved).toHaveLength(1);
    });
  });

  describe('TC-002: 不正なフォーム送信でエラーが返り save が呼ばれない', () => {
    it('customerId が空で ok: false かつ bookingRepo に保存されない', async () => {
      const fd = makeFormData({
        customerId: '',
        serviceId,
        resourceId,
        startAt: '2026-07-01T10:00',
      });

      const result = await createBookingAction(null, fd);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.customerId).toBeDefined();

      const saved = await testBookingRepo.list();
      expect(saved).toHaveLength(0);
    });
  });

  describe('TC-003: capacity 不足でエラーメッセージが返る', () => {
    it('同一 Resource に 2 件目の重なる予約で errors._form にメッセージ', async () => {
      const fd = makeFormData({
        customerId: 'customer-1',
        serviceId,
        resourceId,
        startAt: '2026-07-01T10:00',
      });

      // 1件目: 成功
      const first = await createBookingAction(null, fd);
      expect(first.ok).toBe(true);

      // 2件目: 同じ時刻（重複）
      const second = await createBookingAction(null, fd);
      expect(second.ok).toBe(false);
      if (second.ok) return;
      expect(second.errors._form).toBeDefined();
      expect(second.errors._form[0]).toBe('この時間帯は予約が埋まっています');
    });
  });

  describe("TC-004: 成功時に revalidatePath('/bookings') が呼ばれる", () => {
    it("有効な FormData で revalidatePath が '/bookings' で呼ばれる", async () => {
      const fd = makeFormData({
        customerId: 'customer-1',
        serviceId,
        resourceId,
        startAt: '2026-07-01T10:00',
      });

      await createBookingAction(null, fd);

      expect(revalidatePath).toHaveBeenCalledWith('/bookings');
    });
  });
});
