import type { FastifyInstance } from 'fastify';

import { getStaffBootstrap } from '../../services/staffBootstrap.js';

export async function staffBootstrapRoutes(app: FastifyInstance): Promise<void> {
  app.get('/bootstrap', async () => getStaffBootstrap());
}
