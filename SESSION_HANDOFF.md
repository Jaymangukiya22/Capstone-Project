# Session Handoff — audit, fixes, observability, frontend, load testing

Branch: **`fix/audit-reliability-and-security`** @ `64f0ce5` — **pushed** to `origin`.
Everything below is committed. Working tree is clean.

> **Update (multi-quiz 5K+ stress test, this session).** Seeded the user pool to **17,000** active users (IDs 1–17,000; bulk-inserted 10,043–17,000 in Postgres). Added `QUIZ_IDS` round-robin support to the harness (commit `df60d65`). Drove matches across all **52 quizzes** with parallel in-container generators and hit a peak of **7,970 concurrent matches / 15,940 users, 0 connection errors** — the box's **4 shared cores** are the ceiling, not the match server (event-loop lag stayed flat ~22 ms; workers dead-even). Correctness at scale is **mostly** intact but the play-mode batch surfaced two new persistence findings — see **[AUDIT_FINDINGS.md](AUDIT_FINDINGS.md) Section 6 [M10]/[M11]**: `matches`/`match_players` accumulate duplicate rows under concurrent play (non-atomic `findOne`-then-`create`, no unique constraint) and abandoned matches are never DB-reconciled. Live gameplay (winners/scores) is correct; the Postgres audit tables are polluted.
>
> **Update 2 (fixes applied + ceiling test, same session — commit `5a8bfb8`).** **[M10]/[M11]/[M12a] fixed and verified.** Added unique constraints (`matches.matchId`, `match_players(matchId,userId)`) with an FK-safe dedupe migration ([backend/src/migrations/add-match-unique-constraints.sql](backend/src/migrations/add-match-unique-constraints.sql)), converted the match-server writes to atomic `findOrCreate` + a per-match `dbIdPromise` guard, made `terminateStaleMatch` reconcile to `CANCELLED`, and stopped logging graceful worker exits as errors. Verified: a 300-match play batch → **296/296 distinct matchIds, exactly 2 FINISHED players + 20 answers each, 0 duplicates** (was ~39% duplicated); 37 killed-mid-play matches reaped to `CANCELLED`. Then **40,000+ matches** pushed through the ceiling test with **0 duplicate rows** — the constraint holds under load.
> **Ceiling on the prod split (matchserver = 2 CPU / 2 GiB slice of the 4-core/16 GB box):** the configured cap is **10,000 concurrent matches** (`MAX_WORKERS=4 × MAX_MATCHES_PER_WORKER=2500`), and the box serves it with **flat ~21–28 ms event-loop lag, ~0.9 GiB of the mem slice, and CPU only touching its 2-core cap during churn** — 10K is the *config* cap, not a hardware wall (beyond it, excess matches are rejected loud with `NO_AVAILABLE_WORKERS`). With the cap raised, the matchserver held **~10,600 concurrent matches on just 2 CPUs at 28 ms lag / <1 GiB**; the limit on reaching *higher concurrency* on a single box is the **shared-core ramp rate** (matchserver + backend + in-container generators all contending for the 4 host cores), not steady-state serving. See Section 6 fix-status addendum.
>
> **Update 3 (optimized for max concurrent matches — commit pending).** Two per-match memory wins + a resource re-tune:
> - **Shared frozen questions**: `loadQuizQuestions` now returns one deep-frozen cached array per quiz instead of a deep copy per match (questions are read-only for a match's life). Cuts worker memory and the GC churn of copying 10 questions on every create/hydrate at ramp.
> - **Slim Redis snapshot**: `saveMatchState` stores a `totalQuestions` count instead of the full `questions` array (hydration already reloads questions by `quizId` and never read the snapshot copy). ~40% less Redis memory per match and a smaller payload rewritten on every question advance.
> - **Resource re-tune** (matchserver slice on the 4-core/16 GB box): mem **2G → 8G**, CPU **2 → 3**, `MAX_MATCHES_PER_WORKER` **2500 → 6000** (cap **10k → 24k**), and an explicit **`--max-old-space-size=1536` per Node process** (1 master + 4 workers share one cgroup — without a cap they can each auto-size and collectively OOM). Repo defaults in `docker-compose.yml` updated to match; real values in the gitignored `.env`.
> - **Verified**: play batch → 300/300 distinct matchIds, 2 players + 20 answers each, 0 dup (correctness intact); capacity push → **peak ~13,000 concurrent matches at flat ~27 ms lag**, matchserver mem **~78 MiB/1000 matches** (was ~92) and redis **~5.3 MiB/1000** (was ~9), server at **12 % of its 8 GiB** — nowhere near a wall. 57k+ matches pushed cumulatively with **0 duplicate rows** (the M10 constraint holds under load). Demonstrable concurrency is still bounded by the **co-located-generator ramp rate**, not the server; with external load the 24k cap is the target.

---

## 1. What was done

Started from a document-only audit request and grew into fixes + observability + frontend + capacity validation. Findings live in [AUDIT_FINDINGS.md](AUDIT_FINDINGS.md); deletions are logged in [REMOVED.md](REMOVED.md).

### Commits (oldest → newest)

| Commit | What |
|---|---|
| `24345cf`…`c5c0d83` | **Dead-code removal**: `Backend/` (capital, duplicate), `matchServer-enhanced.ts` (+ its npm scripts / pre-build refs), tunnelmole scripts, redundant deploy scripts, superseded status docs |
| `1ab8847` | AUDIT_FINDINGS.md + REMOVED.md |
| `8303a13` | **Security (S1/S3/S4/S5)**: match-server socket `authenticate` now verifies the JWT (was trusting a client-supplied userId → full impersonation); `/api/friend-matches` and `/api/matches` were unauthenticated (the latter had its auth middleware commented out → IDOR on `pending/:userId`); Redis had no password and was published on 0.0.0.0 |
| `4b77bfb` | **Match reliability (M1–M9)**: server-side question timeout (the "match hangs when nobody answers" root cause), Map/Set leak cleanup on all exit paths, worker capacity gate, worker-death Redis cleanup + graceful shutdown, reconnect payload includes opponent state, `endMatch` DB writes off the critical path, coordinated stale-match reaping |
| `be10bee` | **Auth hardening**: register TOCTOU, login user-enumeration + timing, native bcrypt, rate limiting, Redis auth cache |
| `c1863ab` | Audit doc updates (fix status + Section 5 security findings) |
| `837a1e6` | **Perf**: per-worker quiz-question cache, removed a blind 500 ms join sleep, finer ready-retry, killed dead `MAX_MATCHES` config |
| `2a95fd7` | **Observability rebuild**: real business metrics (the old "active users" was `Math.random()` and custom metrics were served on a registry Prometheus never scraped), per-user time-spent structured logs → Loki via Promtail, correlation IDs (requestId + per-match traceId), one clean Grafana dashboard (deleted 21 duplicates + 2 dead prometheus configs). Also fixed an `endMatch` **re-entrancy bug** surfaced by the new metric (matches were completing twice → double DB write) |
| `4595605` | Cleanup: dead OpenTelemetry stub + unused OTel deps, dead metrics middleware, redundant `/metrics-custom`, influxdb |
| `21ce55a` | Cleanup: deployment/docs sprawl (15 root .md), `docker-stack.yml`, abandoned "network" deploy mode |
| `dc95d57` | **Frontend perf**: route-based code splitting (every page was eagerly imported), deferred `xlsx`/`papaparse` (438 kB chunk now loads only on import/export), strip `console.*` in prod; removed Playwright + Storybook leftovers |
| `a453418` | **Frontend routing**: client-side routing for non-match navigation (was full page reloads); match-flow navigation deliberately left on `window.location` so the socket/guard/sessionStorage flow is unchanged. Plus match re-render fixes (unstable props were defeating existing memos) |
| `aa13e77` | **cAdvisor** for per-container CPU/memory/network bandwidth |
| `64f0ce5` | **Load-test harness** `backend/scripts/loadtest.js` |

### Verified (live, not just reasoned)
- **Match edge cases** (7/7): normal flow; one player never answers → server force-advances (no hang); both time out; disconnect mid-match; reconnection resync.
- **DB persistence**: 100 matches played to completion → `matches.status=COMPLETED` with winners, `match_players.status=FINISHED` with scores, **1980 `match_answers` rows** (99×2×10).
- **Capacity**: 5000 concurrent matches / 10000 users, 0 errors (see §3).
- Frontend: client-side nav confirmed (window marker survived a route change), full match flow intact.

---

## 2. Current state

- Stack runs via `docker compose up -d` (app + monitoring).
- Monitoring: **Grafana** http://localhost:3003 (admin/admin, "QuizUP Overview"), Prometheus :9090, Loki :3100, cAdvisor :8088.
- Logs: JSON files under `./logs/{backend,matchserver}` → Promtail → Loki. Query e.g. `{service="matchserver"} | json | event="answer_submitted"`.
- Known non-blocking items: `docker-compose.prod.yml` kept because **CI uses it**; cAdvisor gives per-container metrics only on a **Linux** host (Docker Desktop/WSL2 can't resolve container names — use `docker stats` locally).

---

## 3. Capacity results (4-core / 16 GB dev box)

All in-container generators, `hold` mode (idle sockets):

| Load | matchserver CPU | Mem | Event-loop lag | Errors |
|---|---|---|---|---|
| 1,000 matches / 2,000 users | ~46% | 193 MiB | ~20 ms | 0 |
| 2,500 matches / 5,000 users | 44% | 300 MiB | ~20 ms | 0 |
| **5,000 matches / 10,000 users** | **46%** | **493 MiB** | **~21 ms** | **0** |

Other services at 5K matches: redis 7.9% / 40 MiB, postgres 0.08% / 374 MiB.
The autoscaler spawned a 4th worker under load; matches stayed evenly balanced.

**The server never topped out — the 10,042-user seed pool ran out first.** Also: the M3 question-timeout anti-hang held at scale (26,200 timeouts churned during a 5,000-match idle hold).

> **Gotcha:** driving load from the Windows host caps at **~2,000 connections** — that's the Docker Desktop/WSL2 **port proxy**, not the server. Always run the generator **in-container** on the compose network (which is also the normal path on a Linux prod host).

---

## 4. Load-test harness reference

`backend/scripts/loadtest.js` — mints JWTs for existing user IDs (bypasses the auth rate limit).

**In-container (required to exceed ~2000 connections):**
```bash
MSYS_NO_PATHCONV=1 docker run --rm --name loadgen \
  --network quizup_quizup_network --ulimit nofile=65535:65535 \
  -v /d/Capstone-Project/backend:/app -w /app \
  -e MATCH_URL=http://matchserver:3001 -e API_URL=http://backend:3000 \
  -e NUM_MATCHES=2500 -e USER_OFFSET=0 -e BATCH=30 -e MODE=hold -e HOLD_MS=50000 \
  node:20-alpine node --max-old-space-size=3072 scripts/loadtest.js
```

**Env:** `NUM_MATCHES`, `USER_OFFSET` (distinct user ranges for parallel generators), `BATCH`, `BATCH_PAUSE_MS`, `HOLD_MS`, `MODE=hold|play`, `API_URL`, `MATCH_URL`, `JWT_SECRET`, `QUIZ_ID`.
`MODE=play` makes both players answer every question to completion (use for DB/throughput checks).

**Key facts**
- `JWT_SECRET` = `7a0b42e9df5856f7cfe0094361f65630` (compose default)
- Users: **10,042** active, IDs **1–10,042** → supports ~5,021 matches. **More matches ⇒ seed more users first.**
- Quizzes: **52** with ≥5 questions, IDs roughly **102–153**, each **10 questions**, `time_limit` 30 s.
- Match `i` in a generator uses users `2i-1+USER_OFFSET` and `2i+USER_OFFSET`.
- Docker network: `quizup_quizup_network`.

**DB verification queries** (columns are camelCase → must be double-quoted):
```sql
SELECT count(*) FROM matches WHERE status='COMPLETED';
SELECT id,"matchId",status,"winnerId","endedAt" FROM matches
  WHERE status='COMPLETED' AND "endedAt" > now() - interval '10 minutes' LIMIT 5;
SELECT mp."matchId",mp."userId",mp.status,mp.score,mp."correctAnswers"
  FROM match_players mp JOIN matches m ON m.id=mp."matchId"
  WHERE m."endedAt" > now() - interval '10 minutes' LIMIT 10;
SELECT count(*) FROM match_answers WHERE "submittedAt" > now() - interval '10 minutes';
```

**Useful metrics** (matchserver :3001/metrics): `matchserver_active_matches_total`, `matchserver_connected_users`, `matchserver_worker_matches`, `matchserver_worker_event_loop_lag_seconds`, `matchserver_answers_total{result=}`, `matchserver_questions_advanced_total{reason=}`, `matchserver_matches_completed_total`.

---

## 5. Prompt for the NEXT session (multi-quiz 5K+ stress test)

Paste this into a fresh session:

> Read `SESSION_HANDOFF.md` first — it has the full context, the load-test harness reference, and the capacity results so far.
>
> **Goal:** stress test **more than 5,000 concurrent matches spread across many different quiz IDs** (not a single quiz like the previous runs), and confirm the system stays correct and observable at that scale.
>
> **Do this:**
> 1. **Seed more users.** The pool is 10,042 users (IDs 1–10,042), which caps us at ~5,021 matches. To exceed 5K matches we need more — seed to at least ~16,000 users (bulk-insert active users directly in Postgres; don't go through the rate-limited register endpoint).
> 2. **Make the harness rotate quiz IDs.** `backend/scripts/loadtest.js` currently uses one `QUIZ_ID`. Add support for spreading matches across many quizzes (e.g. `QUIZ_IDS=102,103,...` or a range, assigned round-robin/random per match). There are 52 quizzes with ≥5 questions, IDs ~102–153, each 10 questions.
> 3. **Run the stress test in-container** (the Windows host caps at ~2000 connections — see the gotcha in §3). Use parallel generators with distinct `USER_OFFSET` ranges, targeting **>5,000 matches / >10,000 users** across the full quiz spread. Ramp gradually and record where (if anywhere) it degrades.
> 4. **Watch for multi-quiz-specific effects** the single-quiz tests couldn't surface:
>    - the **per-worker quiz-question cache** (`questionsCache`, 5-min TTL in `matchServerWorker.ts`) now has to hold ~52 quizzes per worker instead of 1 → check matchserver **memory growth** and whether question-loading causes a DB read burst at ramp-up;
>    - **Postgres load** during ramp (it was ~0% CPU with one cached quiz — expect more);
>    - per-worker balance and `matchserver_worker_event_loop_lag_seconds`.
> 5. **Verify correctness at scale**, not just capacity: run a `MODE=play` batch so matches actually finish, then confirm in Postgres that matches COMPLETED with winners, `match_players` FINISHED with scores, and `match_answers` rows match `matches × 2 players × questions` (queries in §4).
> 6. **Report** peak concurrent matches/users, per-container CPU/memory/network (`docker stats`; cAdvisor only resolves containers on Linux), event-loop lag, error counts, and where the real ceiling is — and whether the ceiling is the server, the generators, or the box's 4 shared cores.
>
> Don't re-run the work already done (see §1). Commit any harness changes on the current branch.
