import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { createResource } from '@koma/resource';
import { createId } from '@koma/shared';
import { createDrizzleClient } from './client.js';
import { createDrizzleResourceRepository } from './drizzle-resource-repository.js';
import { type DrizzleClient } from './client.js';

const CREATE_RESOURCES_TABLE = `
  CREATE TABLE IF NOT EXISTS resources (
    id       TEXT PRIMARY KEY,
    name     TEXT NOT NULL,
    kind     TEXT NOT NULL,
    capacity INTEGER NOT NULL
  )
`;

let pglite: PGlite;
let db: DrizzleClient;

beforeEach(async () => {
  pglite = new PGlite();
  await pglite.exec(CREATE_RESOURCES_TABLE);
  db = createDrizzleClient(pglite);
});

afterEach(async () => {
  await pglite.close();
});

describe('DrizzleResourceRepository', () => {
  // テスト 1: save → findById で同値取得
  it('save した Resource を findById で全フィールド一致で取得できる', async () => {
    const repo = createDrizzleResourceRepository(db);
    const resource = createResource({
      name: 'シャンプー台 A',
      kind: 'seat',
      capacity: 3,
    });

    await repo.save(resource);
    const found = await repo.findById(resource.id);

    expect(found).not.toBeNull();
    expect(found!.id).toBe(resource.id);
    expect(found!.name).toBe(resource.name);
    expect(found!.kind).toBe(resource.kind);
    expect(found!.capacity).toBe(resource.capacity);
  });

  // テスト 2: 未保存 id は null
  it('未保存の id で findById すると null が返る', async () => {
    const repo = createDrizzleResourceRepository(db);
    const id = createId<'Resource'>();
    const result = await repo.findById(id);
    expect(result).toBeNull();
  });

  // テスト 3: list が保存分を返す
  it('複数の Resource を save し、list が全件返す', async () => {
    const repo = createDrizzleResourceRepository(db);
    const resource1 = createResource({ name: 'スタイリスト A', kind: 'stylist', capacity: 1 });
    const resource2 = createResource({ name: 'スタイリスト B', kind: 'stylist', capacity: 1 });
    const resource3 = createResource({ name: 'シャンプー台 A', kind: 'seat', capacity: 2 });

    await repo.save(resource1);
    await repo.save(resource2);
    await repo.save(resource3);

    const list = await repo.list();
    expect(list).toHaveLength(3);
    const ids = list.map((r) => r.id);
    expect(ids).toContain(resource1.id);
    expect(ids).toContain(resource2.id);
    expect(ids).toContain(resource3.id);
  });

  // テスト 4: 同一 id 再 save で更新（upsert）
  it('同一 id で再 save すると既存データが更新される（upsert）', async () => {
    const repo = createDrizzleResourceRepository(db);
    const resource = createResource({ name: 'チェア A', kind: 'chair', capacity: 1 });

    await repo.save(resource);

    const updated = createResource({
      id: resource.id,
      name: 'チェア A Updated',
      kind: 'chair',
      capacity: 2,
    });
    await repo.save(updated);

    const found = await repo.findById(resource.id);
    expect(found!.name).toBe('チェア A Updated');
    expect(found!.capacity).toBe(2);

    const list = await repo.list();
    expect(list).toHaveLength(1);
  });

  // テスト 5: capacity の不変条件が createResource 経由で通ること
  it('行 → Resource の再構成が capacity >= 1 の不変条件を createResource 経由で通す', async () => {
    const repo = createDrizzleResourceRepository(db);
    const resource = createResource({
      name: 'ベッド A',
      kind: 'bed',
      capacity: 5,
    });

    await repo.save(resource);
    const found = await repo.findById(resource.id);

    expect(found).not.toBeNull();
    expect(found!.capacity).toBe(5);
    expect(found!.capacity).toBeGreaterThanOrEqual(1);
  });
});
