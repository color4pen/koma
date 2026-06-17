import * as z from 'zod/v4/mini';

import type { Service } from '@koma/catalog';
import { createService } from '@koma/catalog';
import { createMoney, ofMinutes } from '@koma/shared';

export type ParseSuccess = { ok: true; service: Service };
export type ParseFailure = { ok: false; errors: Record<string, string[]> };
export type ParseServiceInputResult = ParseSuccess | ParseFailure;

const serviceSchema = z.object({
  name: z.string().check(z.trim(), z.minLength(1, 'メニュー名は必須です')),
  durationMinutes: z.string(),
  priceYen: z.string(),
  resourceKinds: z.optional(z.string()),
});

export function parseServiceInput(raw: unknown): ParseServiceInputResult {
  const result = serviceSchema.safeParse(raw);

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

  const { name, durationMinutes: durStr, priceYen: priceStr, resourceKinds: kindsStr } = result.data;

  const durationMinutes = Number(durStr);
  if (isNaN(durationMinutes) || !Number.isInteger(durationMinutes) || durationMinutes < 1) {
    return {
      ok: false,
      errors: { durationMinutes: ['所要時間は 1 以上の整数を入力してください'] },
    };
  }

  const priceYen = Number(priceStr);
  if (isNaN(priceYen) || !Number.isInteger(priceYen) || priceYen < 0) {
    return {
      ok: false,
      errors: { priceYen: ['料金は 0 以上の整数を入力してください'] },
    };
  }

  const resourceKinds =
    kindsStr && kindsStr.length > 0
      ? kindsStr
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : [];

  try {
    const duration = ofMinutes(durationMinutes);
    const price = createMoney(priceYen, 'JPY');
    const service = createService({ name, duration, price, resourceKinds });
    return { ok: true, service };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, errors: { _form: [message] } };
  }
}
