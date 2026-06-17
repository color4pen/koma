'use server';

import { revalidatePath } from 'next/cache';

import { getServiceRepository } from '@/lib/composition-root';
import { parseServiceInput } from '@/lib/parse-service-input';

export type ActionState =
  | { ok: true }
  | { ok: false; errors: Record<string, string[]> };

export async function createServiceAction(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const raw = {
    name: formData.get('name'),
    durationMinutes: formData.get('durationMinutes'),
    priceYen: formData.get('priceYen'),
    resourceKinds: formData.get('resourceKinds'),
  };

  const result = parseServiceInput(raw);

  if (!result.ok) {
    return { ok: false, errors: result.errors };
  }

  const repo = await getServiceRepository();
  await repo.save(result.service);
  revalidatePath('/services');
  return { ok: true };
}
