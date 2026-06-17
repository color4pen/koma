import { type PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';

export function createDrizzleClient(pglite: PGlite) {
  return drizzle(pglite);
}

export type DrizzleClient = ReturnType<typeof createDrizzleClient>;
