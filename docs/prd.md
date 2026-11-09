# Project Requirements Document (PRD): Milk Tracker

Working name: **Milk Tracker**. Status: draft v1, planned together with the owner.

## 1. Problem
The owner collects milk from farmers in several places and sells all of it to a cheese factory. Today, entries, multiplying litres by rate, and adding totals are done by hand. This is slow and error-prone. The owner needs a phone-based register that records collections and does all calculations automatically.

## 2. Users
| Role | Who | Can do |
|---|---|---|
| **Admin** | The owner | Everything: create farmers/staff/places, set rates, edit entries, see money, charts, logs |
| **Staff** | Milk collectors | Add entries only. Never see rates, bill totals, or profit/loss |

## 3. Goals
1. Enter milk once; the app computes farmer amounts, place totals and the total sent to the factory. No double entry, no manual math.
2. Work on a phone, including in places with **no internet** (offline entry, sync later).
3. Keep records trustworthy: entries are locked after saving, every change is logged (who, what, old -> new).
4. Give the admin a dashboard with charts, including profit and loss.

## 4. Non-goals (v1)
- No tracking of what the factory actually accepts vs what was collected (all collected milk is assumed to go to the factory; no shrinkage tracking).
- No farmer login, no payment gateway, no fat-based pricing.
- No multi-company / multi-tenant support.

## 5. Business rules (source of truth)
- **BR1** A farmer has a number, name and a **place**. The place decides the farmer rate.
- **BR2** Rates are **per litre, per place**. A rate starts **blank**. An entry saved while no rate exists has no amount and is flagged "rate missing".
- **BR3** Rates change at unpredictable times. The admin edits any rate at any time. A normal change applies **from that moment on**; entries already made keep their old rate.
- **BR4** An admin-only **Correction tool** can apply a rate to a **date range** (to fix mistakes or rates learned late). It must show a preview, require a reason, and be logged.
- **BR5** The **factory rate** is one rate per litre, edited the same way (own history). Needed for profit/loss. (Assumption; confirm.)
- **BR6** Staff entries are **locked once saved**. Only the admin can change them. Every change is written to the audit log with old and new values.
- **BR7** Staff **never** see: rates, calculated amounts, bill totals, profit/loss. Staff **can** see: previous litres/fat entries, and what each farmer received and was paid, including **rupee amounts of advances and payments**.
- **BR8** Fat % is recorded but is **information only**; it does not affect price (confirm if this ever changes).
- **BR9** Money entries: **advance** (farmer asked for money) and **payment** (money paid out). Goods entries: item (e.g. maize/corn, raw feed), quantity, unit. Goods **value** is set by the admin only and hidden from staff.
- **BR10** Farmer balance = milk amount - advances - goods value - payments.
- **BR11** The admin account is permanent and cannot be deleted. Its password is changeable from the admin page.
- **BR12** Admin creates farmers and staff. Staff log in with an admin-issued **secret key**.
- **BR13** Rate changes have their **own separate log** in the admin panel.

## 6. Functional requirements
See `feature.md`.

## 7. Non-functional requirements
- Mobile-first, installable PWA, large tap targets, fast entry (under ~10 seconds per milk entry).
- Offline-first for staff; admin panel may require internet.
- Security: hashed passwords/keys, role checks on the server, lockout on repeated wrong keys, rates never sent to staff devices.
- Timestamps stored in UTC, displayed in Asia/Kathmandu (UTC+5:45).
- Append-only audit and rate logs.

## 8. Assumptions (owner to confirm)
1. Staff see all farmers by default; admin may optionally limit a staff member to certain places.
2. Staff secret key: system-generated, 8 digits recommended (minimum 6), unique.
3. English UI and AD dates first; Nepali language and BS dates later.
4. Goods value is entered by the admin after the fact (or left blank).
5. Fat uses one decimal (e.g. 4.2); litres use up to two decimals.

## 9. Open questions
- Should staff be limited to their assigned place(s)? (default: all farmers)
- Settlement period for statements (weekly / 10-day / monthly) or any date range? (default: any date range)
- Does the owner want printed/PDF statements per farmer in v1 or later?

## 10. Success criteria
- A full day of entries (offline and online) syncs with zero duplicates and zero manual calculation.
- Staff cannot see any price through the UI, API responses, or cached data.
- Every admin edit appears in the audit log with old and new values.
