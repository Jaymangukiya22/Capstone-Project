---
description: Apply pending database migrations
---
Apply pending SQL migrations from `backend/src/migrations/` using the tracked
runner. Idempotent and safe to re-run (records applied files in `schema_migrations`).

- **Local / dev:** `cd backend && npm run migrate`
- **Against the running container:** `docker compose exec backend node dist/scripts/migrate.js`
- **Prod** runs it automatically on deploy (`.github/workflows/ci.yml`).

To add a migration: create `backend/src/migrations/NNN-description.sql` (zero-padded
numeric prefix controls order), keep every statement idempotent (`IF NOT EXISTS`,
`ON CONFLICT`, guard `ADD CONSTRAINT` with a `DO $$ ... $$` existence check), then
run the command. `npm run build` copies the `.sql` files into `dist/migrations/`
so the compiled runner finds them.

After running, confirm:
`docker compose exec postgres psql -U quizup_user -d quizup_db -c "TABLE schema_migrations;"`
