import { type Id } from '@koma/shared';
import { type Service } from './service.js';
import { type ServiceRepository } from './port/service-repository.js';

export function createInMemoryServiceRepository(): ServiceRepository {
  const store = new Map<string, Service>();

  return {
    save(service: Service): Promise<void> {
      store.set(service.id, service);
      return Promise.resolve();
    },

    findById(id: Id<'Service'>): Promise<Service | null> {
      return Promise.resolve(store.get(id) ?? null);
    },

    list(): Promise<Service[]> {
      return Promise.resolve([...store.values()]);
    },
  };
}
