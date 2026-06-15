import { type Id, createId } from '@koma/shared';

export type Resource = {
  readonly id: Id<'Resource'>;
  readonly name: string;
  readonly kind: string;
  readonly capacity: number;
};

export function createResource(params: {
  id?: Id<'Resource'>;
  name: string;
  kind: string;
  capacity?: number;
}): Resource {
  const capacity = params.capacity ?? 1;

  if (!Number.isInteger(capacity) || capacity < 1) {
    throw new Error(
      `capacity must be a positive integer, got: ${capacity}`,
    );
  }

  return Object.freeze({
    id: params.id ?? createId<'Resource'>(),
    name: params.name,
    kind: params.kind,
    capacity,
  });
}

export function updateResource(
  resource: Resource,
  patch: Partial<Pick<Resource, 'name' | 'kind' | 'capacity'>>,
): Resource {
  return createResource({
    id: resource.id,
    name: patch.name ?? resource.name,
    kind: patch.kind ?? resource.kind,
    capacity: patch.capacity ?? resource.capacity,
  });
}
