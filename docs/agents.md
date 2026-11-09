# Instructions for the coding agent

You are building **Milk Tracker**. Read the docs in the order listed in `readme.md` before writing code.

## Ground rules
1. **Source of truth:** `prd.md` business rules (BR1-BR13). If code and docs disagree, stop and ask; do not guess.
2. **Never expose prices to staff.** Staff API responses are built from explicit allow-lists. No rates, rate-derived amounts, totals, or profit in staff responses, caches, IndexedDB, or hidden UI. Add a test that fails if a staff response contains a rate field.
3. **Server does the money math.** Clients never send or compute rates or amounts.
4. **Entries are locked after Save.** Only admin routes may change or void entries, always with a reason, always logged old -> new.
5. **Logs are append-only.** `audit_log` and `rate_log` get no UPDATE/DELETE path.
6. **Offline-first sync is idempotent.** Client-generated UUIDs; re-sending never duplicates.
7. **The admin account is permanent.** No delete path; seeding never overwrites an existing password.
8. **Never log or commit secrets** (passwords, keys, `.env`).
9. Use `NUMERIC` for money, UTC for timestamps, display in Asia/Kathmandu.

## Workflow
- Follow `plan.md` phase by phase; finish and test each phase before the next.
- Small commits with clear messages; one concern per commit.
- Write tests alongside code (`testing.md`). Update docs when behavior changes.
- If a requirement is ambiguous, list the options and ask the owner; record the decision in `prd.md` section 8/9.
- Prefer simple, readable code over cleverness. Keep dependencies minimal and justified.

## Code conventions
- TypeScript strict mode. Validate all inputs with a schema library.
- Layered structure: routes -> services -> data access. Role checks in middleware, not scattered.
- Error format as in `api.md`. No stack traces to clients.
- UI strings in a string table (future Nepali).
- Branding: white and green theme with a cow + milk jar logo and icon, exactly as specified in `design.md`. Define colors as design tokens (CSS variables); do not hard-code hex values in components.

## Do not
- Do not add features outside `feature.md` without asking.
- Do not add a staff-visible total "for convenience".
- Do not store the raw staff key or any plain-text password.
- Do not use floating point for money.
- Do not point any tool at production data (see `mcp.md`).

## Definition of done
Feature works online and offline (where relevant), tests pass, audit rows written, no price leak, docs updated.
