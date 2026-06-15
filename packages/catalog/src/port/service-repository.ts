import { type Id } from '@koma/shared';
import { type Service } from '../service.js';

export type ServiceRepository = {
  save(service: Service): Promise<void>;
  findById(id: Id<'Service'>): Promise<Service | null>;
  list(): Promise<Service[]>;
};
