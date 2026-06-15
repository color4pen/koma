import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryCustomerRepository } from './in-memory-customer-repository.js';
import { createCustomer } from './customer.js';
import { createContactInfo } from './contact-info.js';
import { createId } from '@koma/shared';
import { type CustomerRepository } from './port/customer-repository.js';

const contact = createContactInfo({ email: 'test@example.com' });

describe('createInMemoryCustomerRepository', () => {
  let repo: CustomerRepository;

  beforeEach(() => {
    repo = createInMemoryCustomerRepository();
  });

  it('save した Customer を findById で取得できる', async () => {
    const customer = createCustomer({ name: '山田 太郎', contact });
    await repo.save(customer);
    const found = await repo.findById(customer.id);
    expect(found).toEqual(customer);
  });

  it('未保存の id で findById すると null が返る', async () => {
    const id = createId<'Customer'>();
    const found = await repo.findById(id);
    expect(found).toBeNull();
  });

  it('save → list で保存分が全て返る', async () => {
    const customer = createCustomer({ name: '山田 太郎', contact });
    await repo.save(customer);
    const list = await repo.list();
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual(customer);
  });

  it('空の状態で list が空配列を返す', async () => {
    const list = await repo.list();
    expect(list).toEqual([]);
  });

  it('同一 id で save を 2 回呼ぶと上書き（upsert）される', async () => {
    const customer = createCustomer({ name: '山田 太郎', contact });
    await repo.save(customer);

    const updated = createCustomer({
      id: customer.id,
      name: '山田 次郎',
      contact,
    });
    await repo.save(updated);

    const list = await repo.list();
    expect(list).toHaveLength(1);
    const found = await repo.findById(customer.id);
    expect(found?.name).toBe('山田 次郎');
  });

  it('複数の Customer を save し、list が全件返す', async () => {
    const customer1 = createCustomer({ name: '山田 太郎', contact });
    const customer2 = createCustomer({ name: '田中 花子', contact });
    const customer3 = createCustomer({ name: '鈴木 一郎', contact });
    await repo.save(customer1);
    await repo.save(customer2);
    await repo.save(customer3);
    const list = await repo.list();
    expect(list).toHaveLength(3);
  });
});
