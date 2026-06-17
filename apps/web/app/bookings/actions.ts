'use server';

import { revalidatePath } from 'next/cache';

import type { Id } from '@koma/shared';

import {
  getBookingRepository,
  getResourceRepository,
  getServiceRepository,
} from '@/lib/composition-root';
import { createBookingUseCase } from '@/lib/create-booking-use-case';
import { parseBookingInput } from '@/lib/parse-booking-input';

export type ActionState =
  | { ok: true }
  | { ok: false; errors: Record<string, string[]> };

export async function createBookingAction(
  _prevState: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const raw = {
    customerId: formData.get('customerId'),
    serviceId: formData.get('serviceId'),
    resourceId: formData.get('resourceId'),
    startAt: formData.get('startAt'),
  };

  const parseResult = parseBookingInput(raw);

  if (!parseResult.ok) {
    return { ok: false, errors: parseResult.errors };
  }

  const deps = {
    serviceRepo: getServiceRepository(),
    resourceRepo: getResourceRepository(),
    bookingRepo: getBookingRepository(),
  };

  const useCaseResult = await createBookingUseCase(deps, {
    customerId: parseResult.input.customerId as Id<'Customer'>,
    serviceId: parseResult.input.serviceId as Id<'Service'>,
    resourceId: parseResult.input.resourceId as Id<'Resource'>,
    startMillis: parseResult.input.startMillis,
  });

  if (!useCaseResult.ok) {
    const messages: Record<'service-not-found' | 'resource-not-found' | 'no-capacity', string> = {
      'service-not-found': '指定されたサービスが見つかりません',
      'resource-not-found': '指定されたリソースが見つかりません',
      'no-capacity': 'この時間帯は予約が埋まっています',
    };
    return {
      ok: false,
      errors: { _form: [messages[useCaseResult.reason]] },
    };
  }

  revalidatePath('/bookings');
  return { ok: true };
}
