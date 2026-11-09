import {
  findStaffById,
  insertStaff,
  keyLookupExists,
  listStaff,
  setStaffKey,
  toStaffDto,
  updateStaff,
  type StaffDto,
} from '../data/staff.js';
import { withTransaction } from '../db/pool.js';
import { writeAudit } from '../lib/audit.js';
import { AppError, notFound } from '../lib/errors.js';
import { isUniqueViolation } from '../lib/pgErrors.js';
import { generateStaffKey, staffKeyLookup } from '../lib/staffKey.js';

export type CreatedStaff = { staff: StaffDto; key: string };

async function generateUniqueKey(): Promise<{ key: string; lookup: string }> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const key = generateStaffKey();
    const lookup = staffKeyLookup(key);
    if (!(await keyLookupExists(lookup))) {
      return { key, lookup };
    }
  }
  throw new AppError(500, 'internal_error', 'Could not allocate a staff key. Try again.');
}

export async function getStaffList(): Promise<StaffDto[]> {
  const rows = await listStaff();
  return rows.map(toStaffDto);
}

export async function createStaff(
  adminId: number,
  input: { name: string },
): Promise<CreatedStaff> {
  const { key, lookup } = await generateUniqueKey();
  try {
    const staff = await withTransaction(async (client) => {
      const created = await insertStaff(client, { name: input.name, keyLookup: lookup, adminId });
      await writeAudit(client, {
        actorType: 'admin',
        actorId: adminId,
        action: 'staff_created',
        entityType: 'staff',
        entityId: created.id,
        // Never store the raw key or its lookup value.
        newValue: { name: created.name },
      });
      return created;
    });
    return { staff: toStaffDto(staff), key };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError(500, 'internal_error', 'Could not allocate a staff key. Try again.');
    }
    throw error;
  }
}

export async function editStaff(
  adminId: number,
  id: number,
  input: { name?: string | undefined; isActive?: boolean | undefined },
): Promise<StaffDto> {
  const current = await findStaffById(id);
  if (!current) throw notFound('Staff member not found.');

  const next = {
    name: input.name ?? current.name,
    isActive: input.isActive ?? current.isActive,
  };
  const oldValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};
  if (next.name !== current.name) {
    oldValue.name = current.name;
    newValue.name = next.name;
  }
  if (next.isActive !== current.isActive) {
    oldValue.isActive = current.isActive;
    newValue.isActive = next.isActive;
  }
  if (Object.keys(newValue).length === 0) return toStaffDto(current);

  const updated = await withTransaction(async (client) => {
    const row = await updateStaff(client, id, {
      name: newValue.name as string | undefined,
      isActive: newValue.isActive as boolean | undefined,
    });
    if (!row) throw notFound('Staff member not found.');
    await writeAudit(client, {
      actorType: 'admin',
      actorId: adminId,
      action: 'staff_updated',
      entityType: 'staff',
      entityId: id,
      oldValue,
      newValue,
    });
    return row;
  });

  return toStaffDto(updated);
}

export async function resetStaffKey(
  adminId: number,
  id: number,
): Promise<{ staff: StaffDto; key: string }> {
  const current = await findStaffById(id);
  if (!current) throw notFound('Staff member not found.');

  const { key, lookup } = await generateUniqueKey();
  const updated = await withTransaction(async (client) => {
    const row = await setStaffKey(client, id, lookup);
    if (!row) throw notFound('Staff member not found.');
    await writeAudit(client, {
      actorType: 'admin',
      actorId: adminId,
      action: 'staff_key_reset',
      entityType: 'staff',
      entityId: id,
      // The old -> new key is deliberately not recorded.
    });
    return row;
  });

  return { staff: toStaffDto(updated), key };
}
