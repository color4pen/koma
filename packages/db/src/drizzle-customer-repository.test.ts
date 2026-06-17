import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { createCustomer, createContactInfo } from '@koma/crm';
import { createId } from '@koma/shared';
import { createDrizzleClient } from './client.js';
import { createDrizzleCustomerRepository } from './drizzle-customer-repository.js';
import { type DrizzleClient } from './client.js';

const CREATE_CUSTOMERS_TABLE = `
  CREATE TABLE IF NOT EXISTS customers (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    phone       TEXT,
    email       TEXT,
    tags        JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes       TEXT NOT NULL DEFAULT '',
    custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb
  )
`;

let pglite: PGlite;
let db: DrizzleClient;

beforeEach(async () => {
  pglite = new PGlite();
  await pglite.exec(CREATE_CUSTOMERS_TABLE);
  db = createDrizzleClient(pglite);
});

afterEach(async () => {
  await pglite.close();
});

describe('DrizzleCustomerRepository', () => {
  // テスト 1: save → findById で同値取得
  it('save した Customer を findById で全フィールド一致で取得できる', async () => {
    const repo = createDrizzleCustomerRepository(db);
    const contact = createContactInfo({ phone: '090-1234-5678', email: 'test@example.com' });
    const customer = createCustomer({
      name: '山田 太郎',
      contact,
      tags: ['vip', 'regular'],
      notes: 'メモ',
      customFields: { rank: 'gold', visits: 5, active: true },
    });

    await repo.save(customer);
    const found = await repo.findById(customer.id);

    expect(found).not.toBeNull();
    expect(found!.id).toBe(customer.id);
    expect(found!.name).toBe(customer.name);
    expect(found!.contact.phone).toBe(customer.contact.phone);
    expect(found!.contact.email).toBe(customer.contact.email);
    expect(found!.tags).toEqual(customer.tags);
    expect(found!.notes).toBe(customer.notes);
    expect(found!.customFields).toEqual(customer.customFields);
  });

  // テスト 2: 未保存 id は null
  it('未保存の id で findById すると null が返る', async () => {
    const repo = createDrizzleCustomerRepository(db);
    const id = createId<'Customer'>();
    const result = await repo.findById(id);
    expect(result).toBeNull();
  });

  // テスト 3: list が保存分を返す
  it('複数の Customer を save し、list が全件返す', async () => {
    const repo = createDrizzleCustomerRepository(db);
    const contact = createContactInfo({ email: 'a@example.com' });
    const customer1 = createCustomer({ name: '山田 太郎', contact });
    const customer2 = createCustomer({ name: '田中 花子', contact });
    const customer3 = createCustomer({ name: '鈴木 一郎', contact });

    await repo.save(customer1);
    await repo.save(customer2);
    await repo.save(customer3);

    const list = await repo.list();
    expect(list).toHaveLength(3);
    const ids = list.map((c) => c.id);
    expect(ids).toContain(customer1.id);
    expect(ids).toContain(customer2.id);
    expect(ids).toContain(customer3.id);
  });

  // テスト 4: 同一 id 再 save で更新（upsert）
  it('同一 id で再 save すると既存データが更新される（upsert）', async () => {
    const repo = createDrizzleCustomerRepository(db);
    const contact = createContactInfo({ email: 'alice@example.com' });
    const customer = createCustomer({ name: 'Alice', contact });

    await repo.save(customer);

    const updated = createCustomer({
      id: customer.id,
      name: 'Alice Updated',
      contact,
    });
    await repo.save(updated);

    const found = await repo.findById(customer.id);
    expect(found!.name).toBe('Alice Updated');

    const list = await repo.list();
    expect(list).toHaveLength(1);
  });

  // テスト 5: 行 → Customer が集約不変条件を満たす
  describe('行 → Customer の再構成が集約不変条件を満たす', () => {
    it('phone のみの Customer を save → findById で再構成すると ContactInfo が不変条件を満たす', async () => {
      const repo = createDrizzleCustomerRepository(db);
      const contact = createContactInfo({ phone: '090-1234-5678', email: null });
      const customer = createCustomer({ name: 'phone-only', contact });

      await repo.save(customer);
      const found = await repo.findById(customer.id);

      expect(found).not.toBeNull();
      expect(found!.contact.phone).toBe('090-1234-5678');
      expect(found!.contact.email).toBeNull();
      // ContactInfo の不変条件: phone か email のどちらかが必ず非 null
      expect(found!.contact.phone !== null || found!.contact.email !== null).toBe(true);
    });

    it('email のみの Customer を save → findById で再構成すると ContactInfo が不変条件を満たす', async () => {
      const repo = createDrizzleCustomerRepository(db);
      const contact = createContactInfo({ phone: null, email: 'test@example.com' });
      const customer = createCustomer({ name: 'email-only', contact });

      await repo.save(customer);
      const found = await repo.findById(customer.id);

      expect(found).not.toBeNull();
      expect(found!.contact.phone).toBeNull();
      expect(found!.contact.email).toBe('test@example.com');
      expect(found!.contact.phone !== null || found!.contact.email !== null).toBe(true);
    });

    it('phone と email の両方を持つ Customer を save → findById で再構成すると ContactInfo が不変条件を満たす', async () => {
      const repo = createDrizzleCustomerRepository(db);
      const contact = createContactInfo({ phone: '090-1234-5678', email: 'test@example.com' });
      const customer = createCustomer({ name: 'both-contact', contact });

      await repo.save(customer);
      const found = await repo.findById(customer.id);

      expect(found).not.toBeNull();
      expect(found!.contact.phone).toBe('090-1234-5678');
      expect(found!.contact.email).toBe('test@example.com');
      expect(found!.contact.phone !== null || found!.contact.email !== null).toBe(true);
    });
  });
});
