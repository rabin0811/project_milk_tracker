import { pathToFileURL } from 'node:url';

import { env } from '../env.js';
import { hashPassword } from '../lib/password.js';
import { closePool, pool, type Queryable } from './pool.js';

const ADMIN_USERNAME = 'admin';
const INITIAL_PLACES = ['Place 1', 'Place 2', 'Place 3'];
const INITIAL_GOODS: Array<{ name: string; unit: string }> = [
  { name: 'Maize (corn)', unit: 'kg' },
  { name: 'Raw feed', unit: 'kg' },
];

export type SeedResult = {
  adminCreated: boolean;
  placesCreated: number;
  goodsCreated: number;
};

/**
 * Idempotent. The admin is inserted only if missing and an existing password is
 * never overwritten (ground rule 7).
 */
export async function runSeed(client: Queryable): Promise<SeedResult> {
  const existingAdmin = await client.query(
    'SELECT id FROM admins WHERE username = $1',
    [ADMIN_USERNAME],
  );

  let adminCreated = false;
  if (existingAdmin.rowCount === 0) {
    const passwordHash = await hashPassword(env.seedAdminPassword);
    const inserted = await client.query(
      `INSERT INTO admins (username, password_hash, must_change_password, is_protected)
       VALUES ($1, $2, TRUE, TRUE)
       ON CONFLICT (username) DO NOTHING
       RETURNING id`,
      [ADMIN_USERNAME, passwordHash],
    );
    adminCreated = (inserted.rowCount ?? 0) > 0;
  }

  let placesCreated = 0;
  for (const name of INITIAL_PLACES) {
    const result = await client.query(
      'INSERT INTO places (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id',
      [name],
    );
    placesCreated += result.rowCount ?? 0;
  }

  let goodsCreated = 0;
  for (const item of INITIAL_GOODS) {
    const result = await client.query(
      `INSERT INTO goods_items (name, default_unit) VALUES ($1, $2)
       ON CONFLICT (name) DO NOTHING RETURNING id`,
      [item.name, item.unit],
    );
    goodsCreated += result.rowCount ?? 0;
  }

  return { adminCreated, placesCreated, goodsCreated };
}

const isCli = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;

if (isCli) {
  runSeed(pool)
    .then(async (result) => {
      if (result.adminCreated) {
        console.log('Seeded admin "admin" (must change password on first login).');
      } else {
        console.log('Admin already exists; password left untouched.');
      }
      console.log(
        `Seed complete: ${result.placesCreated} place(s), ${result.goodsCreated} goods item(s) added.`,
      );
      await closePool();
    })
    .catch(async (error) => {
      console.error(error instanceof Error ? error.message : error);
      await closePool();
      process.exit(1);
    });
}

export { ADMIN_USERNAME };
