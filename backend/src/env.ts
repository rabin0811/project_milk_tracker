import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { z } from 'zod';

const here = path.dirname(fileURLToPath(import.meta.url));
// server/src -> repo root (also server/dist -> repo root)
const rootEnv = path.resolve(here, '../../.env');

dotenv.config({ path: rootEnv, quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(4000),
  TZ: z.string().min(1).default('UTC'),
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, 'must be a postgres connection string'),
  TEST_DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\//, 'must be a postgres connection string')
    .optional(),
  SESSION_SECRET: z.string().min(32, 'must be at least 32 characters'),
  KEY_PEPPER: z.string().min(16, 'must be at least 16 characters'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('12345678'),
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
  console.error(`Invalid environment configuration: ${fields}. See .env.example.`);
  process.exit(1);
}

const raw = parsed.data;
const isTest = raw.NODE_ENV === 'test';

if (isTest && !raw.TEST_DATABASE_URL) {
  console.error('TEST_DATABASE_URL is required when NODE_ENV=test.');
  process.exit(1);
}

export const env = {
  nodeEnv: raw.NODE_ENV,
  isProduction: raw.NODE_ENV === 'production',
  isTest,
  port: raw.PORT,
  timeZone: raw.TZ,
  databaseUrl: isTest ? (raw.TEST_DATABASE_URL as string) : raw.DATABASE_URL,
  sessionSecret: raw.SESSION_SECRET,
  keyPepper: raw.KEY_PEPPER,
  seedAdminPassword: raw.SEED_ADMIN_PASSWORD,
  cookieSecure: raw.COOKIE_SECURE ? raw.COOKIE_SECURE === 'true' : raw.NODE_ENV === 'production',
};
