import type { FastifyInstance } from 'fastify';
import type { LightMyRequestResponse } from 'fastify';

export function sessionCookie(response: LightMyRequestResponse): string {
  const setCookie = response.headers['set-cookie'];
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!raw) throw new Error('response did not set a session cookie');
  const cookie = raw.split(';')[0];
  if (!cookie) throw new Error('empty session cookie');
  return cookie;
}

export const INITIAL_ADMIN_PASSWORD = '12345678';
export const TEST_ADMIN_PASSWORD = 'test-admin-password';

type Inject = Pick<FastifyInstance, 'inject'>;

export async function loginAdmin(
  app: Inject,
  password = INITIAL_ADMIN_PASSWORD,
): Promise<LightMyRequestResponse> {
  return app.inject({
    method: 'POST',
    url: '/api/auth/admin/login',
    payload: { username: 'admin', password },
  });
}

/**
 * Logs in with the seeded password, clears the forced-change flag, and returns
 * a working admin cookie.
 */
export async function readyAdmin(app: Inject): Promise<string> {
  const login = await loginAdmin(app);
  if (login.statusCode !== 200) {
    throw new Error(`admin login failed: ${login.statusCode} ${login.body}`);
  }
  const cookie = sessionCookie(login);

  const change = await app.inject({
    method: 'POST',
    url: '/api/auth/admin/change-password',
    headers: { cookie },
    payload: {
      currentPassword: INITIAL_ADMIN_PASSWORD,
      newPassword: TEST_ADMIN_PASSWORD,
    },
  });
  if (change.statusCode !== 200) {
    throw new Error(`admin password change failed: ${change.statusCode} ${change.body}`);
  }
  return cookie;
}

export async function createStaffMember(
  app: Inject,
  adminCookie: string,
  name: string,
): Promise<{ id: number; key: string }> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/admin/staff',
    headers: { cookie: adminCookie },
    payload: { name },
  });
  if (response.statusCode !== 201) {
    throw new Error(`staff create failed: ${response.statusCode} ${response.body}`);
  }
  const body = response.json() as { staff: { id: number }; key: string };
  return { id: body.staff.id, key: body.key };
}

export async function loginStaff(
  app: Inject,
  key: string,
  deviceId: string,
): Promise<LightMyRequestResponse> {
  return app.inject({
    method: 'POST',
    url: '/api/auth/staff/login',
    payload: { key, deviceId },
  });
}
