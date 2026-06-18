import type { User, UserRepository } from '@koma/iam';

import { verifyPassword } from './password.js';

/**
 * メールアドレスとパスワードで認証を行い、成功時は User を返す。
 * 未登録メール・誤パスワードのいずれの場合も null を返す（エラー種別は漏らさない）。
 */
export async function authenticate(
  repo: UserRepository,
  email: string,
  password: string,
): Promise<User | null> {
  const user = await repo.findByEmail(email);
  if (!user) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  return user;
}
