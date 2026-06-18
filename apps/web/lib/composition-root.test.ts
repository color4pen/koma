import { describe, expect, it } from 'vitest';

import { OWNER_USER_ID, getUserRepository } from './composition-root.js';

// dev fallback の adminEmail（NODE_ENV=test のため fallback が使われる）
const ADMIN_EMAIL = 'admin@example.com';

describe('getUserRepository', () => {
  it('UserRepository を返す', async () => {
    const repo = await getUserRepository();
    expect(repo).toBeDefined();
    expect(typeof repo.findByEmail).toBe('function');
    expect(typeof repo.save).toBe('function');
    expect(typeof repo.findById).toBe('function');
    expect(typeof repo.list).toBe('function');
  });

  it('findByEmail(adminEmail) で owner ユーザーを返す', async () => {
    const repo = await getUserRepository();
    const user = await repo.findByEmail(ADMIN_EMAIL);
    expect(user).not.toBeNull();
  });

  it('owner の role が owner', async () => {
    const repo = await getUserRepository();
    const user = await repo.findByEmail(ADMIN_EMAIL);
    expect(user?.role).toBe('owner');
  });

  it('owner の id が固定値 OWNER_USER_ID と一致する', async () => {
    const repo = await getUserRepository();
    const user = await repo.findByEmail(ADMIN_EMAIL);
    expect(user?.id).toBe(OWNER_USER_ID);
  });

  it('2 回呼んでも同一インスタンスが返る（シングルトン）', async () => {
    const repo1 = await getUserRepository();
    const repo2 = await getUserRepository();
    expect(repo1).toBe(repo2);
  });
});
