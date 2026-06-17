import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { createService } from '@koma/catalog';
import { createId, ofMilliseconds, createMoney } from '@koma/shared';
import { createDrizzleClient } from './client.js';
import { createDrizzleServiceRepository } from './drizzle-service-repository.js';
import { type DrizzleClient } from './client.js';

const CREATE_SERVICES_TABLE = `
  CREATE TABLE IF NOT EXISTS services (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    duration_ms     INTEGER NOT NULL,
    price_amount    INTEGER NOT NULL,
    price_currency  TEXT NOT NULL,
    resource_kinds  JSONB NOT NULL DEFAULT '[]'::jsonb
  )
`;

let pglite: PGlite;
let db: DrizzleClient;

beforeEach(async () => {
  pglite = new PGlite();
  await pglite.exec(CREATE_SERVICES_TABLE);
  db = createDrizzleClient(pglite);
});

afterEach(async () => {
  await pglite.close();
});

describe('DrizzleServiceRepository', () => {
  // テスト 1: save → findById で全フィールド一致
  it('save した Service を findById で全フィールド一致で取得できる', async () => {
    const repo = createDrizzleServiceRepository(db);
    const service = createService({
      name: 'カット',
      duration: ofMilliseconds(3_600_000),
      price: createMoney(5000, 'JPY'),
      resourceKinds: ['stylist', 'seat'],
    });

    await repo.save(service);
    const found = await repo.findById(service.id);

    expect(found).not.toBeNull();
    expect(found!.id).toBe(service.id);
    expect(found!.name).toBe(service.name);
    expect(found!.duration.milliseconds).toBe(service.duration.milliseconds);
    expect(found!.price.amount).toBe(service.price.amount);
    expect(found!.price.currency).toBe(service.price.currency);
    expect(found!.resourceKinds).toEqual(service.resourceKinds);
  });

  // テスト 2: 未保存 id は null
  it('未保存の id で findById すると null が返る', async () => {
    const repo = createDrizzleServiceRepository(db);
    const id = createId<'Service'>();
    const result = await repo.findById(id);
    expect(result).toBeNull();
  });

  // テスト 3: list が保存分を返す
  it('複数の Service を save し、list が全件返す', async () => {
    const repo = createDrizzleServiceRepository(db);
    const service1 = createService({
      name: 'カット',
      duration: ofMilliseconds(3_600_000),
      price: createMoney(5000, 'JPY'),
    });
    const service2 = createService({
      name: 'カラー',
      duration: ofMilliseconds(7_200_000),
      price: createMoney(8000, 'JPY'),
    });
    const service3 = createService({
      name: 'パーマ',
      duration: ofMilliseconds(5_400_000),
      price: createMoney(10000, 'JPY'),
    });

    await repo.save(service1);
    await repo.save(service2);
    await repo.save(service3);

    const list = await repo.list();
    expect(list).toHaveLength(3);
    const ids = list.map((s) => s.id);
    expect(ids).toContain(service1.id);
    expect(ids).toContain(service2.id);
    expect(ids).toContain(service3.id);
  });

  // テスト 4: 同一 id 再 save で更新（upsert）
  it('同一 id で再 save すると既存データが更新される（upsert）', async () => {
    const repo = createDrizzleServiceRepository(db);
    const service = createService({
      name: 'カット',
      duration: ofMilliseconds(3_600_000),
      price: createMoney(5000, 'JPY'),
    });

    await repo.save(service);

    const updated = createService({
      id: service.id,
      name: 'カット（プレミアム）',
      duration: ofMilliseconds(4_800_000),
      price: createMoney(7000, 'JPY'),
    });
    await repo.save(updated);

    const found = await repo.findById(service.id);
    expect(found!.name).toBe('カット（プレミアム）');
    expect(found!.duration.milliseconds).toBe(4_800_000);
    expect(found!.price.amount).toBe(7000);

    const list = await repo.list();
    expect(list).toHaveLength(1);
  });

  // テスト 5: duration が往復で保たれる
  it('duration が往復で保たれる（ofMilliseconds 経由で再構成）', async () => {
    const repo = createDrizzleServiceRepository(db);
    const durationMs = 5_400_000; // 90 minutes
    const service = createService({
      name: 'トリートメント',
      duration: ofMilliseconds(durationMs),
      price: createMoney(3000, 'JPY'),
    });

    await repo.save(service);
    const found = await repo.findById(service.id);

    expect(found!.duration.milliseconds).toBe(durationMs);
  });

  // テスト 6: price が往復で保たれる
  it('price が往復で保たれる（createMoney 経由で再構成）', async () => {
    const repo = createDrizzleServiceRepository(db);
    const service = createService({
      name: 'ヘッドスパ',
      duration: ofMilliseconds(1_800_000),
      price: createMoney(4500, 'JPY'),
    });

    await repo.save(service);
    const found = await repo.findById(service.id);

    expect(found!.price.amount).toBe(4500);
    expect(found!.price.currency).toBe('JPY');
  });

  // テスト 7: resourceKinds（非空配列）が往復で保たれる
  it('resourceKinds が往復で保たれる（非空配列）', async () => {
    const repo = createDrizzleServiceRepository(db);
    const service = createService({
      name: 'フルコース',
      duration: ofMilliseconds(7_200_000),
      price: createMoney(15000, 'JPY'),
      resourceKinds: ['seat', 'stylist'],
    });

    await repo.save(service);
    const found = await repo.findById(service.id);

    expect(found!.resourceKinds).toEqual(['seat', 'stylist']);
  });

  // テスト 8: resourceKinds が空配列の場合も往復する
  it('resourceKinds が空配列の場合も往復する', async () => {
    const repo = createDrizzleServiceRepository(db);
    const service = createService({
      name: 'シャンプーのみ',
      duration: ofMilliseconds(900_000),
      price: createMoney(1000, 'JPY'),
      resourceKinds: [],
    });

    await repo.save(service);
    const found = await repo.findById(service.id);

    expect(found!.resourceKinds).toEqual([]);
  });
});
