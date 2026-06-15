import { type Id } from '@koma/shared';
import { type Booking } from '../booking.js';

export type BookingRepository = {
  save(booking: Booking): Promise<void>;
  findById(id: Id<'Booking'>): Promise<Booking | null>;
  list(): Promise<Booking[]>;
  findActiveByResource(resourceId: Id<'Resource'>): Promise<Booking[]>;
};
