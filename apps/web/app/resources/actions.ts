'use server';

import { revalidatePath } from 'next/cache';

import { getResourceRepository } from '@/lib/composition-root';
import { parseResourceInput } from '@/lib/parse-resource-input';

export type ActionState =
  | { ok: true }
  | { ok: false; errors: Record<string, string[]> };

export async function createResourceAction(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const raw = {
    name: formData.get('name'),
    kind: formData.get('kind'),
    capacity: formData.get('capacity'),
  };

  const result = parseResourceInput(raw);

  if (!result.ok) {
    return { ok: false, errors: result.errors };
  }

  await getResourceRepository().save(result.resource);
  revalidatePath('/resources');
  return { ok: true };
}
