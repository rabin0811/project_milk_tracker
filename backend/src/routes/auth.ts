import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { findAdminById } from '../data/admins.js';
import { parseBody } from '../lib/validate.js';
import {
  clearSessionCookie,
  createSessionToken,
  setSessionCookie,
} from '../lib/session.js';
import { readSession, requireAdmin } from '../middleware/auth.js';
import {
  auditAdminLogout,
  changeAdminPassword,
  loginAdmin,
  loginStaff,
} from '../services/auth.js';

const adminLoginSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(200),
});

const staffLoginSchema = z.object({
  key: z
    .string()
    .trim()
    .regex(/^\d{6,8}$/, 'Enter the numeric key given by the admin.'),
  deviceId: z.string().trim().min(8).max(100),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/admin/login', async (request, reply) => {
    const body = parseBody(adminLoginSchema, request.body);
    const admin = await loginAdmin(body, { ip: request.ip });
    const token = createSessionToken({ role: 'admin', id: admin.id });
    setSessionCookie(reply, token, 'admin');
    return reply.send({
      role: 'admin',
      name: admin.username,
      mustChangePassword: admin.mustChangePassword,
    });
  });

  app.post('/admin/change-password', { onRequest: requireAdmin }, async (request, reply) => {
    const body = parseBody(changePasswordSchema, request.body);
    const admin = request.auth;
    if (!admin || admin.role !== 'admin') throw new Error('unreachable');
    await changeAdminPassword(admin.id, body);
    return reply.send({ ok: true });
  });

  app.post('/staff/login', async (request, reply) => {
    const body = parseBody(staffLoginSchema, request.body);
    const staff = await loginStaff(body, { ip: request.ip });
    const token = createSessionToken({
      role: 'staff',
      id: staff.id,
      deviceId: body.deviceId,
    });
    setSessionCookie(reply, token, 'staff');
    return reply.send({ role: 'staff', name: staff.name, deviceId: body.deviceId });
  });

  app.post('/logout', async (request, reply) => {
    const payload = readSession(request);
    if (payload?.role === 'admin' && (await findAdminById(payload.id))) {
      await auditAdminLogout(payload.id);
    }
    clearSessionCookie(reply);
    return reply.send({ ok: true });
  });
}
