import { describe, it, expect, vi } from 'vitest';
import { createInMemoryEventBus } from './in-memory-event-bus.js';
import type { EventBus } from './event.js';

// ---------------------------------------------------------------------------
// Shared event map for typed tests
// ---------------------------------------------------------------------------

type PingEvent = {
  readonly name: 'ping';
  readonly occurredAt: number;
  readonly seq: number;
};

type PongEvent = {
  readonly name: 'pong';
  readonly occurredAt: number;
};

type TestEventMap = {
  ping: PingEvent;
  pong: PongEvent;
};

function makePing(seq: number): PingEvent {
  return { name: 'ping', occurredAt: 1_000_000, seq };
}

function makePong(): PongEvent {
  return { name: 'pong', occurredAt: 1_000_001 };
}

// ---------------------------------------------------------------------------
// Behavioral tests
// ---------------------------------------------------------------------------

describe('createInMemoryEventBus', () => {
  it('delivers a published event to a subscriber of the same name', () => {
    const bus = createInMemoryEventBus<TestEventMap>();
    const handler = vi.fn();

    bus.subscribe('ping', handler);
    const event = makePing(1);
    bus.publish(event);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('does not deliver a published event to a subscriber of a different name', () => {
    const bus = createInMemoryEventBus<TestEventMap>();
    const pingHandler = vi.fn();
    const pongHandler = vi.fn();

    bus.subscribe('ping', pingHandler);
    bus.subscribe('pong', pongHandler);
    bus.publish(makePing(1));

    expect(pingHandler).toHaveBeenCalledOnce();
    expect(pongHandler).not.toHaveBeenCalled();
  });

  it('completes without error when publishing to a name with no subscribers', () => {
    const bus = createInMemoryEventBus<TestEventMap>();

    expect(() => bus.publish(makePing(1))).not.toThrow();
  });

  it('does not deliver events to an unsubscribed handler', () => {
    const bus = createInMemoryEventBus<TestEventMap>();
    const handler = vi.fn();

    const unsubscribe = bus.subscribe('ping', handler);
    unsubscribe();
    bus.publish(makePing(1));

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not affect other subscribers when one handler unsubscribes', () => {
    const bus = createInMemoryEventBus<TestEventMap>();
    const handlerA = vi.fn();
    const handlerB = vi.fn();

    const unsubscribeA = bus.subscribe('ping', handlerA);
    bus.subscribe('ping', handlerB);
    unsubscribeA();
    bus.publish(makePing(2));

    expect(handlerA).not.toHaveBeenCalled();
    expect(handlerB).toHaveBeenCalledOnce();
  });

  it('delivers events synchronously (side-effect observable immediately after publish)', () => {
    const bus = createInMemoryEventBus<TestEventMap>();
    let received = false;

    bus.subscribe('ping', () => {
      received = true;
    });

    bus.publish(makePing(1));

    expect(received).toBe(true);
  });

  it('calls all handlers registered for the same name', () => {
    const bus = createInMemoryEventBus<TestEventMap>();
    const handlerA = vi.fn();
    const handlerB = vi.fn();
    const handlerC = vi.fn();

    bus.subscribe('ping', handlerA);
    bus.subscribe('ping', handlerB);
    bus.subscribe('ping', handlerC);

    const event = makePing(3);
    bus.publish(event);

    expect(handlerA).toHaveBeenCalledWith(event);
    expect(handlerB).toHaveBeenCalledWith(event);
    expect(handlerC).toHaveBeenCalledWith(event);
  });

  it('delivers events for multiple different names independently', () => {
    const bus = createInMemoryEventBus<TestEventMap>();
    const pingHandler = vi.fn();
    const pongHandler = vi.fn();

    bus.subscribe('ping', pingHandler);
    bus.subscribe('pong', pongHandler);

    bus.publish(makePing(1));
    bus.publish(makePong());

    expect(pingHandler).toHaveBeenCalledOnce();
    expect(pongHandler).toHaveBeenCalledOnce();
  });

  // -------------------------------------------------------------------------
  // Type-safety tests
  // -------------------------------------------------------------------------

  it('typed EventBus: ping handler receives the correct payload shape', () => {
    const bus: EventBus<TestEventMap> = createInMemoryEventBus<TestEventMap>();

    bus.subscribe('ping', (event) => {
      // `event` must be PingEvent — accessing `seq` must not be a type error
      const _seq: number = event.seq;
      void _seq;
    });
  });

  it('typed EventBus: accessing a non-existent property on pong is a compile error', () => {
    const bus: EventBus<TestEventMap> = createInMemoryEventBus<TestEventMap>();

    bus.subscribe('pong', (event) => {
      // @ts-expect-error — 'seq' does not exist on PongEvent
      const _seq: number = event.seq;
      void _seq;
    });
  });
});
