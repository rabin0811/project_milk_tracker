# Architecture

Recommended stack (the agent may substitute with a short written reason):
- **Frontend:** React + TypeScript + Vite, built as a **PWA** (service worker, web manifest). Local storage of pending entries in **IndexedDB** (e.g. Dexie). Charts: Recharts.
- **Backend:** Node.js + TypeScript (Express or Fastify), REST + JSON.
- **Database:** PostgreSQL with Prisma (or plain SQL migrations).
- **Auth:** HTTP-only cookie session or short-lived JWT; Argon2id/bcrypt for passwords.

## Components
```
[Staff phone PWA] --\                        /-- audit_log (append-only)
   IndexedDB queue   >-- HTTPS REST API ----<--- PostgreSQL
[Admin phone PWA] --/    (role checks,        \-- rate_log (append-only)
                          money calculation)
```

## Key principles
1. **The server owns all money logic.** Clients send litres/fat/amounts-given only. The server picks the rate and computes amounts.
2. **Role-based response shaping.** Staff endpoints return DTOs that never contain rate, amount-from-rate, total, or profit fields. Never rely on hiding in the UI.
3. **Rates never reach staff devices**, including service-worker caches and IndexedDB.
4. **Append-only logs.** Revoke UPDATE/DELETE on `audit_log` and `rate_log` (or use triggers that raise).
5. **Idempotent sync.** Every entry has a client-generated UUID; re-sending is safe.
6. **Time:** store UTC; the device records `entered_at` at the moment of Save; display in Asia/Kathmandu.

## Offline sync flow
1. Staff taps Save. The app validates, creates `{uuid, farmer_id, entry_date, shift, litres, fat, entered_at, device_id}` and stores it in the IndexedDB `outbox` with status `pending`. The entry appears in the staff history immediately (litres/fat/money/goods only).
2. When online (or on app open / background sync / manual "Sync now"), the app POSTs the outbox in batches to `/api/staff/sync`.
3. The server, per item: verifies the staff session, checks the farmer exists/active (and place restriction if set), inserts with `ON CONFLICT (id) DO NOTHING`, then picks the rate effective at `entered_at` and stores `farmer_rate`/`factory_rate` snapshots (NULL if no rate yet), and writes an audit row.
4. The server replies per item: `synced`, `duplicate_ignored`, or `rejected(reason)`. The app marks `synced` or shows the error.
5. **Conflict rule:** admin changes always win. If the admin voids/edits an entry, later syncs of other entries are unaffected; a pending entry for a deactivated farmer is rejected with a clear message.

## Rate selection
For an entry, use the latest `place_rates` row with `effective_from <= entered_at` for the farmer's place at the time of processing. If none exists, leave the snapshot NULL ("rate missing"). Normal rate edits create a new row with `effective_from = now()`. Only the Correction tool rewrites snapshots on existing entries.

## Correction tool (admin only)
Input: kind (place or factory), place (if place), date range, new rate, reason. Steps: preview (count of entries, current vs new total) -> confirm -> in one transaction update snapshots, write `rate_log` (is_correction = true, range, entries_affected) and an `audit_log` row per changed entry (or one summarizing row plus a stored list of ids).

## Dashboard calculations
- Farmer cost = sum(farmer_amount); factory revenue = sum(factory_amount); profit = revenue - cost. If any factory rate is missing in the period, show a warning instead of a misleading number.
- Aggregate in SQL; cache only on the admin side.

## Deployment (suggestion, not decided)
Single small VPS or managed platform; HTTPS required (PWA + service worker). Daily database backups. Environment variables for secrets.
