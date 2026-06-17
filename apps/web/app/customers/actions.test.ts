import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createInMemoryCustomerRepository } from '@koma/crm';

// Mock next/cache so revalidatePath does not throw in test environment
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

// Each test gets its own repository instance
let testRepo: ReturnType<typeof createInMemoryCustomerRepository>;

vi.mock('@/lib/composition-root', () => ({
  getCustomerRepository: () => testRepo,
}));

// Import after mocks are established
const { createCustomerAction } = await import('./actions');

/** Build a FormData as a real HTML form would: every customer field is always
 *  present (empty string when not provided), matching browser form submission. */
function makeFormData(fields: { name?: string; phone?: string; email?: string }): FormData {
  const fd = new FormData();
  fd.append('name', fields.name ?? '');
  fd.append('phone', fields.phone ?? '');
  fd.append('email', fields.email ?? '');
  return fd;
}

describe('createCustomerAction', () => {
  beforeEach(() => {
    testRepo = createInMemoryCustomerRepository();
  });

  describe('TC-011: 有効 FormData で Customer が保存される', () => {
    it('名前と電話番号の FormData で ok: true が返りリポジトリに保存される', async () => {
      const fd = makeFormData({ name: '山田太郎', phone: '090-1234-5678' });
      const result = await createCustomerAction(null, fd);

      expect(result.ok).toBe(true);

      const saved = await testRepo.list();
      expect(saved).toHaveLength(1);
      expect(saved[0].name).toBe('山田太郎');
      expect(saved[0].contact.phone).toBe('090-1234-5678');
    });

    it('名前とメールの FormData で ok: true が返りリポジトリに保存される', async () => {
      const fd = makeFormData({ name: '鈴木花子', email: 'hanako@example.com' });
      const result = await createCustomerAction(null, fd);

      expect(result.ok).toBe(true);

      const saved = await testRepo.list();
      expect(saved).toHaveLength(1);
      expect(saved[0].name).toBe('鈴木花子');
      expect(saved[0].contact.email).toBe('hanako@example.com');
    });
  });

  describe('TC-012: 無効 FormData でエラーが返りデータは保存されない', () => {
    it('name が空の場合に ok: false を返しリポジトリに保存しない', async () => {
      const fd = makeFormData({ name: '', phone: '090-1234-5678' });
      const result = await createCustomerAction(null, fd);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.name).toBeDefined();

      const saved = await testRepo.list();
      expect(saved).toHaveLength(0);
    });

    it('電話・メール両方空の場合に ok: false を返しリポジトリに保存しない', async () => {
      const fd = makeFormData({ name: '山田太郎' });
      const result = await createCustomerAction(null, fd);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      const hasContactError =
        result.errors.contact != null ||
        result.errors._form != null ||
        Object.keys(result.errors).some(
          (k) => k !== 'name' && result.errors[k].length > 0,
        );
      expect(hasContactError).toBe(true);

      const saved = await testRepo.list();
      expect(saved).toHaveLength(0);
    });
  });
});
