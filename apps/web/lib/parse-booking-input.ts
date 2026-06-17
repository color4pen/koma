import * as z from 'zod/v4/mini';

export type ParseBookingInputSuccess = {
  ok: true;
  input: {
    customerId: string;
    serviceId: string;
    resourceId: string;
    startMillis: number;
  };
};

export type ParseBookingInputFailure = {
  ok: false;
  errors: Record<string, string[]>;
};

export type ParseBookingInputResult =
  | ParseBookingInputSuccess
  | ParseBookingInputFailure;

const bookingInputSchema = z.object({
  customerId: z.string().check(z.minLength(1, '顧客を選択してください')),
  serviceId: z.string().check(z.minLength(1, 'サービスを選択してください')),
  resourceId: z.string().check(z.minLength(1, 'リソースを選択してください')),
  startAt: z.string().check(z.minLength(1, '開始日時を入力してください')),
});

export function parseBookingInput(raw: unknown): ParseBookingInputResult {
  const result = bookingInputSchema.safeParse(raw);

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

  const { customerId, serviceId, resourceId, startAt } = result.data;

  const startMillis = new Date(startAt).getTime();
  if (Number.isNaN(startMillis)) {
    return {
      ok: false,
      errors: { startAt: ['有効な日時を入力してください'] },
    };
  }

  return {
    ok: true,
    input: { customerId, serviceId, resourceId, startMillis },
  };
}
