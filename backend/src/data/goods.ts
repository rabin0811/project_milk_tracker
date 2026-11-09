import { query, type Queryable } from '../db/pool.js';

export type GoodsItemRow = {
  id: number;
  name: string;
  defaultUnit: string | null;
  isActive: boolean;
};

const SELECT_GOODS = `
  SELECT id, name, default_unit AS "defaultUnit", is_active AS "isActive"
  FROM goods_items`;

export async function listGoodsItems(): Promise<GoodsItemRow[]> {
  const result = await query<GoodsItemRow>(`${SELECT_GOODS} ORDER BY name, id`);
  return result.rows;
}

export async function listActiveGoodsItemsForStaff(): Promise<GoodsItemRow[]> {
  const result = await query<GoodsItemRow>(
    `${SELECT_GOODS} WHERE is_active ORDER BY name, id`,
  );
  return result.rows;
}

export async function findGoodsItemById(id: number): Promise<GoodsItemRow | null> {
  const result = await query<GoodsItemRow>(`${SELECT_GOODS} WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function insertGoodsItem(
  client: Queryable,
  input: { name: string; defaultUnit: string | null },
): Promise<GoodsItemRow> {
  const result = await client.query<GoodsItemRow>(
    `INSERT INTO goods_items (name, default_unit) VALUES ($1, $2)
     RETURNING id, name, default_unit AS "defaultUnit", is_active AS "isActive"`,
    [input.name, input.defaultUnit],
  );
  const row = result.rows[0];
  if (!row) throw new Error('goods item insert returned no row');
  return row;
}

export async function updateGoodsItem(
  client: Queryable,
  id: number,
  patch: { name?: string | undefined; defaultUnit?: string | null | undefined; isActive?: boolean },
): Promise<GoodsItemRow | null> {
  const result = await client.query<GoodsItemRow>(
    `UPDATE goods_items
     SET name = COALESCE($2, name),
         default_unit = CASE WHEN $3::boolean THEN $4 ELSE default_unit END,
         is_active = COALESCE($5, is_active)
     WHERE id = $1
     RETURNING id, name, default_unit AS "defaultUnit", is_active AS "isActive"`,
    [
      id,
      patch.name ?? null,
      Object.prototype.hasOwnProperty.call(patch, 'defaultUnit'),
      patch.defaultUnit ?? null,
      patch.isActive ?? null,
    ],
  );
  return result.rows[0] ?? null;
}
