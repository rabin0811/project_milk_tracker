import { hash, verify } from '@node-rs/argon2';

// Argon2id with the OWASP-recommended minimum profile (19 MiB, 2 passes, 1 lane).
// The library defaults to Argon2id; the algorithm option is omitted because it
// is an ambient const enum, which verbatimModuleSyntax cannot inline.
const options = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, options);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password, options);
  } catch {
    return false;
  }
}

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 200;
