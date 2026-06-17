import * as z from 'zod/v4/mini';

import type { Customer } from '@koma/crm';
import { createContactInfo, createCustomer } from '@koma/crm';

export type ParseSuccess = { ok: true; customer: Customer };
export type ParseFailure = { ok: false; errors: Record<string, string[]> };
export type ParseCustomerInputResult = ParseSuccess | ParseFailure;

const customerSchema = z
  .object({
    name: z.string().check(z.trim(), z.minLength(1, '名前は必須です')),
    phone: z.optional(z.string()),
    email: z.optional(z.string()),
  })
  .check((ctx) => {
    const { phone, email } = ctx.value;
    const hasPhone = typeof phone === 'string' && phone.trim().length > 0;
    const hasEmail = typeof email === 'string' && email.trim().length > 0;
    if (!hasPhone && !hasEmail) {
      ctx.issues.push({
        code: 'custom',
        message: '電話番号またはメールアドレスのいずれかが必要です',
        path: ['contact'],
        input: ctx.value,
      });
    }
  });

export function parseCustomerInput(raw: unknown): ParseCustomerInputResult {
  const result = customerSchema.safeParse(raw);

  if (!result.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key =
        issue.path.length > 0 ? String(issue.path[0]) : '_form';
      if (!errors[key]) errors[key] = [];
      errors[key].push(issue.message);
    }
    return { ok: false, errors };
  }

  const { name, phone, email } = result.data;

  try {
    const contact = createContactInfo({ phone, email });
    const customer = createCustomer({ name, contact });
    return { ok: true, customer };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, errors: { _form: [message] } };
  }
}
