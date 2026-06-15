import { type Id, createId, type Duration, type Money } from '@koma/shared';

export type Service = {
  readonly id: Id<'Service'>;
  readonly name: string;
  readonly duration: Duration;
  readonly price: Money;
  readonly resourceKinds: readonly string[];
};

export function createService(params: {
  id?: Id<'Service'>;
  name: string;
  duration: Duration;
  price: Money;
  resourceKinds?: readonly string[];
}): Service {
  if (params.duration.milliseconds <= 0) {
    throw new Error(
      `duration must be positive, got: ${params.duration.milliseconds}ms`,
    );
  }

  if (params.price.amount < 0) {
    throw new Error(
      `price must be non-negative, got: ${params.price.amount}`,
    );
  }

  return Object.freeze({
    id: params.id ?? createId<'Service'>(),
    name: params.name,
    duration: params.duration,
    price: params.price,
    resourceKinds: params.resourceKinds ?? [],
  });
}

export function updateService(
  service: Service,
  patch: Partial<Pick<Service, 'name' | 'duration' | 'price' | 'resourceKinds'>>,
): Service {
  return createService({
    id: service.id,
    name: patch.name ?? service.name,
    duration: patch.duration ?? service.duration,
    price: patch.price ?? service.price,
    resourceKinds: patch.resourceKinds ?? service.resourceKinds,
  });
}
