import type { PoolClient } from 'pg';

import { pool } from '../db/pool.js';

export type AuditActorType = 'admin' | 'staff' | 'system';

export type AuditEntry = {
  actorType: AuditActorType;
  actorId?: number | null;
  action: string;
  entityType: string;
  entityId: string | number;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
};

type Queryable = Pick<PoolClient, 'query'>;

/**
 * Append-only activity log. NEVER pass passwords, raw staff keys, session
 * tokens, or anything derived from them in oldValue/newValue.
 */
export async function writeAudit(client: Queryable, entry: AuditEntry): Promise<void> {
  await client.query(
    `INSERT INTO audit_log
       (actor_type, actor_id, action, entity_type, entity_id, old_value, new_value, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      entry.actorType,
      entry.actorId ?? null,
      entry.action,
      entry.entityType,
      String(entry.entityId),
      entry.oldValue === undefined ? null : JSON.stringify(entry.oldValue),
      entry.newValue === undefined ? null : JSON.stringify(entry.newValue),
      entry.reason ?? null,
    ],
  );
}

export function auditWithPool(entry: AuditEntry): Promise<void> {
  return writeAudit(pool, entry);
}
