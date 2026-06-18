import { beforeEach, describe, expect, it } from 'vitest';

import { createInMemoryUserRepository, createUser } from '@koma/iam';
import type { UserRepository } from '@koma/iam';
import { parseId } from '@koma/shared';

import { authenticate } from './authenticate.js';
import { hashPassword } from './password.js';

const TEST_EMAIL = 'user@example.com';
const TEST_PASSWORD = 'correct-password';
const TEST_USER_ID = parseId<'User'>('00000000-0000-4000-8000-000000000002');

describe('authenticate', () => {
  let repo: UserRepository;

  beforeEach(async () => {
    repo = createInMemoryUserRepository();

    // テスト用ユーザーをシード
    const passwordHash = await hashPassword(TEST_PASSWORD);
    const user = createUser({
      id: TEST_USER_ID,
      email: TEST_EMAIL,
      passwordHash,
      role: 'staff',
    });
    await repo.save(user);
  });

  it('未登録メールで null を返す', async () => {
    const result = await authenticate(repo, 'notfound@example.com', TEST_PASSWORD);
    expect(result).toBeNull();
  });

  it('誤パスワードで null を返す', async () => {
    const result = await authenticate(repo, TEST_EMAIL, 'wrong-password');
    expect(result).toBeNull();
  });

  it('正しい資格情報で当該 User を返す', async () => {
    const result = await authenticate(repo, TEST_EMAIL, TEST_PASSWORD);
    expect(result).not.toBeNull();
    expect(result?.id).toBe(TEST_USER_ID);
    expect(result?.email).toBe(TEST_EMAIL);
    expect(result?.role).toBe('staff');
  });

  it('owner role のユーザーでも正常に認証できる', async () => {
    const ownerHash = await hashPassword('owner-pass');
    const owner = createUser({
      id: parseId<'User'>('00000000-0000-4000-8000-000000000003'),
      email: 'owner@example.com',
      passwordHash: ownerHash,
      role: 'owner',
    });
    await repo.save(owner);

    const result = await authenticate(repo, 'owner@example.com', 'owner-pass');
    expect(result?.role).toBe('owner');
  });
});
