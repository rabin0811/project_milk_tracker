# Features

Priority: **P0** = MVP, **P1** = soon after, **P2** = later.

## Branding
- **P0** White and green theme; logo and app icon showing a cow and a milk jar (see `design.md`). Installable icon, favicon, splash screen.

## Authentication
- **P0** Admin login (username + password); seeded admin cannot be deleted; forced password change on first login. Change password from the admin page.
- **P0** Staff login with secret key only; lockout after repeated wrong tries.
- **P0** Admin can create, disable, and reset staff keys (key shown once).

## Master data (admin)
- **P0** Places: add/edit/deactivate (start with 3, expandable).
- **P0** Farmers: farmer number, name, place. Farmer numbers need not be consecutive within a place.
- **P0** Goods items list (maize/corn, raw feed, ...) editable by admin.
- **P1** Optional place restriction per staff member.

## Entry (staff)
- **P0** Searchable farmer dropdown (by number or name).
- **P0** Milk entry: date (default today), shift (morning/evening), litres, fat %.
- **P0** Money entry: advance or payment, amount, optional note.
- **P0** Goods entry: item, quantity, unit, optional note.
- **P0** Single **Save**; after saving the entry is locked.
- **P0** Offline save with "Pending" / "Synced" status; automatic sync when online.
- **P0** History: staff see previous litres/fat, money (with rupee amounts) and goods per farmer. No rates/prices/totals.
- **P0** Duplicate warning: same farmer + date + shift already has a milk entry.
- **P1** "Request correction" button that sends a note to the admin for a locked entry.

## Rates (admin)
- **P0** Edit rate per place and the factory rate at any time; applies from now on.
- **P0** Separate **rate log** (old -> new, who, when, reason optional).
- **P0** Entries without a rate are flagged "rate missing".
- **P0** **Correction tool**: apply a rate to a date range with preview, reason, and logging.

## Calculation (server-side)
- **P0** Per entry: farmer amount = litres x farmer rate snapshot; factory amount = litres x factory rate snapshot.
- **P0** Totals per farmer, per place, per day/period, and overall litres sent to the factory.
- **P0** Farmer balance = milk amount - advances - goods value - payments.

## Admin dashboard
- **P0** Today/period summary: total litres, total farmer cost, factory revenue, profit/loss.
- **P0** Charts: litres per day, profit/loss over time, litres by place, top farmers.
- **P0** Pending-sync indicator (entries not yet uploaded are unknown to the server; show last sync time per staff).
- **P0** Audit log viewer with filters (staff, farmer, date, action).
- **P0** Admin can edit or void any entry with a mandatory reason; logged old -> new.
- **P1** Farmer statement for a date range (view, print, PDF).
- **P1** Export to CSV/Excel.
- **P2** Nepali language, BS dates, SMS statements.

## Acceptance examples
- Staff saves 25 L for Farmer #7 offline; later syncs once; admin sees it once. Admin changes it to 52 L; log shows "25 -> 52" by admin.
- Staff API responses and local storage contain no rate fields.
- Changing Place 2 rate from 60 to 62 leaves earlier entries at 60.
