import type { ServiceRepository } from '@koma/catalog';
import { createInMemoryServiceRepository } from '@koma/catalog';
import type { CustomerRepository } from '@koma/crm';
import { createInMemoryCustomerRepository } from '@koma/crm';
import type { ResourceRepository } from '@koma/resource';
import { createInMemoryResourceRepository } from '@koma/resource';

const globalForApp = globalThis as typeof globalThis & {
  customerRepository?: CustomerRepository;
  resourceRepository?: ResourceRepository;
  serviceRepository?: ServiceRepository;
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

export function getServiceRepository(): ServiceRepository {
  if (!globalForApp.serviceRepository) {
    globalForApp.serviceRepository = createInMemoryServiceRepository();
  }
  return globalForApp.serviceRepository;
}
