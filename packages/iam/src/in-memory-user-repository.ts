import { type Id } from '@koma/shared';
import { type User } from './user.js';
import { type UserRepository } from './port/user-repository.js';

export function createInMemoryUserRepository(): UserRepository {
  const store = new Map<string, User>();

  return {
    save(user: User): Promise<void> {
      store.set(user.id, user);
      return Promise.resolve();
    },

    findById(id: Id<'User'>): Promise<User | null> {
      return Promise.resolve(store.get(id) ?? null);
    },

    findByEmail(email: string): Promise<User | null> {
      for (const user of store.values()) {
        if (user.email === email) {
          return Promise.resolve(user);
        }
      }
      return Promise.resolve(null);
    },

    list(): Promise<User[]> {
      return Promise.resolve([...store.values()]);
    },
  };
}
