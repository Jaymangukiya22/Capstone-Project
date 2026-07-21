# Running QuizUP — Dev, API Docs, Prod (Cloudflare)

Practical guide to starting the stack, reaching the API docs, and bringing up the
public prod path. Reflects the current config (raised match-server capacity, the
Cloudflare tunnel that replaced the old LocalTunnel/Tunnelmole flow).

- **Architecture:** [ARCHITECTURE.md](../ARCHITECTURE.md) · **Load testing:** [STRESS_TESTING.md](STRESS_TESTING.md) · **Tunnel setup:** [../CLOUDFLARE_TUNNEL_SETUP.md](../CLOUDFLARE_TUNNEL_SETUP.md)

---

## 1. Start everything (Docker — recommended)

```bash
docker compose up -d          # app + monitoring; build with --build after code changes
docker compose ps             # all services should be healthy
```

The stack reads config from a **gitignored `.env`** (secrets + tuning). There is
no `.env.example` checked in — the compose file carries sane defaults via
`${VAR:-default}`, so `docker compose up -d` works without a `.env`, but the real
deployment values (JWT secret, Redis password, match-server sizing) live in `.env`.

### Local URLs

| Service | URL | Notes |
|---|---|---|
| Frontend (Vite) | http://localhost:5173 | admin/player UI (`Frontend-admin/`) |
| Backend API | http://localhost:3000 | REST API |
| **API docs (Swagger UI)** | **http://localhost:3000/api-docs/** | served from [openapi.yaml](openapi.yaml); local only |
| Match server | http://localhost:3001 | socket.io + `/health`, `/metrics` |
| Nginx (edge) | http://localhost:8090 | routes by `Host` to backend/match/frontend |
| Grafana | http://localhost:3003 | admin/admin, "QuizUP Overview" |
| Prometheus | http://localhost:9090 | |
| Loki | http://localhost:3100 | (127.0.0.1 only) |
| cAdvisor | http://localhost:8088 | per-container stats (Linux host only) |
| Postgres | localhost:5433 | user/db `quizup_user`/`quizup_db` |
| Redis | 127.0.0.1:6379 | password-protected |
| Adminer / Redis Commander | :8080 / :8081 | optional, profile-gated (not up by default) |

### Health checks

```bash
curl -s localhost:3000/health   # backend  → {"status":"OK",...,"environment":"production"}
curl -s localhost:3001/health   # match    → {"status":"OK",...,"workers":{...}}
```

---

## 2. API documentation

Interactive **Swagger UI** is always mounted by the backend:

- **http://localhost:3000/api-docs/** (note the trailing slash)
- Source of truth: [`docs/openapi.yaml`](openapi.yaml) (OpenAPI 3.0). Edit that file
  and restart the backend to update the docs.
- Real-time (socket.io) events are specified separately in [`docs/socket_spec.md`](socket_spec.md).

> API docs are **not exposed through the prod tunnel** — nginx only proxies
> `/api/*` (and `/health`) on `api.quizdash.dpdns.org`, so `/api-docs` returns 502
> publicly by design. Reach it locally, or add an nginx `location /api-docs`
> proxy if you deliberately want it public.

---

## 3. Database: schema & seeding

Schema is managed by **Sequelize sync** at startup (models in `backend/src/models`),
not SQL migrations — `NODE_ENV=production` uses `sync({ force:false })` (create
missing tables only; never alters/drops). On a **fresh empty DB** the backend
auto-seeds categories/quizzes.

One-off SQL migrations that sync can't express live in `backend/src/migrations/`
and are applied manually, e.g. the match unique-constraint migration:

```bash
docker cp backend/src/migrations/add-match-unique-constraints.sql quizup_postgres:/tmp/m.sql
MSYS_NO_PATHCONV=1 docker exec quizup_postgres psql -U quizup_user -d quizup_db -f /tmp/m.sql
```

Seeding helpers (backend `package.json`): `npm run db:setup`, `seed:quick`,
`seed:massive`. For **load-test users**, bulk-insert directly — see
[STRESS_TESTING.md §1](STRESS_TESTING.md).

---

## 4. Run without Docker (local dev)

```bash
# Backend API  (terminal 1)
cd backend && npm install && npm run dev            # ts-node-dev, src/server.ts

# Match server (terminal 2)
cd backend && npm run dev:match:pool                # src/matchServerMaster.ts (cluster master + workers)

# Frontend     (terminal 3)
cd Frontend-admin && npm install && npm run dev     # Vite on :5173
```

Postgres and Redis still need to be running (either `docker compose up -d postgres redis`
or local installs) with matching `.env` connection settings. Production build:
`npm run build` then `npm start` (API) / `npm run start:match:pool` (match server).

---

## 5. Prod / public access (Cloudflare Tunnel)

Public traffic reaches this stack through a **Cloudflare Tunnel** (`cloudflared`),
which replaced the old Tunnelmole/LocalTunnel flow. cloudflared runs as a **host
process** (not a container) and forwards each hostname to a local port:

| Public URL | → local origin |
|---|---|
| `https://quizdash.dpdns.org` | frontend `:5173` |
| `https://api.quizdash.dpdns.org` | nginx `:8090` → backend |
| `https://match.quizdash.dpdns.org` | match server `:3001` (direct, for WebSocket) |

Start the tunnel (config at `~/.cloudflared/config.yml`):

```bash
cloudflared tunnel --config ~/.cloudflared/config.yml run
# durable option (survives reboot):  cloudflared service install
```

Verify:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://api.quizdash.dpdns.org/health    # 200
curl -s -o /dev/null -w '%{http_code}\n' https://match.quizdash.dpdns.org/health  # 200
```

Full setup (DNS, credentials, `cloudflared tunnel create`): [CLOUDFLARE_TUNNEL_SETUP.md](../CLOUDFLARE_TUNNEL_SETUP.md).

### If the prod URLs return 502

1. **cloudflared down?** (host process) → start it (above). If they return a
   Cloudflare 1033 page, the tunnel definitely isn't connected.
2. **nginx has a stale upstream IP.** nginx resolves `quizup_backend`/`quizup_matchserver`
   at load time and caches the IP; after you `docker compose up -d`/restart those
   containers they get new IPs and nginx keeps hitting the old one → 502. Fix:
   ```bash
   docker compose restart nginx
   ```
   (Confirm the origin is fine first: `curl -H 'Host: api.quizdash.dpdns.org' localhost:8090/health`.)

---

## 6. Match-server capacity & tuning

The match server is **1 master (holds all sockets) + up to 4 cluster workers
(hold match state)**. Sizing lives in `.env` (defaults in `docker-compose.yml`):

| Knob | Default | Meaning |
|---|---|---|
| `MAX_WORKERS` | 4 | worker processes (~1 per core) |
| `MAX_MATCHES_PER_WORKER` | 6000 | **total concurrent-match cap = 4 × 6000 = 24,000** |
| `MATCHSERVER_MEMORY_LIMIT` | 8G | memory is the concurrent-match ceiling (~80 MiB / 1000 matches) |
| `MATCHSERVER_CPU_LIMIT` | 3.0 | matches are I/O-idle; steady-state hold is CPU-light |
| `MATCHSERVER_NODE_OPTIONS` | `--max-old-space-size=1536` | per-process V8 heap cap — **required** so the 5 processes in one cgroup don't each auto-size and OOM |

Change values in `.env`, then `docker compose up -d matchserver`. To validate a
new ceiling, see [STRESS_TESTING.md](STRESS_TESTING.md). Beyond the cap, new
matches are refused with `NO_AVAILABLE_WORKERS` (fail-loud, by design).

---

## 7. Monitoring & logs

- **Grafana** http://localhost:3003 (admin/admin) → "QuizUP Overview".
- **Match-server metrics:** `curl -s localhost:3001/metrics` — key series:
  `matchserver_active_matches_total`, `matchserver_connected_users`,
  `matchserver_worker_matches{worker_id,status}`,
  `matchserver_worker_event_loop_lag_seconds` (health signal; ~0.02 s idle).
- **Structured logs** → JSON under `./logs/{backend,matchserver}` → Promtail → Loki.
  Query in Grafana Explore: `{service="matchserver"} | json | event="answer_submitted"`.
- **Per-container CPU/mem/net:** `docker stats` (cAdvisor resolves container names
  only on a Linux host).
