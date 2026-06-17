import type { ServiceRepository } from '@koma/catalog';
import { createInMemoryServiceRepository } from '@koma/catalog';
import type { CustomerRepository } from '@koma/crm';
import { createInMemoryCustomerRepository } from '@koma/crm';
import type { ResourceRepository } from '@koma/resource';
import { createInMemoryResourceRepository } from '@koma/resource';
import type { BookingRepository } from '@koma/scheduling';
import { createInMemoryBookingRepository } from '@koma/scheduling';

import { selectPersistenceMode } from './persistence-mode.js';

type DrizzleRepos = {
  customerRepository: CustomerRepository;
  resourceRepository: ResourceRepository;
  serviceRepository: ServiceRepository;
  bookingRepository: BookingRepository;
};

const globalForApp = globalThis as typeof globalThis & {
  // memory mode repos
  customerRepository?: CustomerRepository;
  resourceRepository?: ResourceRepository;
  serviceRepository?: ServiceRepository;
  bookingRepository?: BookingRepository;
  // drizzle mode
  drizzleInitPromise?: Promise<DrizzleRepos>;
};

async function initDrizzleRepos(): Promise<DrizzleRepos> {
  const {
    createPostgresClient,
    ensureSchema,
    createDrizzleCustomerRepository,
    createDrizzleResourceRepository,
    createDrizzleServiceRepository,
    createDrizzleBookingRepository,
  } = await import('@koma/db');

  const db = createPostgresClient(process.env.DATABASE_URL!);
  await ensureSchema(db);

  return {
    customerRepository: createDrizzleCustomerRepository(db),
    resourceRepository: createDrizzleResourceRepository(db),
    serviceRepository: createDrizzleServiceRepository(db),
    bookingRepository: createDrizzleBookingRepository(db),
  };
}

function getDrizzleRepos(): Promise<DrizzleRepos> {
  if (!globalForApp.drizzleInitPromise) {
    globalForApp.drizzleInitPromise = initDrizzleRepos();
  }
  return globalForApp.drizzleInitPromise;
}

const mode = selectPersistenceMode({ DATABASE_URL: process.env.DATABASE_URL });

export async function getCustomerRepository(): Promise<CustomerRepository> {
  if (mode === 'drizzle') {
    const repos = await getDrizzleRepos();
    return repos.customerRepository;
  }
  if (!globalForApp.customerRepository) {
    globalForApp.customerRepository = createInMemoryCustomerRepository();
  }
  return globalForApp.customerRepository;
}

export async function getResourceRepository(): Promise<ResourceRepository> {
  if (mode === 'drizzle') {
    const repos = await getDrizzleRepos();
    return repos.resourceRepository;
  }
  if (!globalForApp.resourceRepository) {
    globalForApp.resourceRepository = createInMemoryResourceRepository();
  }
  return globalForApp.resourceRepository;
}

export async function getServiceRepository(): Promise<ServiceRepository> {
  if (mode === 'drizzle') {
    const repos = await getDrizzleRepos();
    return repos.serviceRepository;
  }
  if (!globalForApp.serviceRepository) {
    globalForApp.serviceRepository = createInMemoryServiceRepository();
  }
  return globalForApp.serviceRepository;
}

export async function getBookingRepository(): Promise<BookingRepository> {
  if (mode === 'drizzle') {
    const repos = await getDrizzleRepos();
    return repos.bookingRepository;
  }
  if (!globalForApp.bookingRepository) {
    globalForApp.bookingRepository = createInMemoryBookingRepository();
  }
  return globalForApp.bookingRepository;
}
