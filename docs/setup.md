# Setup

Commands assume the recommended stack (Node + PostgreSQL). Adjust if the stack changes.

## Prerequisites
- Node.js 20+ and npm (or pnpm)
- PostgreSQL 15+
- A phone or browser device emulator for PWA testing (HTTPS or `localhost` is required for service workers)

## Environment variables (`.env`, never commit)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/milk_tracker
SESSION_SECRET=<long random string>
KEY_PEPPER=<long random string>        # for HMAC of staff keys
NODE_ENV=development
TZ=UTC                                 # store UTC; display Asia/Kathmandu in the UI
PORT=4000
```
Provide a `.env.example` without real secrets.

## First run
```
npm install
npx prisma migrate dev          # or your migration command
npm run seed                    # admin, 3 places, goods items (idempotent)
npm run dev                     # backend + frontend
```
Open the app, log in as `admin` (initial password in `authentication.md`), and change the password when prompted.

## Useful scripts the agent should provide
`npm run dev`, `npm run build`, `npm test`, `npm run test:e2e`, `npm run lint`, `npm run seed`, `npm run migrate`.

## Test on a real phone
Use a tunnel or same-network HTTPS dev server, open the URL, "Add to Home Screen", then test airplane mode.

## Production notes
HTTPS required, daily DB backups, secrets in the host's secret store, rotate `SESSION_SECRET` carefully (it logs everyone out). Do not rotate `KEY_PEPPER` without re-issuing all staff keys (it invalidates them).
