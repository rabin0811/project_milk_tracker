import { findAdminById } from '../data/admins.js';
import { findStaffById, type StaffRow } from '../data/staff.js';
import {
  ADMIN_IDLE_MS,
  SESSION_COOKIE,
  SESSION_REFRESH_MS,
  STAFF_SESSION_MS,
  clearSessionCookie,
  createSessionToken,
  setSessionCookie,
  verifySessionToken,
  type SessionPayload,
} from '../lib/session.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import type { FastifyReply, FastifyRequest } from 'fastify';

export type AdminAuth = {
  role: 'admin';
  id: number;
  name: string;
  mustChangePassword: boolean;
};

export type StaffAuth = {
  role: 'staff';
  id: number;
  name: string;
  deviceId: string;
};

export type AuthContext = AdminAuth | StaffAuth;

export function readSession(request: FastifyRequest): SessionPayload | null {
  const cookie = request.cookies[SESSION_COOKIE];
  if (!cookie) return null;
  const payload = verifySessionToken(cookie);
  if (!payload) return null;
  const maxAge = payload.role === 'admin' ? ADMIN_IDLE_MS : STAFF_SESSION_MS;
  if (Date.now() - payload.iat > maxAge) return null;
  return payload;
}

function refreshSession(reply: FastifyReply, payload: SessionPayload): void {
  if (Date.now() - payload.iat < SESSION_REFRESH_MS) return;
  const token = createSessionToken({
    role: payload.role,
    id: payload.id,
    deviceId: payload.deviceId,
    sv: payload.sv,
  });
  setSessionCookie(reply, token, payload.role);
}

async function loadAdmin(payload: SessionPayload, reply: FastifyReply) {
  const admin = await findAdminById(payload.id);
  if (!admin) {
    clearSessionCookie(reply);
    throw unauthorized();
  }
  return admin;
}

async function loadStaff(payload: SessionPayload, reply: FastifyReply): Promise<StaffRow> {
  const staff = await findStaffById(payload.id);
  if (!staff || !staff.isActive) {
    clearSessionCookie(reply);
    throw unauthorized('This staff account is disabled.', 'account_disabled');
  }
  return staff;
}

function forcedChangeAllowed(url: string): boolean {
  return url.startsWith('/api/auth/') || url === '/api/me';
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const payload = readSession(request);
  if (!payload) throw unauthorized();
  if (payload.role !== 'admin') throw forbidden('Admin access required.');

  const admin = await loadAdmin(payload, reply);
  if (admin.mustChangePassword && !forcedChangeAllowed(request.url)) {
    throw forbidden(
      'Change the initial password before continuing.',
      'password_change_required',
    );
  }

  request.auth = {
    role: 'admin',
    id: admin.id,
    name: admin.username,
    mustChangePassword: admin.mustChangePassword,
  };
  refreshSession(reply, payload);
}

export async function requireStaff(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const payload = readSession(request);
  if (!payload) throw unauthorized();
  if (payload.role !== 'staff') throw forbidden('Staff access required.');
  if (!payload.deviceId) throw unauthorized();

  const staff = await loadStaff(payload, reply);
  if (payload.sv !== staff.sessionVersion) {
    clearSessionCookie(reply);
    throw unauthorized('Your key was reset. Sign in again.', 'session_revoked');
  }

  const header = request.headers['x-device-id'];
  const deviceId = Array.isArray(header) ? header[0] : header;
  if (!deviceId || deviceId !== payload.deviceId) {
    throw unauthorized('This device does not match the session.', 'device_mismatch');
  }

  request.auth = {
    role: 'staff',
    id: staff.id,
    name: staff.name,
    deviceId: payload.deviceId,
  };
  refreshSession(reply, payload);
}

export async function requireAnySession(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const payload = readSession(request);
  if (!payload) throw unauthorized();

  if (payload.role === 'admin') {
    const admin = await loadAdmin(payload, reply);
    request.auth = {
      role: 'admin',
      id: admin.id,
      name: admin.username,
      mustChangePassword: admin.mustChangePassword,
    };
    refreshSession(reply, payload);
    return;
  }

  if (!payload.deviceId) throw unauthorized();
  const staff = await loadStaff(payload, reply);
  request.auth = {
    role: 'staff',
    id: staff.id,
    name: staff.name,
    deviceId: payload.deviceId,
  };
  refreshSession(reply, payload);
}

export function adminOf(request: FastifyRequest): AdminAuth {
  if (!request.auth || request.auth.role !== 'admin') throw forbidden();
  return request.auth;
}

export function staffOf(request: FastifyRequest): StaffAuth {
  if (!request.auth || request.auth.role !== 'staff') throw forbidden();
  return request.auth;
}
