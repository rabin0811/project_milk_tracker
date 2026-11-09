import { findAdminById, findAdminByUsername, updateAdminPassword } from '../data/admins.js';
import { findStaffByKeyLookup, type StaffRow } from '../data/staff.js';
import { pool, withTransaction } from '../db/pool.js';
import { writeAudit } from '../lib/audit.js';
import { AppError, badRequest, lockedOut, unauthorized } from '../lib/errors.js';
import { getLockoutStatus, recordAuthAttempt } from '../lib/lockout.js';
import { PASSWORD_MAX_LENGTH, hashPassword, verifyPassword } from '../lib/password.js';
import { isStaffKeyFormat, staffKeyLookup } from '../lib/staffKey.js';

export type LoginContext = {
  ip: string | null;
};

function adminScope(username: string, ip: string | null) {
  return { identifier: `admin:${username.trim().toLowerCase()}`, ip };
}

function retryMessage(): string {
  return 'Too many failed attempts. Try again later.';
}

export async function loginAdmin(
  input: { username: string; password: string },
  context: LoginContext,
) {
  const scope = adminScope(input.username, context.ip);
  const lock = await getLockoutStatus(pool, scope);
  if (lock.locked) {
    throw lockedOut(retryMessage(), lock.retryAfterSeconds);
  }

  const admin = await findAdminByUsername(input.username.trim());
  const ok = admin ? await verifyPassword(admin.passwordHash, input.password) : false;
  await recordAuthAttempt(pool, scope, ok);

  if (!admin || !ok) {
    throw unauthorized('Wrong username or password.', 'invalid_credentials');
  }

  await writeAudit(pool, {
    actorType: 'admin',
    actorId: admin.id,
    action: 'admin_login',
    entityType: 'admin',
    entityId: admin.id,
  });

  return admin;
}

export async function changeAdminPassword(
  adminId: number,
  input: { currentPassword: string; newPassword: string },
): Promise<void> {
  const admin = await findAdminById(adminId);
  if (!admin) throw unauthorized();

  if (input.newPassword.length < 8 || input.newPassword.length > PASSWORD_MAX_LENGTH) {
    throw badRequest(`The new password must be 8 to ${PASSWORD_MAX_LENGTH} characters.`);
  }
  if (input.newPassword === input.currentPassword) {
    throw badRequest('The new password must be different from the current password.');
  }

  const currentOk = await verifyPassword(admin.passwordHash, input.currentPassword);
  if (!currentOk) {
    throw new AppError(400, 'invalid_current_password', 'The current password is incorrect.');
  }

  const passwordHash = await hashPassword(input.newPassword);
  await withTransaction(async (client) => {
    await updateAdminPassword(client, adminId, passwordHash);
    await writeAudit(client, {
      actorType: 'admin',
      actorId: adminId,
      action: 'admin_password_changed',
      entityType: 'admin',
      entityId: adminId,
      newValue: { mustChangePassword: false },
    });
  });
}

export async function loginStaff(
  input: { key: string; deviceId: string },
  context: LoginContext,
): Promise<StaffRow> {
  const scope = { deviceId: input.deviceId, ip: context.ip };
  const lock = await getLockoutStatus(pool, scope);
  if (lock.locked) {
    throw lockedOut(retryMessage(), lock.retryAfterSeconds);
  }

  const keyIsValid = isStaffKeyFormat(input.key);
  const staff = keyIsValid ? await findStaffByKeyLookup(staffKeyLookup(input.key)) : null;
  const ok = Boolean(staff?.isActive);
  await recordAuthAttempt(pool, scope, ok);

  if (!staff) {
    throw unauthorized('Wrong key.', 'invalid_credentials');
  }
  if (!staff.isActive) {
    throw unauthorized('This staff account is disabled.', 'account_disabled');
  }

  return staff;
}

export async function auditAdminLogout(adminId: number): Promise<void> {
  await writeAudit(pool, {
    actorType: 'admin',
    actorId: adminId,
    action: 'admin_logout',
    entityType: 'admin',
    entityId: adminId,
  });
}
