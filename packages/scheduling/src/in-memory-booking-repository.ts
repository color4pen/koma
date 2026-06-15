import { type Id } from '@koma/shared';
import { type Booking } from './booking.js';
import { isActive } from './booking-status.js';
import { type BookingRepository } from './port/booking-repository.js';

export function createInMemoryBookingRepository(): BookingRepository {
  const store = new Map<string, Booking>();

  return {
    save(booking: Booking): Promise<void> {
      store.set(booking.id, booking);
      return Promise.resolve();
    },

    findById(id: Id<'Booking'>): Promise<Booking | null> {
      return Promise.resolve(store.get(id) ?? null);
    },

    list(): Promise<Booking[]> {
      return Promise.resolve([...store.values()]);
    },

    findActiveByResource(resourceId: Id<'Resource'>): Promise<Booking[]> {
      const result = [...store.values()].filter(
        (b) => b.resourceId === resourceId && isActive(b.status),
      );
      return Promise.resolve(result);
    },
  };
}
