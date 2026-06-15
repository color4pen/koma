import { describe, it } from 'vitest';
import type { DomainEvent, EventMap, EventBus } from './event.js';

describe('DomainEvent', () => {
  describe('type compatibility', () => {
    it('a concrete event with name, occurredAt, and extra fields is assignable to DomainEvent', () => {
      type BookingConfirmedEvent = {
        readonly name: 'booking.confirmed';
        readonly occurredAt: number;
        readonly bookingId: string;
      };

      const event: BookingConfirmedEvent = {
        name: 'booking.confirmed',
        occurredAt: Date.now(),
        bookingId: 'b-1',
      };

      const _base: DomainEvent = event;
      void _base;
    });

    it('a minimal event with only name and occurredAt is assignable to DomainEvent', () => {
      const event = {
        name: 'something.happened',
        occurredAt: 1_000_000,
      } as const;

      const _base: DomainEvent = event;
      void _base;
    });

    it('an object missing the name field is not assignable to DomainEvent', () => {
      const noName = { occurredAt: 1_000_000 };
      // @ts-expect-error — missing required 'name' field
      const _base: DomainEvent = noName;
      void _base;
    });

    it('an object missing the occurredAt field is not assignable to DomainEvent', () => {
      const noOccurredAt = { name: 'something.happened' };
      // @ts-expect-error — missing required 'occurredAt' field
      const _base: DomainEvent = noOccurredAt;
      void _base;
    });
  });
});

describe('EventMap', () => {
  it('a Record mapping event names to DomainEvent subtypes satisfies EventMap', () => {
    type BookingConfirmedEvent = {
      readonly name: 'booking.confirmed';
      readonly occurredAt: number;
    };
    type BookingCancelledEvent = {
      readonly name: 'booking.cancelled';
      readonly occurredAt: number;
      readonly reason: string;
    };

    type MyEventMap = {
      'booking.confirmed': BookingConfirmedEvent;
      'booking.cancelled': BookingCancelledEvent;
    };

    const _map: EventMap = {} as MyEventMap;
    void _map;
  });
});

describe('EventBus', () => {
  it('accepts a typed EventMap and constrains handler types accordingly', () => {
    type PingEvent = { readonly name: 'ping'; readonly occurredAt: number; readonly seq: number };
    type PongEvent = { readonly name: 'pong'; readonly occurredAt: number };

    type MyMap = {
      ping: PingEvent;
      pong: PongEvent;
    };

    // Compile-time shape test: verify EventBus<MyMap> is a valid type without a real implementation.
    const _bus = {} as EventBus<MyMap>;
    void _bus;
  });
});
