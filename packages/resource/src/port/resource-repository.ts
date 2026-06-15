import { type Id } from '@koma/shared';
import { type Resource } from '../resource.js';

export type ResourceRepository = {
  save(resource: Resource): Promise<void>;
  findById(id: Id<'Resource'>): Promise<Resource | null>;
  list(): Promise<Resource[]>;
};
