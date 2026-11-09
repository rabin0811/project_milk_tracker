import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { closePool, pool } from '../src/db/pool.js';
import { runSeed } from '../src/db/seed.js';
import { resetDatabase } from './helpers/database.js';

beforeAll(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await closePool();
});

describe('seed and append-only logs', () => {
  it('is idempotent and never overwrites the admin password', async () => {
    const before = await pool.query<{ password_hash: string }>(
      'SELECT password_hash FROM admins WHERE username = $1',
      ['admin'],
    );
    const hashBefore = before.rows[0]?.password_hash;
    expect(hashBefore).toMatch(/^\$argon2id\$/);

    const result = await runSeed(pool);
    expect(result.adminCreated).toBe(false);
    expect(result.placesCreated).toBe(0);
    expect(result.goodsCreated).toBe(0);

    const after = await pool.query<{ password_hash: string }>(
      'SELECT password_hash FROM admins WHERE username = $1',
      ['admin'],
    );
    expect(after.rows[0]?.password_hash).toBe(hashBefore);

    const counts = await pool.query<{ admins: number; places: number; goods: number }>(
      `SELECT
         (SELECT count(*)::int FROM admins) AS admins,
         (SELECT count(*)::int FROM places) AS places,
         (SELECT count(*)::int FROM goods_items) AS goods`,
    );
    expect(counts.rows[0]).toEqual({ admins: 1, places: 3, goods: 2 });
  });

  it('protects the admin account at the database level', async () => {
    await expect(pool.query('DELETE FROM admins WHERE username = $1', ['admin'])).rejects.toThrow(
      /protected_admin_cannot_be_deleted/,
    );
    await expect(
      pool.query('UPDATE admins SET is_protected = FALSE WHERE username = $1', ['admin']),
    ).rejects.toThrow(/admin_protection_cannot_be_removed/);
  });

  it('rejects UPDATE, DELETE and TRUNCATE on audit_log', async () => {
    await pool.query(
      `INSERT INTO audit_log (actor_type, action, entity_type, entity_id)
       VALUES ('system', 'test_event', 'test', '1')`,
    );
    await expect(pool.query("UPDATE audit_log SET action = 'changed'")).rejects.toThrow(
      /append_only_violation/,
    );
    await expect(pool.query('DELETE FROM audit_log')).rejects.toThrow(/append_only_violation/);
    await expect(pool.query('TRUNCATE audit_log')).rejects.toThrow(/append_only_violation/);
  });

  it('rejects UPDATE, DELETE and TRUNCATE on rate_log', async () => {
    await pool.query(
      `INSERT INTO rate_log (kind, new_rate, admin_id)
       SELECT 'factory', 10, id FROM admins LIMIT 1`,
    );
    await expect(pool.query('UPDATE rate_log SET new_rate = 20')).rejects.toThrow(
      /append_only_violation/,
    );
    await expect(pool.query('DELETE FROM rate_log')).rejects.toThrow(/append_only_violation/);
    await expect(pool.query('TRUNCATE rate_log')).rejects.toThrow(/append_only_violation/);
  });
});
