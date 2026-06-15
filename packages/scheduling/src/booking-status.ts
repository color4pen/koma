export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no-show';

export const ALLOWED_TRANSITIONS: Map<
  BookingStatus,
  ReadonlySet<BookingStatus>
> = new Map([
  ['pending', new Set<BookingStatus>(['confirmed', 'cancelled'])],
  ['confirmed', new Set<BookingStatus>(['cancelled', 'completed', 'no-show'])],
  ['cancelled', new Set<BookingStatus>()],
  ['completed', new Set<BookingStatus>()],
  ['no-show', new Set<BookingStatus>()],
]);

export function isActive(status: BookingStatus): boolean {
  return status === 'pending' || status === 'confirmed';
}

export function isTerminal(status: BookingStatus): boolean {
  return status === 'cancelled' || status === 'completed' || status === 'no-show';
}
