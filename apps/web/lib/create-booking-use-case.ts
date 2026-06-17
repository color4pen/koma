import type { ServiceRepository } from '@koma/catalog';
import type { ResourceRepository } from '@koma/resource';
import type { Booking, BookingRepository } from '@koma/scheduling';
import { canAccommodate, createBooking } from '@koma/scheduling';
import type { Id } from '@koma/shared';
import { createTimeRange } from '@koma/shared';

export type CreateBookingDeps = {
  serviceRepo: ServiceRepository;
  resourceRepo: ResourceRepository;
  bookingRepo: BookingRepository;
};

export type CreateBookingInput = {
  customerId: Id<'Customer'>;
  serviceId: Id<'Service'>;
  resourceId: Id<'Resource'>;
  startMillis: number;
};

export type CreateBookingResult =
  | { ok: true; booking: Booking }
  | { ok: false; reason: 'service-not-found' | 'resource-not-found' | 'no-capacity' };

export async function createBookingUseCase(
  deps: CreateBookingDeps,
  input: CreateBookingInput,
): Promise<CreateBookingResult> {
  const service = await deps.serviceRepo.findById(input.serviceId);
  if (!service) {
    return { ok: false, reason: 'service-not-found' };
  }

  const resource = await deps.resourceRepo.findById(input.resourceId);
  if (!resource) {
    return { ok: false, reason: 'resource-not-found' };
  }

  const slot = createTimeRange(
    input.startMillis,
    input.startMillis + service.duration.milliseconds,
  );

  const active = await deps.bookingRepo.findActiveByResource(input.resourceId);

  if (!canAccommodate(active, slot, resource.capacity)) {
    return { ok: false, reason: 'no-capacity' };
  }

  const booking = createBooking({
    customerId: input.customerId,
    serviceId: input.serviceId,
    resourceId: input.resourceId,
    slot,
  });

  await deps.bookingRepo.save(booking);

  return { ok: true, booking };
}
