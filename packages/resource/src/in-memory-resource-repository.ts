import { type Id } from '@koma/shared';
import { type Resource } from './resource.js';
import { type ResourceRepository } from './port/resource-repository.js';

export function createInMemoryResourceRepository(): ResourceRepository {
  const store = new Map<string, Resource>();

  return {
    save(resource: Resource): Promise<void> {
      store.set(resource.id, resource);
      return Promise.resolve();
    },

    findById(id: Id<'Resource'>): Promise<Resource | null> {
      return Promise.resolve(store.get(id) ?? null);
    },

    list(): Promise<Resource[]> {
      return Promise.resolve([...store.values()]);
    },
  };
}
