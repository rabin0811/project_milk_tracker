import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { adminOf } from '../../middleware/auth.js';
import { parseBody, parseParams } from '../../lib/validate.js';
import { createPlace, editPlace, getPlaces } from '../../services/masterData.js';

const idSchema = z.object({ id: z.coerce.number().int().positive() });
const nameSchema = z.string().trim().min(1).max(80);

const createSchema = z.object({ name: nameSchema });
const updateSchema = z
  .object({ name: nameSchema.optional(), isActive: z.boolean().optional() })
  .refine((value) => value.name !== undefined || value.isActive !== undefined, {
    message: 'Provide a name or an active flag.',
  });

export async function placeRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async () => ({ places: await getPlaces() }));

  app.post('/', async (request, reply) => {
    const body = parseBody(createSchema, request.body);
    const place = await createPlace(adminOf(request).id, body);
    return reply.code(201).send({ place });
  });

  app.patch('/:id', async (request) => {
    const { id } = parseParams(idSchema, request);
    const body = parseBody(updateSchema, request.body);
    const place = await editPlace(adminOf(request).id, id, body);
    return { place };
  });
}
