import pg from 'pg';

import { env } from '../env.js';

const { Pool, types } = pg;

// Keep DATE as an ISO string. The default parser turns it into a Date at local
// midnight, which silently shifts the day.
types.setTypeParser(1082, (value) => value);
// NUMERIC stays a string (handled with decimal.js), never a JS float.

export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  application_name: 'milk-tracker',
  idleTimeoutMillis: 30_000,
});

export const query = <T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = [],
) => pool.query<T>(text, params);

export type DbClient = pg.PoolClient;
export type Queryable = Pick<DbClient, 'query'>;

export async function withTransaction<T>(work: (client: DbClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}
