import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { closePool, pool, type DbClient } from './pool.js';

const migrationsDir = fileURLToPath(new URL('../../migrations', import.meta.url));

type Queryable = Pick<DbClient, 'query'>;

async function ensureMigrationsTable(client: Queryable): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

export async function runMigrations(client: Queryable): Promise<string[]> {
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  await ensureMigrationsTable(client);

  const applied = await client.query<{ version: string }>('SELECT version FROM schema_migrations');
  const done = new Set(applied.rows.map((row) => row.version));

  const fresh: string[] = [];
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await readFile(path.join(migrationsDir, file), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
      await client.query('COMMIT');
      fresh.push(file);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`, { cause: error });
    }
  }
  return fresh;
}

export async function migrate(): Promise<string[]> {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(hashtext($1))', ['milk_tracker_migrations']);
    try {
      return await runMigrations(client);
    } finally {
      await client.query('SELECT pg_advisory_unlock(hashtext($1))', ['milk_tracker_migrations']);
    }
  } finally {
    client.release();
  }
}

const isCli = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;

if (isCli) {
  migrate()
    .then(async (files) => {
      console.log(files.length ? `Applied migrations: ${files.join(', ')}` : 'No pending migrations.');
      await closePool();
    })
    .catch(async (error) => {
      console.error(error instanceof Error ? error.message : error);
      await closePool();
      process.exit(1);
    });
}
