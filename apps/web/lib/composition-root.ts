import type { CustomerRepository } from '@koma/crm';
import { createInMemoryCustomerRepository } from '@koma/crm';

const globalForApp = globalThis as typeof globalThis & {
  customerRepository?: CustomerRepository;
};

export function getCustomerRepository(): CustomerRepository {
  if (!globalForApp.customerRepository) {
    globalForApp.customerRepository = createInMemoryCustomerRepository();
  }
  return globalForApp.customerRepository;
}
