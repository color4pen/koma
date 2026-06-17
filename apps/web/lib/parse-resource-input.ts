import * as z from 'zod/v4/mini';

import type { Resource } from '@koma/resource';
import { createResource } from '@koma/resource';

export type ParseSuccess = { ok: true; resource: Resource };
export type ParseFailure = { ok: false; errors: Record<string, string[]> };
export type ParseResourceInputResult = ParseSuccess | ParseFailure;

const resourceSchema = z.object({
  name: z.string().check(z.trim(), z.minLength(1, '名前は必須です')),
  kind: z.string().check(z.trim(), z.minLength(1, '種別は必須です')),
  capacity: z.optional(z.string()),
});

export function parseResourceInput(raw: unknown): ParseResourceInputResult {
  const result = resourceSchema.safeParse(raw);

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

  const { name, kind, capacity: capStr } = result.data;

  let capacity: number | undefined;
  if (capStr !== undefined && capStr !== '') {
    const n = Number(capStr);
    if (isNaN(n) || !Number.isInteger(n) || n < 1) {
      return {
        ok: false,
        errors: { capacity: ['同時受付数は 1 以上の整数を入力してください'] },
      };
    }
    capacity = n;
  }

  try {
    const resource = createResource({ name, kind, capacity });
    return { ok: true, resource };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, errors: { _form: [message] } };
  }
}
