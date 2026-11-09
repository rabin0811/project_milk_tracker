import type { FastifyInstance } from 'fastify';

import { unauthorized } from '../lib/errors.js';
import { requireAnySession } from '../middleware/auth.js';

export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.get('/me', { onRequest: requireAnySession }, async (request) => {
    const auth = request.auth;
    if (!auth) throw unauthorized();

    if (auth.role === 'admin') {
      return {
        role: 'admin' as const,
        name: auth.name,
        mustChangePassword: auth.mustChangePassword,
      };
    }
    return { role: 'staff' as const, name: auth.name };
  });
}
