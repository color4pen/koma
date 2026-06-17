import { type PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { type PgDatabase } from 'drizzle-orm/pg-core';

export function createDrizzleClient(pglite: PGlite) {
  return drizzle(pglite);
}

export type DrizzleClient = PgDatabase<any>;
