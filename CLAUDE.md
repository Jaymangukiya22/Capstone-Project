# CLAUDE.md

Guidance for AI agents (Claude Code and similar) working in this repo. Keep this
file current when structure, commands, or conventions change.

## What this is

**QuizUP** — a real-time multiplayer quiz platform. Monorepo, three deployables:

- `backend/` — REST API (Express + TypeScript + Sequelize/Postgres). Entry `src/server.ts`.
- `backend/` match server — a **Node cluster**: `src/matchServerMaster.ts` (holds
  all socket.io connections) + forked `src/matchServerWorker.ts` (hold match
  state), coordinated by `src/services/enhancedWorkerPool.ts`. Same package as the
  backend, different entrypoint.
- `Frontend-admin/` — React 19 + Vite + TypeScript admin/player UI.

Backing services: **Postgres**, **Redis** (match state + adapter). **Nginx**
fronts everything; **Cloudflare Tunnel** (`cloudflared`) exposes it publicly.

## Run it

```bash
docker compose up -d           # whole stack + monitoring (add --build after code changes)
docker compose ps              # all should be healthy
```

| Thing | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| **API docs (Swagger)** | http://localhost:3000/api-docs/ (local only; from `docs/openapi.yaml`) |
| Match server | http://localhost:3001 (`/health`, `/metrics`) |
| Nginx edge | http://localhost:8090 |
| Grafana | http://localhost:3003 (admin/admin) |
| Postgres / Redis | localhost:5433 / 127.0.0.1:6379 |

Full run/ops guide: **[docs/RUNNING.md](docs/RUNNING.md)**.

## Common commands (run in `backend/` unless noted)

| Task | Command |
|---|---|
| Typecheck | `npx tsc --noEmit` |
| Build | `npm run build` (tsc + copies `migrations/*.sql` into `dist/`) |
| Backend tests | `npm test` (jest; needs Postgres+Redis — see Testing) |
| DB migrations | `npm run migrate` (dev) · `node dist/scripts/migrate.js` (prod) |
| Seed data | `npm run seed:quick` / `seed:massive` |
| Dev (no Docker) | `npm run dev` (API) + `npm run dev:match:pool` (match) |
| Frontend | `cd Frontend-admin && npm run dev` / `npm run build` |
| Load/stress test | `node backend/scripts/loadtest.js` — see [docs/STRESS_TESTING.md](docs/STRESS_TESTING.md) |

## Architecture & conventions

- **DB schema** = Sequelize `sync()` from `backend/src/models` (prod: `force:false`,
  creates missing tables only, never alters). Anything sync can't express
  (indexes, unique constraints, back-fills) is an **idempotent SQL file** in
  `backend/src/migrations/`, applied by `npm run migrate` (tracked in a
  `schema_migrations` table). Add one: drop `NNN-name.sql`, keep it idempotent
  (`IF NOT EXISTS`/`ON CONFLICT`), run the command.
- **DB columns** are camelCase and must be **double-quoted** in raw SQL
  (`"matchId"`, `"userId"`, `"createdAt"`). Some legacy tables use snake_case.
- **API errors** are structured: `{ success: false, error: "CODE", message: "human text" }`
  (e.g. `VALIDATION_ERROR`, `AUTH_REQUIRED`, `INVALID_TOKEN`, `USER_ALREADY_EXISTS`).
  Assert on the **code**, not free text.
- **Match persistence** is off the critical path and race-safe via `findOrCreate`
  against unique constraints (`matches.matchId`, `match_players(matchId,userId)`).
  Don't reintroduce `findOne`-then-`create`.
- **Match-server capacity** is config-driven in `.env` (defaults in
  `docker-compose.yml`): cap = `MAX_WORKERS × MAX_MATCHES_PER_WORKER` (default
  **24,000**); `MATCHSERVER_MEMORY_LIMIT` is the real ceiling; `NODE_OPTIONS`
  caps each process heap. Matches are I/O-idle, not CPU-bound.

## Testing

- Jest suite in `backend/tests/` (unit + integration). Integration tests need a
  reachable Postgres + Redis; `tests/setup.ts` `beforeAll` creates a test DB and
  `sync({force:true})` — if the DB is unreachable, **every** test fails with an
  empty `AggregateError` (that's a connection problem, not test logic).
- Run like CI (Postgres/Redis on the compose network), e.g.:
  ```bash
  docker run --rm --network quizup_quizup_network -v "$PWD/backend":/app -w /app \
    -e NODE_ENV=test -e DB_HOST=postgres -e DB_PORT=5432 \
    -e DB_USER=quizup_user -e DB_PASSWORD=quizup_password -e DB_NAME=quizup_test \
    -e REDIS_URL=redis://:<pw>@redis:6379 node:20-alpine npx jest --runInBand
  ```
- `TEST_BYPASS_AUTH=true` (set in `tests/env.setup.ts`) bypasses auth **only** for
  non-`/api/auth` routes with no token, so controller tests skip token minting;
  `/api/auth/*` always enforces.

## Gotchas

- **Nginx caches upstream IPs at startup.** After you restart `backend`/`matchserver`
  (they get new container IPs), nginx serves **502** on the prod URLs until you
  `docker compose restart nginx`. Nginx also crash-loops if an upstream (e.g.
  `frontend`) isn't running — bring the whole stack up.
- **`cloudflared` is a host process**, not a container. Prod URLs 502/1033 = tunnel
  down: `cloudflared tunnel --config ~/.cloudflared/config.yml run`.
- **Driving load from the Windows host caps ~2000 connections** (Docker Desktop
  port proxy). Run load generators **in-container** on `quizup_quizup_network`.
- **`.env` is gitignored** (holds `JWT_SECRET`, `REDIS_PASSWORD`, DB creds, sizing).
  `docker-compose.yml` carries safe defaults; real values live in `.env`.

## Workflow expectations

- Commit/push only when asked. Branch off `main`; the working branch is often
  `fix/audit-reliability-and-security`.
- Prefer editing existing files; match surrounding style. Run `npx tsc --noEmit`
  after backend changes.
- Verify with real runs (tests, a `MODE=play` load batch, DB queries) — don't
  claim done without evidence.

## Map

- Findings & fixes: [AUDIT_FINDINGS.md](AUDIT_FINDINGS.md) · removals: [REMOVED.md](REMOVED.md)
- Session narrative / capacity results: [SESSION_HANDOFF.md](SESSION_HANDOFF.md)
- Run/ops: [docs/RUNNING.md](docs/RUNNING.md) · load testing: [docs/STRESS_TESTING.md](docs/STRESS_TESTING.md)
- Architecture: [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md) · API: [docs/openapi.yaml](docs/openapi.yaml) · sockets: [docs/socket_spec.md](docs/socket_spec.md)
