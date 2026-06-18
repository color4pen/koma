'use server';

import { redirect } from 'next/navigation';

import { authenticate } from '@/lib/authenticate';
import { getUserRepository } from '@/lib/composition-root';
import { parseLoginInput } from '@/lib/parse-login-input';
import { clearSessionCookie, setSessionCookie } from '@/lib/session-cookie';

export type LoginActionState =
  | { ok: true }
  | { ok: false; message?: string; errors?: Record<string, string[]> }
  | null;

/**
 * ログイン Server Action（useActionState 形式）。
 *
 * - parseLoginInput で入力検証 → 失敗時は errors を返す
 * - authenticate で認証 → 失敗時は種別を漏らさない単一メッセージを返す
 * - 成功時は setSessionCookie → next パラメータへ redirect
 */
export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = formData.get('email');
  const password = formData.get('password');
  const next = formData.get('next');

  const result = parseLoginInput({ email, password });

  if (!result.ok) {
    return { ok: false, errors: result.errors };
  }

  const repo = await getUserRepository();
  const user = await authenticate(repo, result.email, result.password);

  if (!user) {
    return {
      ok: false,
      message: 'メールアドレスまたはパスワードが正しくありません',
    };
  }

  // open redirect 防止（CWE-601）: 同一オリジン相対パスのみ許可
  const safeNext =
    typeof next === 'string' && next.startsWith('/') && !next.startsWith('//')
      ? next
      : '/';

  await setSessionCookie({ userId: user.id, role: user.role });
  redirect(safeNext);
}

/**
 * ログアウト Server Action。
 */
export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect('/login');
}
