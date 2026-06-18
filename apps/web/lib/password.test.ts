import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from './password.js';

describe('hashPassword / verifyPassword', () => {
  it('正しいパスワードで verifyPassword が true を返す', async () => {
    const hash = await hashPassword('correct-password');
    const result = await verifyPassword('correct-password', hash);
    expect(result).toBe(true);
  });

  it('誤ったパスワードで verifyPassword が false を返す', async () => {
    const hash = await hashPassword('correct-password');
    const result = await verifyPassword('wrong-password', hash);
    expect(result).toBe(false);
  });

  it('同一パスワードで 2 回 hashPassword した結果が異なる（salt のランダム性）', async () => {
    const hash1 = await hashPassword('same-password');
    const hash2 = await hashPassword('same-password');
    expect(hash1).not.toBe(hash2);
  });

  it('hashPassword の返却値が salt:hash 形式', async () => {
    const hash = await hashPassword('test');
    expect(hash).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
  });

  it('形式不正の stored で verifyPassword が false を返す', async () => {
    const result = await verifyPassword('password', 'invalid-format-no-colon');
    expect(result).toBe(false);
  });

  it('空の stored で verifyPassword が false を返す', async () => {
    const result = await verifyPassword('password', '');
    expect(result).toBe(false);
  });
});
