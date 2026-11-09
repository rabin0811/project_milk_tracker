import { query, type Queryable } from '../db/pool.js';

export type StaffRow = {
  id: number;
  name: string;
  keyLookup: string;
  isActive: boolean;
  sessionVersion: number;
  lastSyncAt: Date | null;
  createdAt: Date;
};

const SELECT_STAFF = `
  SELECT id, name, key_lookup AS "keyLookup", is_active AS "isActive",
         session_version AS "sessionVersion",
         last_sync_at AS "lastSyncAt", created_at AS "createdAt"
  FROM staff`;

export type StaffDto = {
  id: number;
  name: string;
  isActive: boolean;
  lastSyncAt: Date | null;
  createdAt: Date;
};

export function toStaffDto(row: StaffRow): StaffDto {
  // Explicit allow-list: the key lookup never leaves the data layer.
  return {
    id: row.id,
    name: row.name,
    isActive: row.isActive,
    lastSyncAt: row.lastSyncAt,
    createdAt: row.createdAt,
  };
}

export async function listStaff(): Promise<StaffRow[]> {
  const result = await query<StaffRow>(`${SELECT_STAFF} ORDER BY name, id`);
  return result.rows;
}

export async function findStaffById(id: number): Promise<StaffRow | null> {
  const result = await query<StaffRow>(`${SELECT_STAFF} WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function findStaffByKeyLookup(keyLookup: string): Promise<StaffRow | null> {
  const result = await query<StaffRow>(`${SELECT_STAFF} WHERE key_lookup = $1`, [keyLookup]);
  return result.rows[0] ?? null;
}

export async function keyLookupExists(keyLookup: string): Promise<boolean> {
  const result = await query('SELECT 1 FROM staff WHERE key_lookup = $1', [keyLookup]);
  return (result.rowCount ?? 0) > 0;
}

export async function insertStaff(
  client: Queryable,
  input: { name: string; keyLookup: string; adminId: number },
): Promise<StaffRow> {
  const result = await client.query<StaffRow>(
    `INSERT INTO staff (name, key_lookup, created_by_admin_id)
     VALUES ($1, $2, $3)
     RETURNING id, name, key_lookup AS "keyLookup", is_active AS "isActive",
               session_version AS "sessionVersion", last_sync_at AS "lastSyncAt", created_at AS "createdAt"`,
    [input.name, input.keyLookup, input.adminId],
  );
  const row = result.rows[0];
  if (!row) throw new Error('staff insert returned no row');
  return row;
}

export async function updateStaff(
  client: Queryable,
  id: number,
  patch: { name?: string | undefined; isActive?: boolean | undefined },
): Promise<StaffRow | null> {
  const result = await client.query<StaffRow>(
    `UPDATE staff
     SET name = COALESCE($2, name), is_active = COALESCE($3, is_active)
     WHERE id = $1
     RETURNING id, name, key_lookup AS "keyLookup", is_active AS "isActive",
               session_version AS "sessionVersion", last_sync_at AS "lastSyncAt", created_at AS "createdAt"`,
    [id, patch.name ?? null, patch.isActive ?? null],
  );
  return result.rows[0] ?? null;
}

export async function setStaffKey(
  client: Queryable,
  id: number,
  keyLookup: string,
): Promise<StaffRow | null> {
  const result = await client.query<StaffRow>(
    `UPDATE staff
     SET key_lookup = $2, session_version = session_version + 1
     WHERE id = $1
     RETURNING id, name, key_lookup AS "keyLookup", is_active AS "isActive",
               session_version AS "sessionVersion", last_sync_at AS "lastSyncAt", created_at AS "createdAt"`,
    [id, keyLookup],
  );
  return result.rows[0] ?? null;
}
