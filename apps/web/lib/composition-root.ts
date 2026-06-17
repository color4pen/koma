import type { CustomerRepository } from '@koma/crm';
import { createInMemoryCustomerRepository } from '@koma/crm';
import type { ResourceRepository } from '@koma/resource';
import { createInMemoryResourceRepository } from '@koma/resource';

const globalForApp = globalThis as typeof globalThis & {
  customerRepository?: CustomerRepository;
  resourceRepository?: ResourceRepository;
};

export function getCustomerRepository(): CustomerRepository {
  if (!globalForApp.customerRepository) {
    globalForApp.customerRepository = createInMemoryCustomerRepository();
  }
  return globalForApp.customerRepository;
}

export function getResourceRepository(): ResourceRepository {
  if (!globalForApp.resourceRepository) {
    globalForApp.resourceRepository = createInMemoryResourceRepository();
  }
  return globalForApp.resourceRepository;
}
