import { type Id, createId } from '@koma/shared';
import { type TimeRange } from '@koma/shared';
import { type BookingStatus, ALLOWED_TRANSITIONS } from './booking-status.js';

export type CustomFieldValue = string | number | boolean;

export type Booking = {
  readonly id: Id<'Booking'>;
  readonly customerId: Id<'Customer'>;
  readonly serviceId: Id<'Service'>;
  readonly resourceId: Id<'Resource'>;
  readonly slot: TimeRange;
  readonly status: BookingStatus;
  readonly customFields: Readonly<Record<string, CustomFieldValue>>;
};

export function createBooking(params: {
  id?: Id<'Booking'>;
  customerId: Id<'Customer'>;
  serviceId: Id<'Service'>;
  resourceId: Id<'Resource'>;
  slot: TimeRange;
  customFields?: Record<string, CustomFieldValue>;
}): Booking {
  return Object.freeze({
    id: params.id ?? createId<'Booking'>(),
    customerId: params.customerId,
    serviceId: params.serviceId,
    resourceId: params.resourceId,
    slot: params.slot,
    status: 'pending' as BookingStatus,
    customFields: Object.freeze({ ...(params.customFields ?? {}) }),
  });
}

export function restoreBooking(params: {
  id: Id<'Booking'>;
  customerId: Id<'Customer'>;
  serviceId: Id<'Service'>;
  resourceId: Id<'Resource'>;
  slot: TimeRange;
  status: BookingStatus;
  customFields: Record<string, CustomFieldValue>;
}): Booking {
  return Object.freeze({
    id: params.id,
    customerId: params.customerId,
    serviceId: params.serviceId,
    resourceId: params.resourceId,
    slot: params.slot,
    status: params.status,
    customFields: Object.freeze({ ...params.customFields }),
  });
}

export function transitionBooking(booking: Booking, to: BookingStatus): Booking {
  const allowed = ALLOWED_TRANSITIONS.get(booking.status);
  if (!allowed || !allowed.has(to)) {
    throw new Error(
      `Invalid transition: ${booking.status} → ${to}`,
    );
  }
  return Object.freeze({
    ...booking,
    status: to,
    customFields: booking.customFields,
  });
}
