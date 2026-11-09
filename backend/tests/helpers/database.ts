import { env } from '../../src/env.js';
import { runMigrations } from '../../src/db/migrate.js';
import { pool } from '../../src/db/pool.js';
import { runSeed } from '../../src/db/seed.js';

export function assertTestDatabase(): void {
  const databaseName = new URL(env.databaseUrl).pathname.replace(/^\//, '');
  if (!databaseName.endsWith('_test')) {
    throw new Error(`Refusing to touch database "${databaseName}": the name must end with "_test".`);
  }
}

/**
 * Drops the whole public schema and rebuilds it from the migrations, then seeds.
 * Only ever runs against a database whose name ends with "_test".
 */
export async function resetDatabase(): Promise<void> {
  assertTestDatabase();
  await pool.query('DROP SCHEMA IF EXISTS public CASCADE');
  await pool.query('CREATE SCHEMA public');
  await runMigrations(pool);
  await runSeed(pool);
}
