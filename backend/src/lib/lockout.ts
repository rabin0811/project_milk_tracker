import type { Queryable } from '../db/pool.js';

export type AttemptScope = {
  identifier?: string | null;
  deviceId?: string | null;
  ip?: string | null;
};

export type LockoutStatus = {
  locked: boolean;
  retryAfterSeconds: number;
  failures: number;
};

const WINDOW = "interval '24 hours'";
const TIERS: Array<{ minFailures: number; lockMs: number }> = [
  { minFailures: 15, lockMs: 24 * 60 * 60 * 1000 },
  { minFailures: 10, lockMs: 60 * 60 * 1000 },
  { minFailures: 5, lockMs: 15 * 60 * 1000 },
];

function hasScope(scope: AttemptScope): boolean {
  return Boolean(scope.identifier || scope.deviceId || scope.ip);
}

/**
 * Failures are counted after the most recent success and within 24 hours.
 * 5 failures lock for 15 minutes, 10 for an hour, 15 for a day.
 */
export async function getLockoutStatus(
  client: Queryable,
  scope: AttemptScope,
  now = new Date(),
): Promise<LockoutStatus> {
  if (!hasScope(scope)) return { locked: false, retryAfterSeconds: 0, failures: 0 };

  const result = await client.query<{ failures: number; lastFailure: Date | null }>(
    `WITH scoped AS (
       SELECT success, at
       FROM auth_attempts
       WHERE ($1::text IS NOT NULL AND identifier = $1)
          OR ($2::text IS NOT NULL AND device_id = $2)
          OR ($3::inet IS NOT NULL AND ip = $3::inet)
     ),
     last_success AS (
       SELECT max(at) AS at FROM scoped WHERE success
     )
     SELECT count(*)::int AS "failures", max(scoped.at) AS "lastFailure"
     FROM scoped, last_success
     WHERE NOT scoped.success
       AND scoped.at > now() - ${WINDOW}
       AND scoped.at > COALESCE(last_success.at, '-infinity'::timestamptz)`,
    [scope.identifier ?? null, scope.deviceId ?? null, scope.ip ?? null],
  );

  const failures = result.rows[0]?.failures ?? 0;
  const lastFailure = result.rows[0]?.lastFailure ?? null;
  if (!lastFailure) return { locked: false, retryAfterSeconds: 0, failures };

  const tier = TIERS.find((candidate) => failures >= candidate.minFailures);
  if (!tier) return { locked: false, retryAfterSeconds: 0, failures };

  const unlockAt = new Date(lastFailure).getTime() + tier.lockMs;
  const remainingMs = unlockAt - now.getTime();
  if (remainingMs <= 0) return { locked: false, retryAfterSeconds: 0, failures };

  return {
    locked: true,
    retryAfterSeconds: Math.ceil(remainingMs / 1000),
    failures,
  };
}

export async function recordAuthAttempt(
  client: Queryable,
  scope: AttemptScope,
  success: boolean,
): Promise<void> {
  await client.query(
    `INSERT INTO auth_attempts (identifier, device_id, ip, success) VALUES ($1, $2, $3::inet, $4)`,
    [scope.identifier ?? null, scope.deviceId ?? null, scope.ip ?? null, success],
  );
}
