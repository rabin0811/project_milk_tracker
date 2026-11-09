# Debugging guide

## Entries stuck on "Pending"
- Check network, session (staff disabled? key reset?), and the `/staff/sync` response for `rejected` reasons.
- Inspect IndexedDB `outbox` in browser dev tools; look at the last error stored per item.
- Verify the service worker is not serving a stale API response.

## Duplicate entries
- Each entry must have a client UUID; check the insert uses `ON CONFLICT (id) DO NOTHING`.
- If two different UUIDs exist for the same farmer/date/shift, it was two real saves; the duplicate warning should have appeared.

## Wrong amount or "rate missing"
- Query `place_rates` for the farmer's place and compare `effective_from` with the entry's `entered_at` (not `received_at`).
- Check the farmer's place assignment (farmer numbers are not consecutive by place).
- Remember: a normal rate change never alters old entries; use the Correction tool.

## Staff can see prices (critical)
- Search staff DTOs for rate/amount fields; check the service-worker cache and IndexedDB contents.
- A failing "no price fields" test is a release blocker.

## Staff cannot log in
- Check `auth_attempts` for lockout; check the staff row is active; confirm `KEY_PEPPER` is unchanged (changing it invalidates all keys).

## Wrong dates or times
- DB is UTC; UI shows Asia/Kathmandu (UTC+5:45). Check that `entry_date` was set from the device's local date at Save, and that day boundaries in reports use Asia/Kathmandu.

## PWA not installing or updating
- Needs HTTPS (or localhost), a valid manifest, and a registered service worker. On update, make sure the new service worker activates (skip waiting prompt) and old caches are cleared.

## Dashboard numbers look wrong
- Compare with a SQL sum for the same range; ensure voided rows are excluded and rate-missing rows are reported separately.

## Logging tips
Log request id, role, route, status, and duration. Never log passwords, keys, or full request bodies of auth routes.
