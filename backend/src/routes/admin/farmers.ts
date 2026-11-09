import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { parseBody, parseParams } from '../../lib/validate.js';
import { adminOf } from '../../middleware/auth.js';
import { createFarmer, editFarmer, getFarmers } from '../../services/masterData.js';

const idSchema = z.object({ id: z.coerce.number().int().positive() });

const farmerNumber = z.coerce.number().int().positive().max(1_000_000);
const nameSchema = z.string().trim().min(1).max(120);
const placeId = z.coerce.number().int().positive();

const createSchema = z.object({
  farmerNumber,
  name: nameSchema,
  placeId,
});

const updateSchema = z
  .object({
    farmerNumber: farmerNumber.optional(),
    name: nameSchema.optional(),
    placeId: placeId.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide a change.' });

export async function farmerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async () => ({ farmers: await getFarmers() }));

  app.post('/', async (request, reply) => {
    const body = parseBody(createSchema, request.body);
    const farmer = await createFarmer(adminOf(request).id, body);
    return reply.code(201).send({ farmer });
  });

  app.patch('/:id', async (request) => {
    const { id } = parseParams(idSchema, request);
    const body = parseBody(updateSchema, request.body);
    const farmer = await editFarmer(adminOf(request).id, id, body);
    return { farmer };
  });
}
