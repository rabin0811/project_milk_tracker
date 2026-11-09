import 'fastify';

import type { AuthContext } from '../middleware/auth.js';

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext | null;
  }
}
