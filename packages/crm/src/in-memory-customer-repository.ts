import { type Id } from '@koma/shared';
import { type Customer } from './customer.js';
import { type CustomerRepository } from './port/customer-repository.js';

export function createInMemoryCustomerRepository(): CustomerRepository {
  const store = new Map<string, Customer>();

  return {
    save(customer: Customer): Promise<void> {
      store.set(customer.id, customer);
      return Promise.resolve();
    },

    findById(id: Id<'Customer'>): Promise<Customer | null> {
      return Promise.resolve(store.get(id) ?? null);
    },

    list(): Promise<Customer[]> {
      return Promise.resolve([...store.values()]);
    },
  };
}
