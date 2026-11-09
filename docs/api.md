# API

Base: `/api`. JSON. All routes except the two login routes require a session. Validate every body (e.g. zod). Errors: `{ "error": { "code": "...", "message": "..." } }`.

## Auth
| Method | Path | Who | Notes |
|---|---|---|---|
| POST | /auth/admin/login | public | `{username, password}`; returns `mustChangePassword` |
| POST | /auth/admin/change-password | admin | `{currentPassword, newPassword}` |
| POST | /auth/staff/login | public | `{key, deviceId}`; lockout after repeated failures |
| POST | /auth/logout | any | |
| GET | /me | any | role, name |

## Staff routes (responses contain NO rates, rate-derived amounts, totals, or profit)
| Method | Path | Purpose |
|---|---|---|
| GET | /staff/bootstrap | farmers (id, number, name; place name only if useful), goods items, units |
| POST | /staff/sync | batch upload of pending entries (see below) |
| GET | /staff/history?farmerId=&from=&to= | previous milk (litres, fat), cash (kind, amount, note), goods (item, qty, unit) |
| POST | /staff/edit-requests | P1: `{entryType, entryId, note}` |

### Sync request
```json
{
  "deviceId": "abc",
  "entries": [
    {"type":"milk","id":"uuid","farmerId":7,"entryDate":"2026-10-23","shift":"morning","litres":25,"fat":4.2,"enteredAt":"2026-10-23T00:41:12Z"},
    {"type":"cash","id":"uuid","farmerId":7,"kind":"advance","amount":5000,"note":"","enteredAt":"..."},
    {"type":"goods","id":"uuid","farmerId":7,"goodsItemId":1,"quantity":2,"unit":"sack","enteredAt":"..."}
  ]
}
```
### Sync response
```json
{"results":[{"id":"uuid","status":"synced"},{"id":"uuid2","status":"duplicate_ignored"},{"id":"uuid3","status":"rejected","reason":"farmer_inactive"}]}
```
Also return a `warnings` array item `possible_duplicate` when the same farmer + date + shift already has a milk entry.

## Admin routes (full data, including rates and money)
**Master data:** `GET/POST/PATCH /admin/places`, `/admin/farmers`, `/admin/goods-items`.
**Staff:** `GET/POST /admin/staff` (create returns `{key}` **once**), `POST /admin/staff/:id/reset-key`, `PATCH /admin/staff/:id` (disable/enable, places).
**Entries:** `GET /admin/entries?type=&farmerId=&placeId=&from=&to=&staffId=`; `PATCH /admin/entries/:type/:id` (body includes `reason`; writes audit old -> new); `POST /admin/entries/:type/:id/void` (reason required); `PATCH /admin/goods-entries/:id/value` (sets value_amount).
**Rates:** `GET /admin/rates` (current + history); `POST /admin/rates/place` `{placeId, ratePerLitre}`; `POST /admin/rates/factory` `{ratePerLitre}`; both create a row with `effective_from = now()` and a `rate_log` row.
**Corrections:** `POST /admin/rates/corrections/preview` `{kind, placeId?, from, to, newRate}` -> `{entriesAffected, oldTotal, newTotal}`; `POST /admin/rates/corrections/apply` same body plus `reason` (required).
**Reports:** `GET /admin/dashboard?from=&to=` (litres, cost, revenue, profit, series for charts); `GET /admin/farmers/:id/statement?from=&to=`; `GET /admin/export.csv?...` (P1).
**Logs:** `GET /admin/logs/audit?...`, `GET /admin/logs/rates?...`.
**Edit requests (P1):** `GET /admin/edit-requests`, `PATCH /admin/edit-requests/:id`.

## Rules
- Role middleware on every route; deny by default.
- Staff DTOs are built from explicit allow-lists of fields.
- Admin edits/voids/corrections always write audit rows (and rate_log for rates).
- No DELETE endpoints for entries or logs; use void.
- Rate-limit login routes.
