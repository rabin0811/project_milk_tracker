# Testing

Tools (suggested): Vitest/Jest for unit and API tests, Playwright for E2E (mobile viewport, offline mode), a test PostgreSQL database reset per run.

## Unit tests
- Rate selection: picks the latest rate with `effective_from <= entered_at`; NULL when none.
- Amount math: litres x rate, rounding to 2 decimals, NULL when rate missing.
- Balance: milk amount - advances - goods value - payments; voided rows excluded.
- Correction tool preview vs apply gives the same numbers.
- Key generation is unique and the right length; HMAC lookup works.

## API and security tests (must pass before release)
- Staff token calling any `/admin/*` route gets 403.
- **Staff responses contain no `rate`, `amount` (rate-derived), `total`, `profit` fields**: assert on every staff endpoint.
- Wrong staff key 5 times -> lockout; correct key still blocked until lockout ends.
- Disabled staff cannot log in or sync; reset key invalidates the old key at once.
- Admin cannot be deleted; re-running seed does not reset the password.
- Audit/rate logs: UPDATE and DELETE attempts fail.
- Admin edit without a reason is rejected; edit writes `old -> new`.

## Offline and sync tests
- Save entries with the network off, reconnect: all upload once.
- Send the same batch twice: second response is `duplicate_ignored`, no duplicate rows.
- Network drops mid-sync: retry completes without duplicates.
- Entry made before a rate change, synced after it: uses the rate effective at `entered_at`.
- Entry for a farmer deactivated meanwhile: rejected with clear reason and stays visible to staff as an error.
- Pending entries survive app restart and phone reboot.

## Business-rule tests
- Changing Place 2 from 60 to 62 leaves earlier entries at 60.
- Entries with no rate show "rate missing"; the correction tool fills them for a date range.
- Profit/loss warns when the factory rate is missing in the period.
- Non-consecutive farmer numbers (1-5 and 16 in Place 1) resolve to the right place rate.

## E2E (mobile viewport 360x800)
Staff: key login -> milk entry -> save -> locked -> history. Admin: login -> forced password change -> create farmer/staff -> set rates -> edit an entry -> see log.

## Manual checklist with the owner
Real phones, real signal drops, morning rush entry speed, dashboard numbers match a hand calculation for one day.
