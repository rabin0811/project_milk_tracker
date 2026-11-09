import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { parseBody, parseParams } from '../../lib/validate.js';
import { adminOf } from '../../middleware/auth.js';
import { createStaff, editStaff, getStaffList, resetStaffKey } from '../../services/staff.js';

const idSchema = z.object({ id: z.coerce.number().int().positive() });
const nameSchema = z.string().trim().min(1).max(80);

const createSchema = z.object({ name: nameSchema });
const updateSchema = z
  .object({ name: nameSchema.optional(), isActive: z.boolean().optional() })
  .refine((value) => value.name !== undefined || value.isActive !== undefined, {
    message: 'Provide a name or an active flag.',
  });

export async function staffRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async () => ({ staff: await getStaffList() }));

  app.post('/', async (request, reply) => {
    const body = parseBody(createSchema, request.body);
    const result = await createStaff(adminOf(request).id, body);
    return reply.code(201).send({ staff: result.staff, key: result.key });
  });

  app.patch('/:id', async (request) => {
    const { id } = parseParams(idSchema, request);
    const body = parseBody(updateSchema, request.body);
    const staff = await editStaff(adminOf(request).id, id, body);
    return { staff };
  });

  app.post('/:id/reset-key', async (request) => {
    const { id } = parseParams(idSchema, request);
    const result = await resetStaffKey(adminOf(request).id, id);
    return { staff: result.staff, key: result.key };
  });
}
