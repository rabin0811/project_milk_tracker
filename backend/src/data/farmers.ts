import { query, type Queryable } from '../db/pool.js';

export type FarmerRow = {
  id: number;
  farmerNumber: number;
  name: string;
  placeId: number;
  placeName: string;
  isActive: boolean;
  createdAt: Date;
};

export async function listFarmers(): Promise<FarmerRow[]> {
  const result = await query<FarmerRow>(
    `SELECT f.id, f.farmer_number AS "farmerNumber", f.name, f.place_id AS "placeId",
            p.name AS "placeName", f.is_active AS "isActive", f.created_at AS "createdAt"
     FROM farmers f
     JOIN places p ON p.id = f.place_id
     ORDER BY f.farmer_number`,
  );
  return result.rows;
}

export async function findFarmerById(id: number): Promise<FarmerRow | null> {
  const result = await query<FarmerRow>(
    `SELECT f.id, f.farmer_number AS "farmerNumber", f.name, f.place_id AS "placeId",
            p.name AS "placeName", f.is_active AS "isActive", f.created_at AS "createdAt"
     FROM farmers f
     JOIN places p ON p.id = f.place_id
     WHERE f.id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function listActiveFarmersForStaff(): Promise<
  Array<{ id: number; farmerNumber: number; name: string; placeName: string }>
> {
  // Explicit allow-list for the staff bootstrap DTO: no rates, no money.
  const result = await query<{
    id: number;
    farmerNumber: number;
    name: string;
    placeName: string;
  }>(
    `SELECT f.id, f.farmer_number AS "farmerNumber", f.name, p.name AS "placeName"
     FROM farmers f
     JOIN places p ON p.id = f.place_id
     WHERE f.is_active AND p.is_active
     ORDER BY f.farmer_number`,
  );
  return result.rows;
}

export async function insertFarmer(
  client: Queryable,
  input: { farmerNumber: number; name: string; placeId: number },
): Promise<FarmerRow> {
  const result = await client.query<FarmerRow>(
    `WITH inserted AS (
       INSERT INTO farmers (farmer_number, name, place_id)
       VALUES ($1, $2, $3)
       RETURNING *
     )
     SELECT f.id, f.farmer_number AS "farmerNumber", f.name, f.place_id AS "placeId",
            p.name AS "placeName", f.is_active AS "isActive", f.created_at AS "createdAt"
     FROM inserted f JOIN places p ON p.id = f.place_id`,
    [input.farmerNumber, input.name, input.placeId],
  );
  const row = result.rows[0];
  if (!row) throw new Error('farmer insert returned no row');
  return row;
}

export async function updateFarmer(
  client: Queryable,
  id: number,
  patch: {
    farmerNumber?: number | undefined;
    name?: string | undefined;
    placeId?: number | undefined;
    isActive?: boolean | undefined;
  },
): Promise<FarmerRow | null> {
  const result = await client.query<FarmerRow>(
    `WITH updated AS (
       UPDATE farmers
       SET farmer_number = COALESCE($2, farmer_number),
           name = COALESCE($3, name),
           place_id = COALESCE($4, place_id),
           is_active = COALESCE($5, is_active)
       WHERE id = $1
       RETURNING *
     )
     SELECT f.id, f.farmer_number AS "farmerNumber", f.name, f.place_id AS "placeId",
            p.name AS "placeName", f.is_active AS "isActive", f.created_at AS "createdAt"
     FROM updated f JOIN places p ON p.id = f.place_id`,
    [id, patch.farmerNumber ?? null, patch.name ?? null, patch.placeId ?? null, patch.isActive ?? null],
  );
  return result.rows[0] ?? null;
}
