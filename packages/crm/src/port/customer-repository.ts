import { type Id } from '@koma/shared';
import { type Customer } from '../customer.js';

export type CustomerRepository = {
  save(customer: Customer): Promise<void>;
  findById(id: Id<'Customer'>): Promise<Customer | null>;
  list(): Promise<Customer[]>;
};
