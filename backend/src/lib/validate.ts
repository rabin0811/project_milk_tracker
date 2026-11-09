import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { badRequest } from './errors.js';

export function parseBody<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.length ? issue.path.join('.') : null;
    throw badRequest(path ? `${path}: ${issue?.message}` : 'The request is invalid.');
  }
  return result.data;
}

export function parseQuery<T extends z.ZodType>(schema: T, request: FastifyRequest): z.infer<T> {
  return parseBody(schema, request.query);
}

export function parseParams<T extends z.ZodType>(schema: T, request: FastifyRequest): z.infer<T> {
  return parseBody(schema, request.params);
}
