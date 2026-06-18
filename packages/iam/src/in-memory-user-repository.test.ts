import { describe, it, expect, beforeEach } from 'vitest';
import { createUser } from './user.js';
import { createInMemoryUserRepository } from './in-memory-user-repository.js';
import { type UserRepository } from './port/user-repository.js';

describe('InMemoryUserRepository', () => {
  let repo: UserRepository;

  beforeEach(() => {
    repo = createInMemoryUserRepository();
  });

  it('save then findById returns the saved user', async () => {
    const user = createUser({
      email: 'a@example.com',
      passwordHash: 'hash',
      role: 'owner',
    });
    await repo.save(user);
    const found = await repo.findById(user.id);
    expect(found).toEqual(user);
  });

  it('findById returns null for unknown id', async () => {
    const user = createUser({
      email: 'a@example.com',
      passwordHash: 'hash',
      role: 'staff',
    });
    const found = await repo.findById(user.id);
    expect(found).toBeNull();
  });

  it('save then findByEmail returns the saved user', async () => {
    const user = createUser({
      email: 'b@example.com',
      passwordHash: 'hash',
      role: 'staff',
    });
    await repo.save(user);
    const found = await repo.findByEmail('b@example.com');
    expect(found).toEqual(user);
  });

  it('findByEmail returns null for unregistered email', async () => {
    const found = await repo.findByEmail('nobody@example.com');
    expect(found).toBeNull();
  });

  it('save then list returns all users', async () => {
    const user1 = createUser({
      email: 'c@example.com',
      passwordHash: 'hash',
      role: 'owner',
    });
    const user2 = createUser({
      email: 'd@example.com',
      passwordHash: 'hash',
      role: 'staff',
    });
    await repo.save(user1);
    await repo.save(user2);
    const all = await repo.list();
    expect(all).toHaveLength(2);
    expect(all).toContainEqual(user1);
    expect(all).toContainEqual(user2);
  });

  it('list returns empty array when no users saved', async () => {
    const all = await repo.list();
    expect(all).toEqual([]);
  });

  it('saving twice with same id upserts', async () => {
    const user = createUser({
      email: 'e@example.com',
      passwordHash: 'hash',
      role: 'staff',
    });
    await repo.save(user);
    const updated = { ...user, email: 'updated@example.com' };
    await repo.save(updated);
    const all = await repo.list();
    expect(all).toHaveLength(1);
    const found = await repo.findById(user.id);
    expect(found?.email).toBe('updated@example.com');
  });

  it('saves multiple users and list returns all', async () => {
    const users = [
      createUser({ email: 'f@example.com', passwordHash: 'h', role: 'owner' }),
      createUser({ email: 'g@example.com', passwordHash: 'h', role: 'staff' }),
      createUser({ email: 'h@example.com', passwordHash: 'h', role: 'staff' }),
    ];
    for (const u of users) {
      await repo.save(u);
    }
    const all = await repo.list();
    expect(all).toHaveLength(3);
  });
});
