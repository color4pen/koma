import { describe, expect, it } from 'vitest';

import { signSession, verifySession } from './session.js';
import type { SessionPayload } from './session.js';

const SECRET = 'test-secret-key';
const NOW = 1_000_000;
const FUTURE_EXP = NOW + 3_600_000; // 1 時間後

const PAYLOAD: SessionPayload = {
  userId: 'user-123',
  role: 'owner',
  exp: FUTURE_EXP,
};

describe('signSession / verifySession', () => {
  it('ラウンドトリップ: signSession → verifySession が元ペイロードを復元する', async () => {
    const token = await signSession(PAYLOAD, SECRET);
    const result = await verifySession(token, SECRET, NOW);
    expect(result).toEqual(PAYLOAD);
  });

  it('改竄トークン（payload 部を書き換え）が null を返す', async () => {
    const token = await signSession(PAYLOAD, SECRET);
    const [, sig] = token.split('.');
    const tamperedPayload = btoa(JSON.stringify({ ...PAYLOAD, role: 'staff' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    const tamperedToken = `${tamperedPayload}.${sig}`;
    const result = await verifySession(tamperedToken, SECRET, NOW);
    expect(result).toBeNull();
  });

  it('期限切れ（now >= exp）が null を返す', async () => {
    const token = await signSession(PAYLOAD, SECRET);
    // now === exp（境界値）
    const resultAtExp = await verifySession(token, SECRET, FUTURE_EXP);
    expect(resultAtExp).toBeNull();

    // now > exp
    const resultAfterExp = await verifySession(token, SECRET, FUTURE_EXP + 1);
    expect(resultAfterExp).toBeNull();
  });

  it('有効期限前は正常に返す', async () => {
    const token = await signSession(PAYLOAD, SECRET);
    const result = await verifySession(token, SECRET, FUTURE_EXP - 1);
    expect(result).toEqual(PAYLOAD);
  });

  it('不正形式（ドットなし）が null を返す', async () => {
    const result = await verifySession('nodottoken', SECRET, NOW);
    expect(result).toBeNull();
  });

  it('空文字が null を返す', async () => {
    const result = await verifySession('', SECRET, NOW);
    expect(result).toBeNull();
  });

  it('異なる secret で検証すると null を返す', async () => {
    const token = await signSession(PAYLOAD, SECRET);
    const result = await verifySession(token, 'wrong-secret', NOW);
    expect(result).toBeNull();
  });

  it('staff role でもラウンドトリップが成立する', async () => {
    const staffPayload: SessionPayload = {
      userId: 'user-456',
      role: 'staff',
      exp: FUTURE_EXP,
    };
    const token = await signSession(staffPayload, SECRET);
    const result = await verifySession(token, SECRET, NOW);
    expect(result).toEqual(staffPayload);
  });
});
