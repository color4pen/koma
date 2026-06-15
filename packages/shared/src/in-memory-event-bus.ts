import type { DomainEvent, EventMap, EventBus } from './event.js';

/**
 * Creates a synchronous in-memory EventBus.
 *
 * - publish: calls all handlers registered for the event's `name` synchronously.
 *   Publishing to a name with no subscribers is a no-op.
 * - subscribe: registers a handler and returns an unsubscribe function.
 *   Calling the unsubscribe function removes only that handler and does not
 *   affect other subscribers for the same name.
 *
 * Intended for use as the default/test implementation.
 * Deliver a different implementation through the EventBus port for production.
 */
export function createInMemoryEventBus<M extends EventMap = EventMap>(): EventBus<M> {
  const handlers = new Map<string, Set<(event: DomainEvent) => void>>();

  return {
    publish<N extends keyof M & string>(event: M[N] & { readonly name: N }): void {
      const set = handlers.get(event.name);
      if (set === undefined) return;
      for (const handler of set) {
        handler(event);
      }
    },

    subscribe<N extends keyof M & string>(
      name: N,
      handler: (event: M[N]) => void,
    ): () => void {
      let set = handlers.get(name);
      if (set === undefined) {
        set = new Set();
        handlers.set(name, set);
      }
      // Cast: internally we store untyped DomainEvent handlers; the public API
      // guarantees the concrete type is M[N] when publish is called with name N.
      const internalHandler = handler as (event: DomainEvent) => void;
      set.add(internalHandler);

      return () => {
        set!.delete(internalHandler);
      };
    },
  };
}
