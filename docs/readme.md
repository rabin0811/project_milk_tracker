# Milk Tracker

A mobile-first, offline-capable web app (PWA) for a milk collector who buys milk from farmers in several places and sells it all to a cheese factory. Staff enter collections on their phones; the app does all the math; the admin sees money, charts, and logs.

## Document index (read in this order)
1. `prd.md`: what we are building and the business rules
2. `feature.md`: feature list with priorities and acceptance criteria
3. `architecture.md`: system design and offline sync
4. `database.md`: schema
5. `api.md`: endpoints and role-based responses
6. `authentication.md`: admin password and staff secret key
7. `design.md`: screens and UI rules
8. `plan.md`: build phases and checklist
9. `setup.md`: local environment
10. `testing.md`, `debugging.md`: verification and troubleshooting
11. `integration.md`, `mcp.md`: external services and agent tooling
12. `agents.md`: rules for the coding agent

## Roles in one line
- **Admin:** full control and visibility. **Staff:** add entries only, see no prices.

## Core rules in one line
Entries lock after saving; only admin edits; everything is logged; rates live per place; staff devices never receive rates.

## Status
Planning complete (v1). Implementation follows `plan.md`.
