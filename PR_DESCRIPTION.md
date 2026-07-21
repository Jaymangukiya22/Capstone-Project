# PR: Reliability, security, data-integrity & capacity overhaul of the match server

> Paste the title + body below into GitHub. No `gh` needed — open the compare page:
> **https://github.com/Jaymangukiya22/Capstone-Project/compare/main...fix/audit-reliability-and-security**
> (base: `main` ← compare: `fix/audit-reliability-and-security`).

**Title:** `Reliability, security, data-integrity & capacity overhaul of the real-time match server`

---

## Summary

This branch takes the real-time match server from "works in a demo" to "survives
5k–24k concurrent matches with verified correctness." It bundles a security audit
and its fixes, a match-reliability pass, a **data-integrity fix** for duplicate
DB rows found under concurrent load, a **memory/capacity optimization** (cap
raised 10k → 24k), an observability rebuild, frontend perf, and a reusable
load-test harness with full docs. Findings and their fix status are tracked in
[`AUDIT_FINDINGS.md`](AUDIT_FINDINGS.md); removals in [`REMOVED.md`](REMOVED.md);
the full narrative in [`SESSION_HANDOFF.md`](SESSION_HANDOFF.md).

## What's in it

### 🔒 Security
- Match-server socket `authenticate` now **verifies the JWT** (was trusting a
  client-supplied `userId` → full impersonation).
- `/api/friend-matches` and `/api/matches` were unauthenticated (the latter had
  its auth middleware commented out → IDOR on `pending/:userId`) — both closed.
- Redis was passwordless on `0.0.0.0` → password + bound to `127.0.0.1`.
- Auth hardening: register TOCTOU, login user-enumeration + timing, native
  `bcrypt`, rate limiting, Redis auth cache.

### 🎯 Match reliability (M1–M9)
- **Server-side question timeout** — root-cause fix for "match hangs when nobody
  answers"; force-advances instead of stalling.
- Map/Set leak cleanup on every match exit path; worker capacity gate;
  worker-death Redis cleanup + graceful shutdown; reconnect payload carries
  opponent state; `endMatch` DB writes moved off the critical path; coordinated
  stale-match reaping.

### 🧮 Data integrity — duplicate DB rows under concurrent play (M10/M11) — **new, includes a migration**
- **Root cause:** the match server's fire-and-forget persistence did non-atomic
  `findOne`-then-`create` with **no unique constraint**, so concurrent writes for
  one match raced to INSERT twin rows. A play-mode batch showed **~39 % of
  `matches` rows duplicated** (the twin stuck at `IN_PROGRESS` forever) plus
  duplicate `match_players` rows.
- **Fix:** unique constraints on `matches.matchId` and `match_players(matchId,userId)`;
  `ensureDbMatch`/`upsertDbPlayer`/`endMatch` converted to atomic `findOrCreate`;
  a per-match `dbIdPromise` so both players' first answers share one create.
- **M11:** `terminateStaleMatch` now reconciles abandoned matches to `CANCELLED`
  (they used to sit `IN_PROGRESS` forever).
- **M12a:** graceful worker scale-downs no longer log as `error` "Worker died".

### ⚡ Performance & capacity (max concurrent matches)
- **Shared frozen questions:** one deep-frozen cached array per quiz instead of a
  deep copy per match (questions are read-only) → less worker memory + less GC
  churn at ramp.
- **Slim Redis snapshot:** store a `totalQuestions` count, not the full questions
  array (hydration reloads by `quizId`) → ~40 % less Redis memory per match.
- **Resource re-tune:** matchserver mem 2G→8G, cpu 2→3, `MAX_MATCHES_PER_WORKER`
  2500→6000 (**cap 10k → 24k**), explicit `--max-old-space-size=1536` per Node
  process (1 master + 4 workers share one cgroup — without a cap they can each
  auto-size and collectively OOM).

### 📊 Observability
- Real business metrics (the old "active users" was `Math.random()`; custom
  metrics were served on a registry Prometheus never scraped), per-user
  time-spent structured logs → Loki via Promtail, correlation IDs (requestId +
  per-match traceId), **one** clean Grafana dashboard (deleted 21 duplicates),
  cAdvisor for per-container CPU/mem/net. Fixed an `endMatch` re-entrancy bug
  (matches completing twice → double DB write) surfaced by the new metric.

### 🖥️ Frontend
- Route-based code-splitting, deferred `xlsx`/`papaparse` (438 kB chunk now lazy),
  strip `console.*` in prod, client-side routing for non-match nav, match
  re-render fixes. Match flow deliberately left on `window.location` so the
  socket/guard/sessionStorage flow is unchanged.

### 🧪 Load testing & docs
- Reusable harness [`backend/scripts/loadtest.js`](backend/scripts/loadtest.js):
  `hold`/`play` modes, `QUIZ_IDS` round-robin across quizzes, parallel generators
  via `USER_OFFSET`, and **prod Cloudflare URL support** (auto-relaxed TLS timing,
  `INSECURE_TLS`, `SOCKET_PATH`).
- New docs: [`docs/STRESS_TESTING.md`](docs/STRESS_TESTING.md),
  [`docs/RUNNING.md`](docs/RUNNING.md) (start the stack, API docs, prod tunnel,
  tuning, monitoring). README de-staled (Tunnelmole → Cloudflare, correct npm
  scripts, API-docs URL).

### 🧹 Cleanup
- Removed dead `Backend/` (capital duplicate), `matchServer-enhanced.ts`,
  tunnelmole scripts, redundant deploy scripts, dead OTel/InfluxDB, and
  deployment/docs sprawl. See [`REMOVED.md`](REMOVED.md).

## ✅ Verification (live, not just reasoned)

- **Correctness at scale:** a clean 300-match `play` batch on the fixed build →
  **300/300 distinct matchIds, exactly 2 FINISHED players + 20 answers each, 0
  duplicates, all with winners** (pre-fix: ~39 % duplicated). 37 killed-mid-play
  matches reaped to `CANCELLED`. **57k+ matches** pushed cumulatively across the
  capacity runs with **0 duplicate rows** — the constraint holds under load.
- **Capacity (4-core / 16 GB box):** peak **~13,000 concurrent matches at flat
  ~27 ms event-loop lag**, matchserver at ~12 % of its 8 GiB; per-match memory
  ~78 MiB/1000 (was ~92), redis ~5.3 MiB/1000 (was ~9). The 24k cap is the config
  limit, not a hardware wall; single-box concurrency is bound by the co-located
  generator ramp, not the server.
- **Prod path:** a 40-match `play` batch through the public Cloudflare URLs
  (`https://api|match.quizdash.dpdns.org`) → 40 COMPLETED, 80/80 sockets, 0
  errors, 20 answers each, 0 duplicates.

## ⚠️ Deploy / migration notes

1. **Run the DB migration** [`backend/src/migrations/add-match-unique-constraints.sql`](backend/src/migrations/add-match-unique-constraints.sql)
   **once per environment before (or with) this deploy.** It FK-safely de-dupes
   existing `matches`/`match_players` rows, then adds the unique indexes the new
   code relies on. On a dirty DB the indexes can't be created until the dupes are
   removed, so apply it first.
2. **Config:** match-server sizing moved up (`MAX_MATCHES_PER_WORKER=6000`,
   `MATCHSERVER_MEMORY_LIMIT=8G`, `MATCHSERVER_CPU_LIMIT=3.0`,
   `NODE_OPTIONS=--max-old-space-size=1536`). Real values live in the gitignored
   `.env`; `docker-compose.yml` carries matching defaults. Adjust for the target
   box before deploying.
3. **Ops gotchas** (documented in [`docs/RUNNING.md`](docs/RUNNING.md)): after
   restarting `backend`/`matchserver`, **restart nginx** (it caches upstream
   container IPs → otherwise 502). The prod URLs need `cloudflared` running (host
   process).

## Notes for reviewers
- The branch also carries earlier feature work (auto-matchmaking, reconnection,
  CSV/XLSX import fixes, Safari blank-screen fix). The reliability/security/perf
  commits are the bulk and the focus of review.
- Schema is Sequelize `sync` (no ORM migration framework); the one SQL migration
  above is applied manually — that's the established pattern (`backend/src/migrations/`).
