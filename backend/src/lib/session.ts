import { createHmac, timingSafeEqual } from 'node:crypto';

import type { FastifyReply } from 'fastify';

import { env } from '../env.js';

export const SESSION_COOKIE = 'milk_session';
export const ADMIN_IDLE_MS = 8 * 60 * 60 * 1000;
export const STAFF_SESSION_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_REFRESH_MS = 5 * 60 * 1000;

export type SessionRole = 'admin' | 'staff';

export type SessionPayload = {
  v: 1;
  role: SessionRole;
  id: number;
  deviceId?: string;
  /** Staff session version; bumps when the key is reset. */
  sv?: number;
  iat: number;
};

function signature(payloadPart: string): string {
  return createHmac('sha256', env.sessionSecret).update(payloadPart, 'utf8').digest('base64url');
}

export function createSessionToken(
  input: Omit<SessionPayload, 'v' | 'iat'> & { iat?: number },
): string {
  const payload: SessionPayload = {
    v: 1,
    role: input.role,
    id: input.id,
    iat: input.iat ?? Date.now(),
  };
  if (input.deviceId) payload.deviceId = input.deviceId;
  if (typeof input.sv === 'number') payload.sv = input.sv;
  const payloadPart = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${payloadPart}.${signature(payloadPart)}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadPart, provided] = parts;
  if (!payloadPart || !provided) return null;

  const expected = signature(payloadPart);
  const providedBuffer = Buffer.from(provided, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  if (providedBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(providedBuffer, expectedBuffer)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;
  const candidate = parsed as Record<string, unknown>;
  if (candidate.v !== 1) return null;
  if (candidate.role !== 'admin' && candidate.role !== 'staff') return null;
  if (typeof candidate.id !== 'number' || !Number.isInteger(candidate.id) || candidate.id <= 0) {
    return null;
  }
  if (typeof candidate.iat !== 'number' || !Number.isFinite(candidate.iat)) return null;
  if (candidate.deviceId !== undefined && typeof candidate.deviceId !== 'string') return null;
  if (candidate.sv !== undefined && (typeof candidate.sv !== 'number' || !Number.isInteger(candidate.sv))) {
    return null;
  }

  const result: SessionPayload = {
    v: 1,
    role: candidate.role,
    id: candidate.id,
    iat: candidate.iat,
  };
  if (typeof candidate.deviceId === 'string') result.deviceId = candidate.deviceId;
  if (typeof candidate.sv === 'number') result.sv = candidate.sv;
  return result;
}

export function sessionMaxAgeMs(role: SessionRole): number {
  return role === 'admin' ? ADMIN_IDLE_MS : STAFF_SESSION_MS;
}

export function isSessionExpired(payload: SessionPayload, now = Date.now()): boolean {
  return now - payload.iat > sessionMaxAgeMs(payload.role);
}

export function setSessionCookie(reply: FastifyReply, token: string, role: SessionRole): void {
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(sessionMaxAgeMs(role) / 1000),
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, { path: '/' });
}
