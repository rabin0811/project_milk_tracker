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

### Local PostgreSQL with Docker

Docker Desktop is the recommended way to run PostgreSQL on this machine. The native Windows PostgreSQL portable install produced client-backend DLL initialization failures (`0xC0000142`), while the Docker container works reliably.

```powershell
docker run -d --name projects-postgres `
  -e POSTGRES_HOST_AUTH_METHOD=trust `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_DB=postgres `
  -p 127.0.0.1:5432:5432 `
  -v projects_pgdata18:/var/lib/postgresql `
  postgres:18

docker exec -i projects-postgres psql -U postgres -c "CREATE ROLE milk_app LOGIN PASSWORD 'change-me';"
docker exec -i projects-postgres psql -U postgres -c "CREATE DATABASE milk_tracker OWNER milk_app;"
docker exec -i projects-postgres psql -U postgres -c "CREATE DATABASE milk_tracker_test OWNER milk_app;"
```

Use `127.0.0.1` (not `localhost`) in `DATABASE_URL` and `TEST_DATABASE_URL` so Node connects over IPv4. The trust setting is for local development only; the container is published only on `127.0.0.1`.

## Verified status (2026-11-10)

- [x] Workspace dependencies installed
- [x] Backend and frontend typecheck/build passed
- [x] Backend tests passed 10/10
- [x] Frontend tests passed 3/3
- [x] Migrations and seed completed against Docker PostgreSQL 18.6 `milk_tracker`
- [x] `/api/health`, admin login, and `/api/me` returned HTTP 200 directly
- [x] Login and `/api/me` returned HTTP 200 through the Vite proxy
- [x] Frontend page returned HTTP 200 at `http://localhost:5173`
- [x] Default password and `must_change_password` state restored after testing
- [ ] Playwright E2E suite is a placeholder (`test:e2e` prints a message)

## Notes and limitations

- Requires PostgreSQL. The local databases are `milk_tracker` and `milk_tracker_test`.
- The seed admin uses `SEED_ADMIN_PASSWORD` and must change the password on first login.
- Do not commit `.env`, database dumps, or build output.
- Vite binds to `localhost` (IPv6 on this machine). Use `http://localhost:5173`; `http://127.0.0.1:5173` may not respond.
- The frontend was scaffolded during the workspace repair because the original copy had no frontend files.

## Troubleshooting

- **Database connection error**: verify `DATABASE_URL`, use `127.0.0.1`, and confirm the Docker container is running with `docker exec projects-postgres pg_isready -U postgres`.
- **Migration fails**: ensure the database exists and the role has schema privileges.
- **Login loop after password change**: clear the session cookie and log in with the new password.
- **Vite proxy errors**: confirm the backend is on port 4000 and `frontend/vite.config.ts` proxies to it.
- **Frontend unreachable on 127.0.0.1**: use `http://localhost:5173` instead.
