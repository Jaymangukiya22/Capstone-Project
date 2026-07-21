# Stress Testing the Match Server

How to load-test QuizUP's real-time match server (`backend/scripts/loadtest.js`):
seed users, ramp thousands of concurrent 2-player matches across many quizzes,
watch the system, and verify correctness at scale.

- **Harness:** [`backend/scripts/loadtest.js`](../backend/scripts/loadtest.js)
- **What it exercises:** `POST /api/friend-matches` (create) on the backend, then
  the full socket.io match flow on the match server (authenticate → join by code
  → ready → play → complete), with per-match Postgres persistence.
- **Verified ceiling (4-core / 16 GB box, this stack):** the match server holds
  **10–13 k concurrent matches on a 2–3 CPU / 8 GiB slice at flat ~22–27 ms
  event-loop lag**; the configured cap is **24,000** (`MAX_WORKERS 4 ×
  MAX_MATCHES_PER_WORKER 6000`). Beyond the cap, new matches are refused loud
  (`NO_AVAILABLE_WORKERS`), never silently degraded.

---

## 1. Prerequisites

```bash
docker compose up -d                     # whole stack + monitoring
curl -s localhost:3001/health            # match server master: {"status":"OK",...}
curl -s localhost:3000/health            # backend
```

The harness **mints its own JWTs** (shared `JWT_SECRET`), so it bypasses the
login rate limiter — but the user IDs it uses must already exist and be active.

### Seed users (required before large runs)

Each match needs 2 distinct users, so `N` concurrent matches needs `2N` users.
Seed them in bulk **directly in Postgres** — do NOT go through the rate-limited
register endpoint. This inserts IDs 1..44000 worth of active players (idempotent
range — adjust the `generate_series` bounds to extend):

```sql
INSERT INTO users (id, username, email, password_hash, role, elo_rating,
  total_matches, wins, losses, is_active, created_at, updated_at)
SELECT g, 'loadu_'||g, 'loadu_'||g||'@load.test',
  '$2b$10$1oymxprKVKpNgLy0ajiDTOD15uYW9QXlhIGBfDo208Ls68nsyu2qy',  -- any valid bcrypt hash
  'PLAYER', 1200, 0, 0, 0, true, now(), now()
FROM generate_series(1, 44000) g
ON CONFLICT (id) DO NOTHING;
SELECT setval('users_id_seq', 44000);   -- keep the sequence ahead of seeded IDs
```

Run it:

```bash
docker cp seed.sql quizup_postgres:/tmp/seed.sql
MSYS_NO_PATHCONV=1 docker exec quizup_postgres \
  psql -U quizup_user -d quizup_db -f /tmp/seed.sql
```

> **Match `i` in a generator uses users `2i-1+USER_OFFSET` and `2i+USER_OFFSET`.**
> Give each parallel generator a `USER_OFFSET` range that doesn't overlap.

### Quizzes

52 quizzes with ≥5 questions exist, **IDs 102–153**, 10 questions each. Confirm:

```sql
SELECT string_agg(id::text, ',') FROM (
  SELECT q.id FROM quizzes q JOIN quiz_questions qq ON qq.quiz_id=q.id
  GROUP BY q.id HAVING count(qq.id) >= 5 ORDER BY q.id) s;
```

---

## 2. The harness

### Env vars

| Var | Default | Meaning |
|---|---|---|
| `NUM_MATCHES` | 1000 | matches this generator creates |
| `USER_OFFSET` | 0 | user-id offset (for non-overlapping parallel generators) |
| `MODE` | `hold` | `hold` = idle sockets (max-concurrency/resource test); `play` = both players answer every question to completion (throughput + persistence test) |
| `QUIZ_IDS` | — | spread matches across quizzes round-robin: comma list and/or ranges, e.g. `102-153` or `102,110,120-125`. Falls back to `QUIZ_ID` |
| `QUIZ_ID` | 146 | single quiz (used only if `QUIZ_IDS` unset) |
| `BATCH` | 25 | matches established per wave |
| `BATCH_PAUSE_MS` | 250 | pause between waves |
| `HOLD_MS` | 45000 | how long to hold sockets after the ramp |
| `API_URL` / `MATCH_URL` | localhost | backend / match-server base URLs |
| `JWT_SECRET` | compose default | must match the server's |
| `JOIN_WAIT_MS` / `READY_WAIT_MS` | 120/220 (400/600 over TLS) | join-handshake pacing; auto-relaxed for https/wss latency |
| `CONNECT_TIMEOUT_MS` | 20000 (30000 over TLS) | socket connect timeout |
| `SOCKET_PATH` | `/socket.io` | socket.io path override |
| `INSECURE_TLS` | — | `1` = skip cert verification (self-signed origin only) |

### Reading the output

```
=== LOAD (hold): 2500 matches / 5000 users via http://matchserver:3001 | 52 quizzes (102..153) | join/ready 120/220ms ===
  created=2500 connected=5000 started=2480 completed=0 errors=0 | rss=163MB | 129s
```

`created` = friend-match rows made, `connected` = sockets authenticated,
`started` = matches that reached `match_started`, `errors` = create/connect
failures. `errors` should be **0** below the cap.

---

## 3. Running it

### A. In-container (recommended — finds the real server ceiling)

Driving load **from the host caps at ~2000 connections** — that's Docker
Desktop's port proxy on Windows/WSL2, not the server. Always run the generator
in-container on the compose network (also the normal path on a Linux prod host):

```bash
MSYS_NO_PATHCONV=1 docker run --rm --name loadgen \
  --network quizup_quizup_network --ulimit nofile=65535:65535 \
  -v /d/Capstone-Project/backend:/app -w /app \
  -e MATCH_URL=http://matchserver:3001 -e API_URL=http://backend:3000 \
  -e NUM_MATCHES=2500 -e USER_OFFSET=0 -e MODE=hold -e HOLD_MS=120000 \
  -e QUIZ_IDS=102-153 \
  node:20-alpine node --max-old-space-size=3072 scripts/loadtest.js
```

### B. Parallel generators for high concurrency

One generator is single-threaded; to push toward the 24 k cap, run several with
**distinct `USER_OFFSET` ranges** (4 × 4000 = 16 000 matches / 32 000 users):

```bash
for off in 0 8000 16000 24000; do
  MSYS_NO_PATHCONV=1 docker run -d --rm --name loadgen_$off \
    --network quizup_quizup_network --ulimit nofile=65535:65535 \
    -v /d/Capstone-Project/backend:/app -w /app \
    -e MATCH_URL=http://matchserver:3001 -e API_URL=http://backend:3000 \
    -e NUM_MATCHES=4000 -e USER_OFFSET=$off -e MODE=hold -e HOLD_MS=240000 \
    -e QUIZ_IDS=102-153 \
    node:20-alpine node --max-old-space-size=3072 scripts/loadtest.js
done
```

### C. Against the prod Cloudflare URLs

Verifies the public path (Cloudflare → cloudflared → nginx/match server). TLS and
timing are handled automatically. **Keep it modest** — Cloudflare rate-limits and
this is the real public endpoint; heavy ceiling tests belong in-container.

```bash
MSYS_NO_PATHCONV=1 docker run --rm --network quizup_quizup_network \
  -v /d/Capstone-Project/backend:/app -w /app \
  -e MATCH_URL=https://match.quizdash.dpdns.org \
  -e API_URL=https://api.quizdash.dpdns.org \
  -e NUM_MATCHES=40 -e MODE=play -e HOLD_MS=70000 -e QUIZ_IDS=102-153 \
  node:20-alpine node scripts/loadtest.js
```

The prod path needs the tunnel up (`cloudflared tunnel run`) — see
[CLOUDFLARE_TUNNEL_SETUP.md](../CLOUDFLARE_TUNNEL_SETUP.md) and §7 gotchas.

---

## 4. Monitoring during a run

- **Per-container CPU/mem/net:** `docker stats` (cAdvisor only resolves container
  names on a Linux host; on Docker Desktop use `docker stats`).
- **Match-server metrics** (`:3001/metrics`, Prometheus text):
  - `matchserver_active_matches_total`, `matchserver_connected_users`
  - `matchserver_worker_matches{worker_id,status}` — per-worker balance
  - `matchserver_worker_event_loop_lag_seconds{worker_id}` — the health signal;
    ~0.02 s is idle-healthy, sustained climb = the event loop is saturating
  - `matchserver_matches_completed_total`, `matchserver_answers_total{result}`,
    `matchserver_questions_advanced_total{reason}`
- **Grafana:** http://localhost:3003 (admin/admin, "QuizUP Overview").
- **Structured logs → Loki:** `{service="matchserver"} | json | event="answer_submitted"`.

Quick one-liner while a run ramps:

```bash
curl -s localhost:3001/metrics | grep -E \
  '^matchserver_(active_matches_total|connected_users|worker_matches|worker_event_loop_lag)'
```

---

## 5. Verify correctness at scale (MODE=play)

Take a match-id watermark before the run, then confirm every match reached a
terminal state with the right row counts. Columns are camelCase → double-quote them.

```sql
-- watermark BEFORE the run:
SELECT max(id) FROM matches;

-- after (replace 12345 with the watermark):
-- (1) all terminal, no duplicate matches rows (unique matchId enforced):
SELECT status, count(*) FROM matches WHERE id>12345 GROUP BY status;
SELECT count(*) total, count(DISTINCT "matchId") distinct_mid FROM matches WHERE id>12345;

-- (2) exactly 2 FINISHED players per completed match, no duplicate player rows:
SELECT mp_rows, mp_users, count(*) FROM (
  SELECT m.id, count(mp.id) mp_rows, count(DISTINCT mp."userId") mp_users
  FROM matches m JOIN match_players mp ON mp."matchId"=m.id
  WHERE m.id>12345 AND m.status='COMPLETED' GROUP BY m.id) s
GROUP BY mp_rows, mp_users;                       -- expect a single row: 2 | 2

-- (3) answers == matches × 2 players × questions (10):
SELECT ma_count, count(*) FROM (
  SELECT m.id, count(a.id) ma_count FROM matches m
  LEFT JOIN match_answers a ON a."matchId"=m.id
  WHERE m.id>12345 AND m.status='COMPLETED' GROUP BY m.id) s
GROUP BY ma_count ORDER BY ma_count;              -- expect all rows at ma_count=20

-- (4) winners set:
SELECT count(*) FILTER (WHERE "winnerId" IS NOT NULL) with_winner, count(*) total
FROM matches WHERE id>12345 AND status='COMPLETED';
```

A healthy result: every completed match has **exactly 2 player rows and 20
answers**, `total = distinct_mid` (no duplicate `matches` rows), and abandoned
matches show as `CANCELLED` (reaped after `STALE_MATCH_TIMEOUT_MS`), never stuck
`IN_PROGRESS`.

---

## 6. Capacity & tuning

The match server is **1 master (holds all sockets) + N cluster workers (hold
match state)**. Capacity and resource limits live in `.env` (gitignored;
`docker-compose.yml` carries the defaults):

| Knob | Default | Effect |
|---|---|---|
| `MAX_WORKERS` | 4 | worker processes (≈1 per core) |
| `MAX_MATCHES_PER_WORKER` | 6000 | per-worker cap → **total cap = 4×6000 = 24 000** |
| `MATCHSERVER_MEMORY_LIMIT` | 8G | memory is the concurrent-match ceiling (~80 MiB / 1000 matches) |
| `MATCHSERVER_CPU_LIMIT` | 3.0 | matches are I/O-idle; steady-state hold is CPU-light, ramp/churn is heavier |
| `MATCHSERVER_NODE_OPTIONS` | `--max-old-space-size=1536` | per-process V8 heap cap; **required** so the 5 processes in one cgroup don't each auto-size and collectively OOM |

To push higher: raise `MAX_MATCHES_PER_WORKER` **and** `MATCHSERVER_MEMORY_LIMIT`
together (and re-check the heap cap sums to < the mem limit), then
`docker compose up -d matchserver`.

---

## 7. Gotchas

- **Host ~2000-connection cap** — Docker Desktop's port proxy, not the server.
  Run generators in-container (§3A).
- **The single-box ramp ceiling is the generators, not the server.** In-container
  generators + backend + Postgres + Redis share the 4 host cores, so on one box
  you can only *accumulate* ~10–13 k concurrent before the ramp equals the drain
  — the match server itself stays at flat lag with memory to spare. The 24 k cap
  is reachable with **external** load (real clients don't consume the server's
  cores).
- **nginx caches upstream IPs.** After you restart `backend` or `matchserver`,
  they get new container IPs but nginx keeps the old ones → **502** on the prod
  URLs. Fix: `docker compose restart nginx`.
- **cloudflared is a host process**, not a container. If the prod URLs 502/1033,
  the tunnel is down: `cloudflared tunnel --config ~/.cloudflared/config.yml run`
  (routes `api.`→nginx:8090, `match.`→matchserver:3001, frontend→:5173).
- **Cap rejection is not an error.** Past 24 k, `matchserver_worker_matches` pins
  at the per-worker cap and the log shows `Worker pool at capacity` /
  `No available workers` — that's the fail-loud gate, by design.
- **Clean up generators:** `docker rm -f $(docker ps -q --filter name=loadgen)`.
- **Reset the DB between big correctness runs** if the accumulated rows get noisy
  (all load rows are synthetic `loadu_*` / `mqload_*` users).
