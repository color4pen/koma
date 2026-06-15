import { describe, it, expect, beforeEach } from 'vitest';
import { createInMemoryResourceRepository } from './in-memory-resource-repository.js';
import { createResource } from './resource.js';
import { createId } from '@koma/shared';
import { type ResourceRepository } from './port/resource-repository.js';

describe('createInMemoryResourceRepository', () => {
  let repo: ResourceRepository;

  beforeEach(() => {
    repo = createInMemoryResourceRepository();
  });

  it('save した Resource を findById で取得できる', async () => {
    const resource = createResource({ name: 'スタイリスト A', kind: 'staff' });
    await repo.save(resource);
    const found = await repo.findById(resource.id);
    expect(found).toEqual(resource);
  });

  it('未保存の id で findById すると null が返る', async () => {
    const id = createId<'Resource'>();
    const found = await repo.findById(id);
    expect(found).toBeNull();
  });

  it('save → list で保存分が全て返る', async () => {
    const resource = createResource({ name: 'スタイリスト A', kind: 'staff' });
    await repo.save(resource);
    const list = await repo.list();
    expect(list).toHaveLength(1);
    expect(list[0]).toEqual(resource);
  });

  it('空の状態で list が空配列を返す', async () => {
    const list = await repo.list();
    expect(list).toEqual([]);
  });

  it('同一 id で save を 2 回呼ぶと上書き（upsert）される', async () => {
    const resource = createResource({ name: 'スタイリスト A', kind: 'staff' });
    await repo.save(resource);

    const updated = createResource({
      id: resource.id,
      name: 'スタイリスト B',
      kind: 'staff',
    });
    await repo.save(updated);

    const list = await repo.list();
    expect(list).toHaveLength(1);
    const found = await repo.findById(resource.id);
    expect(found?.name).toBe('スタイリスト B');
  });

  it('複数の Resource を save し、list が全件返す', async () => {
    const resource1 = createResource({ name: 'スタイリスト A', kind: 'staff' });
    const resource2 = createResource({ name: '会議室 A', kind: 'room' });
    const resource3 = createResource({ name: '機材 A', kind: 'equipment' });
    await repo.save(resource1);
    await repo.save(resource2);
    await repo.save(resource3);
    const list = await repo.list();
    expect(list).toHaveLength(3);
  });
});
