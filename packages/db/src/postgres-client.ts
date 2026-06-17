import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { type DrizzleClient } from './client.js';

export function createPostgresClient(connectionString: string): DrizzleClient {
  const client = postgres(connectionString);
  return drizzle(client);
}
