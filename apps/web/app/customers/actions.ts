'use server';

import { revalidatePath } from 'next/cache';

import { getCustomerRepository } from '@/lib/composition-root';
import { parseCustomerInput } from '@/lib/parse-customer-input';

export type ActionState =
  | { ok: true }
  | { ok: false; errors: Record<string, string[]> };

export async function createCustomerAction(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const raw = {
    name: formData.get('name'),
    phone: formData.get('phone'),
    email: formData.get('email'),
  };

  const result = parseCustomerInput(raw);

  if (!result.ok) {
    return { ok: false, errors: result.errors };
  }

  await getCustomerRepository().save(result.customer);
  revalidatePath('/customers');
  return { ok: true };
}
