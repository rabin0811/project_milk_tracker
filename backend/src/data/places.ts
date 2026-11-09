import { query, type Queryable } from '../db/pool.js';

export type PlaceRow = {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: Date;
};

export type PlaceWithUsage = PlaceRow & { activeFarmers: number };

export async function listPlaces(): Promise<PlaceWithUsage[]> {
  const result = await query<PlaceWithUsage>(
    `SELECT p.id, p.name, p.is_active AS "isActive", p.created_at AS "createdAt",
            (SELECT count(*)::int FROM farmers f WHERE f.place_id = p.id AND f.is_active)
              AS "activeFarmers"
     FROM places p
     ORDER BY p.name, p.id`,
  );
  return result.rows;
}

export async function findPlaceById(id: number): Promise<PlaceRow | null> {
  const result = await query<PlaceRow>(
    `SELECT id, name, is_active AS "isActive", created_at AS "createdAt"
     FROM places WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function countActiveFarmers(placeId: number): Promise<number> {
  const result = await query<{ count: number }>(
    'SELECT count(*)::int AS count FROM farmers WHERE place_id = $1 AND is_active',
    [placeId],
  );
  return result.rows[0]?.count ?? 0;
}

export async function insertPlace(client: Queryable, name: string): Promise<PlaceRow> {
  const result = await client.query<PlaceRow>(
    `INSERT INTO places (name) VALUES ($1)
     RETURNING id, name, is_active AS "isActive", created_at AS "createdAt"`,
    [name],
  );
  const row = result.rows[0];
  if (!row) throw new Error('place insert returned no row');
  return row;
}

export async function updatePlace(
  client: Queryable,
  id: number,
  patch: { name?: string | undefined; isActive?: boolean | undefined },
): Promise<PlaceRow | null> {
  const result = await client.query<PlaceRow>(
    `UPDATE places
     SET name = COALESCE($2, name), is_active = COALESCE($3, is_active)
     WHERE id = $1
     RETURNING id, name, is_active AS "isActive", created_at AS "createdAt"`,
    [id, patch.name ?? null, patch.isActive ?? null],
  );
  return result.rows[0] ?? null;
}
