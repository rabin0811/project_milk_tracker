import cookie from '@fastify/cookie';
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';

import { query } from './db/pool.js';
import { env } from './env.js';
import { AppError } from './lib/errors.js';
import { requireAdmin, requireStaff } from './middleware/auth.js';
import { authRoutes } from './routes/auth.js';
import { farmerRoutes } from './routes/admin/farmers.js';
import { goodsItemRoutes } from './routes/admin/goodsItems.js';
import { placeRoutes } from './routes/admin/places.js';
import { staffRoutes } from './routes/admin/staff.js';
import { meRoutes } from './routes/me.js';
import { staffBootstrapRoutes } from './routes/staff/bootstrap.js';

export type BuildAppOptions = {
  logger?: boolean;
};

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const useLogger = options.logger ?? !env.isTest;

  const app = Fastify({
    logger: useLogger
      ? {
          level: env.isProduction ? 'info' : 'debug',
          redact: {
            paths: ['req.headers.cookie', 'req.headers.authorization', 'req.headers["x-device-id"]'],
            censor: '[redacted]',
          },
        }
      : false,
    disableRequestLogging: true,
    bodyLimit: 128 * 1024,
    trustProxy: false,
  });

  app.register(cookie);
  app.decorateRequest('auth', null);

  app.addHook('onRequest', async (request) => {
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const contentType = request.headers['content-type']?.toLowerCase();
      const declaredLength = Number(request.headers['content-length'] ?? 0);
      const hasBody = declaredLength > 0 || request.headers['transfer-encoding'] !== undefined;
      if (hasBody && (!contentType || !contentType.startsWith('application/json'))) {
        throw new AppError(415, 'unsupported_media_type', 'Send the body as JSON.');
      }

      const origin = request.headers.origin;
      const host = request.headers.host;
      if (origin && host) {
        let originHost: string;
        try {
          originHost = new URL(origin).host;
        } catch {
          throw new AppError(403, 'forbidden', 'Invalid request origin.');
        }
        if (originHost !== host) {
          throw new AppError(403, 'forbidden', 'Cross-origin request rejected.');
        }
      }
    }
  });

  app.addHook('onSend', async (request, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'no-referrer');
    if (request.url.startsWith('/api/')) {
      reply.header('Cache-Control', 'no-store');
    }
    if (env.isProduction) {
      reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    return payload;
  });

  app.addHook('onResponse', async (request, reply) => {
    request.log.info(
      {
        requestId: request.id,
        method: request.method,
        route: request.routeOptions.url ?? 'unmatched',
        statusCode: reply.statusCode,
        durationMs: Math.round(reply.elapsedTime),
        role: request.auth?.role ?? 'anonymous',
      },
      'request_completed',
    );
  });

  app.setErrorHandler((error: FastifyError | AppError, request, reply) => {
    if (error instanceof AppError) {
      if (error.retryAfterSeconds) {
        reply.header('Retry-After', String(error.retryAfterSeconds));
      }
      return reply
        .code(error.statusCode)
        .send({ error: { code: error.code, message: error.message } });
    }

    if (error.statusCode === 400) {
      return reply
        .code(400)
        .send({ error: { code: 'invalid_json', message: 'Send a valid JSON body.' } });
    }
    if (error.statusCode === 413) {
      return reply
        .code(413)
        .send({ error: { code: 'payload_too_large', message: 'The request is too large.' } });
    }
    if (error.statusCode === 415) {
      return reply
        .code(415)
        .send({ error: { code: 'unsupported_media_type', message: 'Send the body as JSON.' } });
    }

    request.log.error({ err: error }, 'unhandled_error');
    return reply
      .code(500)
      .send({ error: { code: 'internal_error', message: 'Something went wrong.' } });
  });

  app.setNotFoundHandler((_request, reply) => {
    return reply.code(404).send({ error: { code: 'not_found', message: 'Not found.' } });
  });

  app.get('/api/health', async (_request, reply) => {
    try {
      await query('SELECT 1');
      return reply.send({ status: 'ok' });
    } catch {
      return reply.code(503).send({ error: { code: 'unavailable', message: 'Database unavailable.' } });
    }
  });

  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(meRoutes, { prefix: '/api' });

  app.register(
    async (admin) => {
      admin.addHook('onRequest', requireAdmin);
      admin.register(placeRoutes, { prefix: '/places' });
      admin.register(farmerRoutes, { prefix: '/farmers' });
      admin.register(goodsItemRoutes, { prefix: '/goods-items' });
      admin.register(staffRoutes, { prefix: '/staff' });
    },
    { prefix: '/api/admin' },
  );

  app.register(
    async (staff) => {
      staff.addHook('onRequest', requireStaff);
      staff.register(staffBootstrapRoutes);
    },
    { prefix: '/api/staff' },
  );

  return app;
}
