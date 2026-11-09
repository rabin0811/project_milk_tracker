import { query, type Queryable } from '../db/pool.js';

export type AdminRow = {
  id: number;
  username: string;
  passwordHash: string;
  mustChangePassword: boolean;
  isProtected: boolean;
};

const SELECT_ADMIN = `
  SELECT id, username, password_hash AS "passwordHash",
         must_change_password AS "mustChangePassword", is_protected AS "isProtected"
  FROM admins`;

export async function findAdminByUsername(username: string): Promise<AdminRow | null> {
  const result = await query<AdminRow>(`${SELECT_ADMIN} WHERE username = $1`, [username]);
  return result.rows[0] ?? null;
}

export async function findAdminById(id: number): Promise<AdminRow | null> {
  const result = await query<AdminRow>(`${SELECT_ADMIN} WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function updateAdminPassword(
  client: Queryable,
  id: number,
  passwordHash: string,
): Promise<void> {
  await client.query(
    `UPDATE admins
     SET password_hash = $2, must_change_password = FALSE
     WHERE id = $1`,
    [id, passwordHash],
  );
}
