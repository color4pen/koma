import * as z from 'zod/v4/mini';

const loginSchema = z.object({
  email: z.string().check(z.minLength(1, 'メールアドレスは必須です')),
  password: z.string().check(z.minLength(1, 'パスワードは必須です')),
});

export type ParseLoginInputResult =
  | { ok: true; email: string; password: string }
  | { ok: false; errors: Record<string, string[]> };

/**
 * ログインフォーム入力を検証する純関数。
 * email・password のいずれかが空の場合は ok: false を返す。
 */
export function parseLoginInput(raw: unknown): ParseLoginInputResult {
  const result = loginSchema.safeParse(raw);

  if (!result.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.length > 0 ? String(issue.path[0]) : '_form';
      if (!errors[key]) errors[key] = [];
      errors[key].push(issue.message);
    }
    return { ok: false, errors };
  }

  return { ok: true, email: result.data.email, password: result.data.password };
}
