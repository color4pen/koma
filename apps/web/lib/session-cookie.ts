import { cookies } from 'next/headers';

import { resolveAuthConfig } from './auth-config.js';
import { signSession, verifySession } from './session.js';
import type { SessionPayload } from './session.js';

export const SESSION_COOKIE_NAME = 'koma_session';
/** セッション TTL（7 日・ミリ秒） */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * セッション Cookie を set する。
 * `exp` は内部で計算するため、呼び出し元は `userId` と `role` だけを渡す。
 */
export async function setSessionCookie(
  payload: Omit<SessionPayload, 'exp'>,
): Promise<void> {
  const { sessionSecret } = resolveAuthConfig(
    process.env as Record<string, string | undefined>,
  );
  const exp = Date.now() + SESSION_TTL_MS;
  const token = await signSession({ ...payload, exp }, sessionSecret);
  (await cookies()).set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
}

/**
 * Cookie からセッションを読み取り、有効なら SessionPayload を返す。
 * Cookie 不在・署名不正・期限切れの場合は null を返す。
 *
 * `await cookies()` を先に呼ぶことでルートを dynamic に強制し、
 * Cookie が存在しない場合は resolveAuthConfig を呼ばずに早期 return する。
 */
export async function readSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!cookie) return null;

  const { sessionSecret } = resolveAuthConfig(
    process.env as Record<string, string | undefined>,
  );
  return verifySession(cookie.value, sessionSecret);
}

/**
 * セッション Cookie を削除する。
 */
export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE_NAME);
}
