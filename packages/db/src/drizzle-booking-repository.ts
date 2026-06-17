import { eq, and, inArray } from 'drizzle-orm';
import {
  type BookingRepository,
  type Booking,
  type BookingStatus,
  type CustomFieldValue,
  restoreBooking,
} from '@koma/scheduling';
import { parseId, createTimeRange } from '@koma/shared';
import { bookings } from './schema/booking.js';
import { type DrizzleClient } from './client.js';

function rowToBooking(row: typeof bookings.$inferSelect): Booking {
  const id = parseId<'Booking'>(row.id);
  const customerId = parseId<'Customer'>(row.customer_id);
  const serviceId = parseId<'Service'>(row.service_id);
  const resourceId = parseId<'Resource'>(row.resource_id);
  const slot = createTimeRange(row.start_millis, row.end_millis);
  const status = row.status as BookingStatus;
  const customFields = row.custom_fields as Record<string, CustomFieldValue>;

  return restoreBooking({
    id,
    customerId,
    serviceId,
    resourceId,
    slot,
    status,
    customFields,
  });
}

export function createDrizzleBookingRepository(
  db: DrizzleClient,
): BookingRepository {
  return {
    async save(booking: Booking): Promise<void> {
      await db
        .insert(bookings)
        .values({
          id: booking.id,
          customer_id: booking.customerId,
          service_id: booking.serviceId,
          resource_id: booking.resourceId,
          start_millis: booking.slot.start,
          end_millis: booking.slot.end,
          status: booking.status,
          custom_fields: { ...booking.customFields },
        })
        .onConflictDoUpdate({
          target: bookings.id,
          set: {
            customer_id: booking.customerId,
            service_id: booking.serviceId,
            resource_id: booking.resourceId,
            start_millis: booking.slot.start,
            end_millis: booking.slot.end,
            status: booking.status,
            custom_fields: { ...booking.customFields },
          },
        });
    },

    async findById(id): Promise<Booking | null> {
      const rows = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, id));
      const row = rows[0];
      if (!row) return null;
      return rowToBooking(row);
    },

    async list(): Promise<Booking[]> {
      const rows = await db.select().from(bookings);
      return rows.map(rowToBooking);
    },

    async findActiveByResource(resourceId): Promise<Booking[]> {
      const rows = await db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.resource_id, resourceId),
            inArray(bookings.status, ['pending', 'confirmed']),
          ),
        );
      return rows.map(rowToBooking);
    },
  };
}
