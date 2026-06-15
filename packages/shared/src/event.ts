/**
 * Base type for all domain events.
 * Concrete events extend this by adding their own fields.
 */
export type DomainEvent = {
  readonly name: string;
  readonly occurredAt: number; // epoch milliseconds
};

/**
 * Maps event names (string literal keys) to their full event payload types.
 * Each domain package defines its own EventMap to achieve type-safe subscriptions.
 *
 * Example:
 *   type MyEventMap = {
 *     'booking.confirmed': BookingConfirmedEvent;
 *     'booking.cancelled': BookingCancelledEvent;
 *   };
 */
export type EventMap = Record<string, DomainEvent>;

/**
 * Port interface for publishing and subscribing to domain events.
 *
 * @typeParam M - An EventMap that constrains which events can be published/subscribed.
 *               Defaults to the base EventMap for untyped usage.
 */
export type EventBus<M extends EventMap = EventMap> = {
  /**
   * Publishes an event. The event's `name` field must match a key in `M`,
   * and the full payload type must match `M[N]`.
   */
  publish<N extends keyof M & string>(event: M[N] & { readonly name: N }): void;

  /**
   * Subscribes a handler to events with the given `name`.
   * The handler receives the payload type associated with `name` in `M`.
   *
   * @returns An unsubscribe function that removes this handler when called.
   */
  subscribe<N extends keyof M & string>(
    name: N,
    handler: (event: M[N]) => void,
  ): () => void;
};
