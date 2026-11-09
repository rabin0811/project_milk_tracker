import { createHmac, randomInt } from 'node:crypto';

import { env } from '../env.js';

export const STAFF_KEY_DIGITS = 8;

export function generateStaffKey(): string {
  return randomInt(0, 10 ** STAFF_KEY_DIGITS)
    .toString()
    .padStart(STAFF_KEY_DIGITS, '0');
}

/**
 * Deterministic lookup value so the server can find a staff row from the key.
 * The raw key is never stored. Changing KEY_PEPPER invalidates every key.
 */
export function staffKeyLookup(key: string): string {
  return createHmac('sha256', env.keyPepper).update(key, 'utf8').digest('hex');
}

export function isStaffKeyFormat(key: string): boolean {
  return new RegExp(`^\\d{6,${STAFF_KEY_DIGITS}}$`).test(key);
}
