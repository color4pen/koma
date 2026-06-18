import type { ServiceRepository } from '@koma/catalog';
import { createInMemoryServiceRepository } from '@koma/catalog';
import type { CustomerRepository } from '@koma/crm';
import { createInMemoryCustomerRepository } from '@koma/crm';
import type { UserRepository } from '@koma/iam';
import { createInMemoryUserRepository, createUser } from '@koma/iam';
import type { ResourceRepository } from '@koma/resource';
import { createInMemoryResourceRepository } from '@koma/resource';
import type { BookingRepository } from '@koma/scheduling';
import { createInMemoryBookingRepository } from '@koma/scheduling';
import { parseId } from '@koma/shared';

import { resolveAuthConfig } from './auth-config.js';
import { hashPassword } from './password.js';
import { selectPersistenceMode } from './persistence-mode.js';

/** owner ユーザーの固定 ID。プロセス再起動後もセッションが失効しないよう安定した値を使用する。 */
export const OWNER_USER_ID = parseId<'User'>('00000000-0000-4000-8000-000000000001');

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
  // user repository (in-memory のみ。Drizzle 永続化は後続スライス)
  userRepoInitPromise?: Promise<UserRepository>;
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

/**
 * owner ユーザーを 1 件シードして UserRepository を返す内部初期化関数。
 * シードは冪等（既存の場合はスキップ）。
 */
async function initUserRepository(): Promise<UserRepository> {
  const repo = createInMemoryUserRepository();
  const config = resolveAuthConfig(process.env as Record<string, string | undefined>);

  // 冪等チェック: 既存の場合はシードをスキップ
  const existing = await repo.findByEmail(config.adminEmail);
  if (!existing) {
    const passwordHash = await hashPassword(config.adminPassword);
    const owner = createUser({
      id: OWNER_USER_ID,
      email: config.adminEmail,
      passwordHash,
      role: 'owner',
    });
    await repo.save(owner);
  }

  return repo;
}

/**
 * UserRepository のシングルトンを返す。
 * 初回呼び出し時に owner ユーザーをシードする。
 * 現在は in-memory のみ（Drizzle 永続化は後続スライス）。
 */
export function getUserRepository(): Promise<UserRepository> {
  if (!globalForApp.userRepoInitPromise) {
    globalForApp.userRepoInitPromise = initUserRepository();
  }
  return globalForApp.userRepoInitPromise;
}
