'use client';

import { useTransition } from 'react';

import type { BookingStatus } from '@koma/scheduling';

import { allowedTransitions, transitionLabel } from '@/lib/booking-transitions';

import { transitionBookingAction } from './actions';

type Props = {
  bookingId: string;
  status: BookingStatus;
};

export default function BookingStatusActions({ bookingId, status }: Props) {
  const [isPending, startTransition] = useTransition();
  const transitions = allowedTransitions(status);

  if (transitions.length === 0) return null;

  return (
    <div>
      {transitions.map((toStatus) => (
        <button
          key={toStatus}
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await transitionBookingAction(bookingId, toStatus);
            });
          }}
        >
          {transitionLabel(toStatus)}
        </button>
      ))}
    </div>
  );
}
