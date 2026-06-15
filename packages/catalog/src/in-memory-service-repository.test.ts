import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryServiceRepository } from './in-memory-service-repository.js';
import { createService } from './service.js';
import { createId, ofMinutes, createMoney } from '@koma/shared';
import { type ServiceRepository } from './port/service-repository.js';

const validDuration = ofMinutes(60);
const validPrice = createMoney(5000, 'JPY');

describe('createInMemoryServiceRepository', () => {
  let repo: ServiceRepository;

  beforeEach(() => {
    repo = createInMemoryServiceRepository();
  });

  it('save した Service を findById で取得できる', async () => {
    const service = createService({
      name: 'カット',
      duration: validDuration,
      price: validPrice,
    });
    await repo.save(service);
    const found = await repo.findById(service.id);
    expect(found).toEqual(service);
  });

  it('未保存の id で findById すると null が返る', async () => {
    const id = createId<'Service'>();
    const found = await repo.findById(id);
    expect(found).toBeNull();
  });

  it('save → list で保存分が全て返る', async () => {
    const service = createService({
      name: 'カット',
      duration: validDuration,
      price: validPrice,
    });
    await repo.save(service);
    const list = await repo.list();
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual(service);
  });

  it('空の状態で list が空配列を返す', async () => {
    const list = await repo.list();
    expect(list).toEqual([]);
  });

  it('同一 id で save を 2 回呼ぶと上書き（upsert）される', async () => {
    const service = createService({
      name: 'カット',
      duration: validDuration,
      price: validPrice,
    });
    await repo.save(service);

    const updated = createService({
      id: service.id,
      name: 'カット＆ブロー',
      duration: validDuration,
      price: validPrice,
    });
    await repo.save(updated);

    const list = await repo.list();
    expect(list).toHaveLength(1);
    const found = await repo.findById(service.id);
    expect(found?.name).toBe('カット＆ブロー');
  });

  it('複数の Service を save し、list が全件返す', async () => {
    const service1 = createService({
      name: 'カット',
      duration: ofMinutes(60),
      price: createMoney(5000, 'JPY'),
    });
    const service2 = createService({
      name: 'カラー',
      duration: ofMinutes(90),
      price: createMoney(8000, 'JPY'),
    });
    const service3 = createService({
      name: 'パーマ',
      duration: ofMinutes(120),
      price: createMoney(12000, 'JPY'),
    });
    await repo.save(service1);
    await repo.save(service2);
    await repo.save(service3);
    const list = await repo.list();
    expect(list).toHaveLength(3);
  });
});
