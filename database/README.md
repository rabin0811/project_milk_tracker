# Database

The server uses a SQLite database and a migration file.

- Migration reference: `database/migrate.ts`
- The live migration is in `backend/src/db/migrate.ts`.
- The database file is created at runtime and is not committed.
