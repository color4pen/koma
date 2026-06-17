import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createInMemoryServiceRepository } from '@koma/catalog';

// Mock next/cache so revalidatePath does not throw in test environment
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

// Each test gets its own repository instance
let testRepo: ReturnType<typeof createInMemoryServiceRepository>;

vi.mock('@/lib/composition-root', () => ({
  getServiceRepository: () => testRepo,
}));

// Import after mocks are established
const { createServiceAction } = await import('./actions');
const { revalidatePath } = await import('next/cache');

/** Build a FormData as a real HTML form would: every service field is always
 *  present (empty string when not provided), matching browser form submission. */
function makeFormData(fields: {
  name?: string;
  durationMinutes?: string;
  priceYen?: string;
  resourceKinds?: string;
}): FormData {
  const fd = new FormData();
  fd.append('name', fields.name ?? '');
  fd.append('durationMinutes', fields.durationMinutes ?? '');
  fd.append('priceYen', fields.priceYen ?? '');
  fd.append('resourceKinds', fields.resourceKinds ?? '');
  return fd;
}

describe('createServiceAction', () => {
  beforeEach(() => {
    testRepo = createInMemoryServiceRepository();
    vi.clearAllMocks();
  });

  describe('TC-001: 有効なフォーム送信で Service が保存される', () => {
    it('有効な FormData で ok: true が返りリポジトリに保存される', async () => {
      const fd = makeFormData({
        name: 'カット',
        durationMinutes: '60',
        priceYen: '5000',
        resourceKinds: 'スタイリスト',
      });
      const result = await createServiceAction(null, fd);

      expect(result.ok).toBe(true);

      const saved = await testRepo.list();
      expect(saved).toHaveLength(1);
      expect(saved[0].name).toBe('カット');
      expect(saved[0].duration.milliseconds).toBe(3_600_000);
      expect(saved[0].price.amount).toBe(5000);
    });
  });

  describe('TC-002: 不正なフォーム送信でエラーが返り save が呼ばれない', () => {
    it('name が空の場合に ok: false を返しリポジトリに保存しない', async () => {
      const fd = makeFormData({
        name: '',
        durationMinutes: '60',
        priceYen: '5000',
        resourceKinds: '',
      });
      const result = await createServiceAction(null, fd);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.name).toBeDefined();

      const saved = await testRepo.list();
      expect(saved).toHaveLength(0);
    });
  });

  describe("TC-003: 成功時に revalidatePath('/services') が呼ばれる", () => {
    it("有効な FormData で revalidatePath が '/services' で呼ばれる", async () => {
      const fd = makeFormData({
        name: 'カット',
        durationMinutes: '60',
        priceYen: '5000',
        resourceKinds: '',
      });
      await createServiceAction(null, fd);

      expect(revalidatePath).toHaveBeenCalledWith('/services');
    });
  });
});
