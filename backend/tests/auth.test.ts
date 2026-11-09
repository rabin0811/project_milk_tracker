import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
import { closePool, pool } from '../src/db/pool.js';
import { resetDatabase } from './helpers/database.js';
import {
  INITIAL_ADMIN_PASSWORD,
  TEST_ADMIN_PASSWORD,
  loginAdmin,
  sessionCookie,
} from './helpers/auth.js';

let app: FastifyInstance;

beforeAll(async () => {
  await resetDatabase();
  app = buildApp({ logger: false });
  await app.ready();
});

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await app.close();
  await closePool();
});

describe('admin auth', () => {
  it('logs in with the seeded password and reports the forced change', async () => {
    const response = await loginAdmin(app);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      role: 'admin',
      name: 'admin',
      mustChangePassword: true,
    });
    expect(response.headers['set-cookie']).toBeTruthy();
  });

  it('rejects a wrong password without revealing which field was wrong', async () => {
    const response = await loginAdmin(app, 'wrong-password');
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: { code: 'invalid_credentials', message: 'Wrong username or password.' },
    });
  });

  it('blocks everything except /me and auth while the password change is pending', async () => {
    const login = await loginAdmin(app);
    const cookie = sessionCookie(login);

    const blocked = await app.inject({
      method: 'GET',
      url: '/api/admin/places',
      headers: { cookie },
    });
    expect(blocked.statusCode).toBe(403);
    expect(blocked.json().error.code).toBe('password_change_required');

    const me = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({ role: 'admin', mustChangePassword: true });
  });

  it('changes the password, then old credentials stop working', async () => {
    const login = await loginAdmin(app);
    const cookie = sessionCookie(login);

    const wrongCurrent = await app.inject({
      method: 'POST',
      url: '/api/auth/admin/change-password',
      headers: { cookie },
      payload: { currentPassword: 'nope-nope', newPassword: TEST_ADMIN_PASSWORD },
    });
    expect(wrongCurrent.statusCode).toBe(400);
    expect(wrongCurrent.json().error.code).toBe('invalid_current_password');

    const sameAsOld = await app.inject({
      method: 'POST',
      url: '/api/auth/admin/change-password',
      headers: { cookie },
      payload: {
        currentPassword: INITIAL_ADMIN_PASSWORD,
        newPassword: INITIAL_ADMIN_PASSWORD,
      },
    });
    expect(sameAsOld.statusCode).toBe(400);

    const change = await app.inject({
      method: 'POST',
      url: '/api/auth/admin/change-password',
      headers: { cookie },
      payload: {
        currentPassword: INITIAL_ADMIN_PASSWORD,
        newPassword: TEST_ADMIN_PASSWORD,
      },
    });
    expect(change.statusCode).toBe(200);

    const places = await app.inject({
      method: 'GET',
      url: '/api/admin/places',
      headers: { cookie },
    });
    expect(places.statusCode).toBe(200);

    const me = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } });
    expect(me.json()).toMatchObject({ role: 'admin', mustChangePassword: false });

    const oldLogin = await loginAdmin(app, INITIAL_ADMIN_PASSWORD);
    expect(oldLogin.statusCode).toBe(401);

    const newLogin = await loginAdmin(app, TEST_ADMIN_PASSWORD);
    expect(newLogin.statusCode).toBe(200);
    expect(newLogin.json().mustChangePassword).toBe(false);
  });

  it('writes audit rows for login, password change and logout', async () => {
    const login = await loginAdmin(app);
    const cookie = sessionCookie(login);

    await app.inject({
      method: 'POST',
      url: '/api/auth/admin/change-password',
      headers: { cookie },
      payload: {
        currentPassword: INITIAL_ADMIN_PASSWORD,
        newPassword: TEST_ADMIN_PASSWORD,
      },
    });
    await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie }, payload: {} });

    const rows = await pool.query<{ action: string }>(
      'SELECT action FROM audit_log ORDER BY id',
    );
    const actions = rows.rows.map((row) => row.action);
    expect(actions).toContain('admin_login');
    expect(actions).toContain('admin_password_changed');
    expect(actions).toContain('admin_logout');
  });

  it('locks the admin out after five failures and keeps blocking the right password', async () => {
    await pool.query('DELETE FROM auth_attempts');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await loginAdmin(app, 'wrong-password');
      expect(response.statusCode).toBe(401);
    }

    const locked = await loginAdmin(app, INITIAL_ADMIN_PASSWORD);
    expect(locked.statusCode).toBe(429);
    expect(locked.json().error.code).toBe('locked_out');
    expect(Number(locked.headers['retry-after'])).toBeGreaterThan(0);

    await pool.query('DELETE FROM auth_attempts');
    const recovered = await loginAdmin(app, INITIAL_ADMIN_PASSWORD);
    expect(recovered.statusCode).toBe(200);
  });
});
