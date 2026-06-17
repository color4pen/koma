import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createInMemoryResourceRepository } from '@koma/resource';

// Mock next/cache so revalidatePath does not throw in test environment
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

// Each test gets its own repository instance
let testRepo: ReturnType<typeof createInMemoryResourceRepository>;

vi.mock('@/lib/composition-root', () => ({
  getResourceRepository: () => testRepo,
}));

// Import after mocks are established
const { createResourceAction } = await import('./actions');
const { revalidatePath } = await import('next/cache');

/** Build a FormData as a real HTML form would: every resource field is always
 *  present (empty string when not provided), matching browser form submission. */
function makeFormData(fields: {
  name?: string;
  kind?: string;
  capacity?: string;
}): FormData {
  const fd = new FormData();
  fd.append('name', fields.name ?? '');
  fd.append('kind', fields.kind ?? '');
  fd.append('capacity', fields.capacity ?? '');
  return fd;
}

describe('createResourceAction', () => {
  beforeEach(() => {
    testRepo = createInMemoryResourceRepository();
    vi.clearAllMocks();
  });

  describe('TC-015: 有効なフォーム送信で Resource が保存される', () => {
    it('有効な FormData で ok: true が返りリポジトリに保存される', async () => {
      const fd = makeFormData({ name: '田中', kind: 'スタイリスト', capacity: '2' });
      const result = await createResourceAction(null, fd);

      expect(result.ok).toBe(true);

      const saved = await testRepo.list();
      expect(saved).toHaveLength(1);
      expect(saved[0].name).toBe('田中');
      expect(saved[0].kind).toBe('スタイリスト');
      expect(saved[0].capacity).toBe(2);
    });
  });

  describe('TC-016: 不正なフォーム送信でエラーが返り save が呼ばれない', () => {
    it('name が空の場合に ok: false を返しリポジトリに保存しない', async () => {
      const fd = makeFormData({ name: '', kind: 'スタイリスト', capacity: '1' });
      const result = await createResourceAction(null, fd);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.name).toBeDefined();

      const saved = await testRepo.list();
      expect(saved).toHaveLength(0);
    });

    it('capacity が 0 の場合に ok: false を返しリポジトリに保存しない', async () => {
      const fd = makeFormData({ name: '田中', kind: 'スタイリスト', capacity: '0' });
      const result = await createResourceAction(null, fd);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.capacity).toBeDefined();

      const saved = await testRepo.list();
      expect(saved).toHaveLength(0);
    });
  });

  describe("TC-017: 成功時に revalidatePath('/resources') が呼ばれる", () => {
    it("有効な FormData で revalidatePath が '/resources' で呼ばれる", async () => {
      const fd = makeFormData({ name: '田中', kind: 'スタイリスト', capacity: '1' });
      await createResourceAction(null, fd);

      expect(revalidatePath).toHaveBeenCalledWith('/resources');
    });
  });
});
