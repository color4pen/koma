export function selectPersistenceMode(
  env: { DATABASE_URL?: string },
): 'drizzle' | 'memory' {
  return env.DATABASE_URL ? 'drizzle' : 'memory';
}
