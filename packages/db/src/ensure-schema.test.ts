import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { createCustomer, createContactInfo } from '@koma/crm';
import { createDrizzleClient } from './client.js';
import { ensureSchema } from './ensure-schema.js';
import { createDrizzleCustomerRepository } from './drizzle-customer-repository.js';

let pglite: PGlite;

beforeEach(() => {
  pglite = new PGlite();
});

afterEach(async () => {
  await pglite.close();
});

describe('ensureSchema', () => {
  it('4 テーブル（customers, resources, services, bookings）が作成される', async () => {
    const db = createDrizzleClient(pglite);
    await ensureSchema(db);

    const result = await db.execute<{ tablename: string }>(
      sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
    );
    const tableNames = result.rows.map((r) => r.tablename).sort();

    expect(tableNames).toContain('customers');
    expect(tableNames).toContain('resources');
    expect(tableNames).toContain('services');
    expect(tableNames).toContain('bookings');
  });

  it('2 回実行してもエラーが発生しない（冪等）', async () => {
    const db = createDrizzleClient(pglite);
    await expect(ensureSchema(db)).resolves.toBeUndefined();
    await expect(ensureSchema(db)).resolves.toBeUndefined();
  });

  it('ensureSchema 後に Drizzle repo が正常に動作する（Customer save → findById）', async () => {
    const db = createDrizzleClient(pglite);
    await ensureSchema(db);

    const repo = createDrizzleCustomerRepository(db);
    const contact = createContactInfo({ email: 'test@example.com' });
    const customer = createCustomer({ name: 'テスト顧客', contact });

    await repo.save(customer);
    const found = await repo.findById(customer.id);

    expect(found).not.toBeNull();
    expect(found!.id).toBe(customer.id);
    expect(found!.name).toBe('テスト顧客');
  });
});
