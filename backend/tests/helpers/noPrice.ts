const FORBIDDEN_KEY_PATTERN = /(rate|amount|total|profit|value)/i;

const ALLOWED_KEYS = new Set(['mustChangePassword']);

/**
 * Recursively fails if a staff-facing payload contains a rate, a rate-derived
 * amount, a total, profit/loss, or a goods value. Allow explicit paths only
 * when a business rule permits a single cash amount (BR7).
 */
export function assertNoPriceFields(
  payload: unknown,
  options: { allowedPaths?: string[] } = {},
): void {
  const allowedPaths = new Set(options.allowedPaths ?? []);

  const walk = (value: unknown, path: string): void => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${path}[${index}]`));
      return;
    }
    if (typeof value !== 'object' || value === null) return;

    for (const [key, child] of Object.entries(value)) {
      const childPath = path ? `${path}.${key}` : key;
      if (
        FORBIDDEN_KEY_PATTERN.test(key) &&
        !ALLOWED_KEYS.has(key) &&
        !allowedPaths.has(childPath)
      ) {
        throw new Error(`Price-like field "${childPath}" leaked into a staff payload.`);
      }
      walk(child, childPath);
    }
  };

  walk(payload, '');

  const serialized = JSON.stringify(payload);
  if (/"(farmerRate|factoryRate|farmerAmount|factoryAmount|ratePerLitre|rateMissing)"/i.test(serialized)) {
    throw new Error('A rate field leaked into a staff payload.');
  }
}
