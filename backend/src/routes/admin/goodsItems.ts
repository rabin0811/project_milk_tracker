import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { parseBody, parseParams } from '../../lib/validate.js';
import { adminOf } from '../../middleware/auth.js';
import { createGoodsItem, editGoodsItem, getGoodsItems } from '../../services/masterData.js';

const idSchema = z.object({ id: z.coerce.number().int().positive() });
const nameSchema = z.string().trim().min(1).max(80);
const unitSchema = z.string().trim().max(20).nullable();

const createSchema = z.object({
  name: nameSchema,
  defaultUnit: unitSchema.optional(),
});

const updateSchema = z
  .object({
    name: nameSchema.optional(),
    defaultUnit: unitSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide a change.' });

function normalizeUnit(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return value;
}

export async function goodsItemRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async () => ({ goodsItems: await getGoodsItems() }));

  app.post('/', async (request, reply) => {
    const body = parseBody(createSchema, request.body);
    const item = await createGoodsItem(adminOf(request).id, {
      name: body.name,
      defaultUnit: normalizeUnit(body.defaultUnit) ?? null,
    });
    return reply.code(201).send({ goodsItem: item });
  });

  app.patch('/:id', async (request) => {
    const { id } = parseParams(idSchema, request);
    const body = parseBody(updateSchema, request.body);
    const item = await editGoodsItem(adminOf(request).id, id, {
      name: body.name,
      defaultUnit: normalizeUnit(body.defaultUnit),
      isActive: body.isActive,
    });
    return { goodsItem: item };
  });
}
