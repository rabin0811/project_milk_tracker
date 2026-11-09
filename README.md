# project_milk_tracker

## Milk Tracker

An offline-first milk collection tracker with a Fastify/PostgreSQL backend and a React/Vite frontend. It includes login, forced password change, master-data administration, and a staff collection view.

- Original location: `D:\projects\milk`
- Working copy: `D:\PROJECTS_READY\project_milk_tracker`
- Backend: Node.js, Fastify 5, PostgreSQL, Argon2, Zod
- Frontend: React 19, Vite 8, TypeScript

## Folder layout

```text
project_milk_tracker/
  backend/    Fastify API, migrations, seed scripts, tests
  frontend/   React/Vite app, tests, Vite proxy config
  database/   Database notes
  docs/       Project documentation
```

## Setup

```powershell
npm ci
Copy-Item .env.example .env
# edit DATABASE_URL, TEST_DATABASE_URL, SESSION_SECRET, KEY_PEPPER, SEED_ADMIN_PASSWORD
npm run migrate
npm run seed
npm run dev
```

Ports: backend `4000`, frontend Vite `5173`.

## Verified status (2026-11-09)

- [x] Workspace dependencies installed
- [x] Backend and frontend typecheck/build passed
- [x] Backend tests passed 10/10
- [x] Frontend tests passed 3/3
- [x] Migrations and seed completed against PostgreSQL `milk_tracker`
- [x] `/health`, login, and `/me` returned HTTP 200
- [x] End-to-end through the Vite proxy: page, health, login, password change, and admin places all HTTP 200
- [x] Default password and `must_change_password` state restored after the test
- [ ] Playwright E2E suite is a placeholder (`test:e2e` prints a message)

## Notes and limitations

- Requires PostgreSQL; the local database `milk_tracker` and test database `milk_tracker_test` are used.
- The seed admin uses `SEED_ADMIN_PASSWORD` and must change the password on first login.
- Do not commit `.env`, database dumps, or build output.
- The frontend was scaffolded during the workspace repair because the original copy had no frontend files.

## Troubleshooting

- **Database connection error**: verify `DATABASE_URL` and that PostgreSQL is running.
- **Migration fails**: ensure the database exists and the role has schema privileges.
- **Login loop after password change**: clear the session cookie and log in with the new password.
- **Vite proxy errors**: confirm the backend is on port 4000 and `frontend/vite.config.ts` proxies to it.
