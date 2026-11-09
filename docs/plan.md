# Plan

Build in small phases; finish and test each before the next. Check off items as done.

## Phase 0: Project setup
- [ ] Repo, TypeScript, lint/format, env handling (`setup.md`)
- [ ] PostgreSQL + migrations from `database.md`; seed admin, places, goods items
- [ ] Basic CI: lint + tests
- [ ] Branding assets: cow + milk jar logo (SVG), PWA icons (192/512/maskable), favicon, theme colors from `design.md`

## Phase 1: Auth and master data
- [ ] Admin login, forced password change, change-password page
- [ ] Staff create/disable/reset-key; staff key login with lockout
- [ ] Places, farmers, goods items CRUD (admin)
- [ ] Role middleware, audit logging helper

## Phase 2: Online entry
- [ ] Staff PWA shell, farmer search dropdown
- [ ] Milk, money, goods entry forms; Save locks entries
- [ ] Server-side rate lookup and snapshots
- [ ] Staff history (no prices)

## Phase 3: Offline and sync
- [ ] Service worker + manifest (installable)
- [ ] IndexedDB outbox, Pending/Synced states, auto-sync
- [ ] `/staff/sync` idempotent endpoint, duplicate warning
- [ ] Offline tests (airplane mode, double send)

## Phase 4: Rates, logs, admin edits
- [ ] Rate edit for places and factory, rate log
- [ ] Entry edit/void with reasons; audit log viewer
- [ ] Correction tool with preview

## Phase 5: Dashboard and reports
- [ ] Totals and charts, profit/loss with missing-rate warnings
- [ ] Farmer statement and balance
- [ ] Pending-sync / last-sync indicators

## Phase 6: Hardening and release
- [ ] Security review (see `authentication.md`, `testing.md`)
- [ ] Backups, HTTPS, deployment
- [ ] Owner acceptance test with real staff on real phones

## Later (P1/P2)
Edit-request button, CSV/PDF export, Nepali language and BS dates, SMS statements.

## Definition of done (every task)
Code + tests + docs updated + no staff-visible price leak + audit entries where required.
