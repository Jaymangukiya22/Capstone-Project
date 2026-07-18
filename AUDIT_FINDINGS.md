# QuizDash Audit Findings

Branch: `hotfix/error-handeling`, audited against the **working tree** (uncommitted edits included) as of 2026-07-18. Sections 1–2 are analysis only — no match/server logic was changed. Sections 3–4 describe cleanup actions already executed (see commits `24345cf`..`c5c0d83` and [REMOVED.md](REMOVED.md)).

Labels used throughout: **[verified]** — read directly in the working-tree source and confirmed by a second check (grep for callers, Dockerfile trace, etc.); **[inferred]** — my best read of what a mechanism *will* do under a scenario I did not execute; **[remembered]** — restated from the prompt's ground truth, not independently re-derived here.

---

## SECTION 1 — Match server audit (master/worker path)

**[verified]** Production runs `matchServerMaster.ts` + `matchServerWorker.ts` + `services/enhancedWorkerPool.ts`. `backend/Dockerfile`'s `matchserver-master` stage (`CMD ["node", "dist/matchServerMaster.js"]`, line 83) is what `docker-compose.yml`'s `matchserver` service builds (`target: matchserver-master`, line 122). Neither `start.sh` nor `start-server.js` (which reference `matchServer-enhanced.js`) are invoked by any Dockerfile `CMD` — they're copied into images but dead as entrypoints. `matchServer-enhanced.ts` is therefore unreachable in production, confirming the ground truth; it was removed in Section 3. `matchWorkerPool.ts` is entirely commented out (373 lines, zero live code) — also dead, not further audited.

### [M1] `userToMatch` (master) never cleared on match completion
- File/line: `backend/src/services/enhancedWorkerPool.ts:166,211` (`.set()`), `handleMatchCompleted` at 187-208
- Category: memory-leak
- What happens: `handleMatchCreated` and `handlePlayerJoined` both `.set()` into the master-level `userToMatch: Map<number, string>`, but `handleMatchCompleted` — the normal, happy-path exit — never calls `.delete()` on it. The only delete site is `handlePlayerLeft` (line 215), which is unreachable: `matchServerWorker.ts` never sends a `{type:'player_left'}` message to the master, so that handler is dead code.
- Trigger: any match that runs to completion normally (the common case).
- Maps to which reported bug: none/latent — this is a slow leak, not an acute hang.
- Severity: medium, silent (no error surfaces; just grows).
- Blast radius at 6K matches: scales with **unique users over the process lifetime**, not concurrent matches — a long-lived master process under sustained 12K-connection traffic accumulates one stale entry per user per match played, unbounded until process restart.
- Fix sketch: delete the entry (or overwrite is already implicit for repeat players) inside `handleMatchCompleted`, keyed off each player in the completed match.
- How to verify: track `userToMatch.size` via a gauge over a soak test with N unique users playing M matches each; it should plateau near N, not grow toward N×M.

### [M2] `trackedMatches` Set leaks on every exit path except live completion
- File/line: `enhancedWorkerPool.ts:33` (declaration), `.add()` at 170, `.delete()` only at 196
- Category: memory-leak / unbounded-growth
- What happens: `trackedMatches` is only cleaned up inside `handleMatchCompleted` (the message a *live* worker sends). It is never touched by `handleWorkerDeath` (worker killed by the reaper) or `cleanupStaleMatches` (idle-match sweep) — both of those paths remove the match from `matchToWorker`/`matchLastActivity` but leave it in `trackedMatches` forever.
- Trigger: any match that ends via worker crash/reaper-kill or idle-timeout rather than a clean both-players-finish.
- Maps to which reported bug: latent — feeds into #M6/#M9's "matches hang after worker restart" story since it's a symptom of the same missing cleanup path, but by itself it's just a growing Set.
- Severity: medium, silent.
- Blast radius at 6K matches: scales with the *rate of abnormal match endings*, which is exactly what's elevated by the other bugs in this list — a compounding leak, not an independent one.
- Fix sketch: centralize match-teardown into one function called from all three exit paths (`handleMatchCompleted`, `handleWorkerDeath`, `cleanupStaleMatches`) instead of duplicating partial cleanup in each.
- How to verify: force a worker kill (`kill -9` a worker PID) mid-match and confirm `trackedMatches.size` decrements afterward.

### [M3] No server-side fallback for a stalled question — "questions don't advance" root cause
- File/line: `backend/src/matchServerWorker.ts:59` (`questionTimers: Map<string, NodeJS.Timeout>`, declared, **never `.set()` or `.delete()` anywhere in the file**); gating logic at `submitAnswer()` lines 836-846; `nextQuestion()` 860-884
- Category: reconnection-gap (functionally: unhandled-hang)
- What happens: question advance is **purely both-players-submitted-driven**:
  ```
  836  const allSubmitted = Array.from(match.players.values()).every(
  837    p => p.hasSubmittedCurrent
  838  );
  839  if (!allSubmitted) { ...; return; }
  ```
  `match.timeLimit` is sent to the client (`sanitizeQuestion`) and enforced *client-side only*; the server never force-advances on a timeout. `questionTimers` is scaffolding for a per-question timeout that was never wired up.
- Trigger: player B disconnects (or their tab hangs, or a client-side timer bug fires late) between submitting nothing and Q_n; player A submits and then waits. `allSubmitted` can never become true for that question.
- Maps to which reported bug: **"questions don't advance."** Directly.
- Severity: critical, silent — no error is emitted to either client; player A simply sits on `waiting_for_opponent` (line 844) forever.
- Blast radius at 6K matches: scales linearly with disconnect rate × matches, i.e. roughly with total concurrent connections (12K sockets) — at that scale, even a small per-connection drop rate produces many permanently-stuck matches per minute.
- Fix sketch: give every question a server-owned deadline (populate `questionTimers` with a `setTimeout` at `nextQuestion()`/`createMatch()` time, cleared on `allSubmitted`), and on timeout auto-submit a null/timed-out answer for whoever hasn't submitted, then advance. The stale-match reaper (5-min inactivity, `reapStaleMatches`, worker.ts:90-100) is the *only* current escape hatch, and it kills the whole match rather than the one question — a much worse user experience than a per-question timeout.
- How to verify: in an integration test, join two players, have only one submit, and assert the match advances (or ends) within `timeLimit + margin` seconds instead of hanging until the 5-minute reaper fires.

### [M4] Per-worker match-capacity check (`MAX_MATCHES`) is unreachable dead code
- File/line: `matchServerWorker.ts:14,188` (`createMatch()` gate); `matchServerMaster.ts` join handlers (617-975) only ever forward `{type:'join_match'}`, never `{type:'create_match'}`
- Category: dead-code / resource-contradiction
- What happens: `createMatch()` throws once `this.matches.size >= MAX_MATCHES` (default 5), but nothing in the master ever sends the `create_match` message that would invoke it — matches are always created implicitly inside `joinMatch()` (worker.ts:280-347, "hydrate from Redis"), which has **no size check at all**.
- Trigger: sustained match creation on a single worker under the current live code path.
- Maps to which reported bug: contributes to "match hangs" indirectly — see M5.
- Severity: high, silent (no rejection, no error — a worker just keeps absorbing matches).
- Blast radius at 6K matches: this is a *capacity ceiling that doesn't exist* — the documented capacity math (500 workers × 5 matches = 2,500) assumes this cap is enforced; since it isn't, a single overloaded worker's actual concurrent-match count is bounded only by `assignMatch()`'s load-balancing behavior (see M5), not by a hard per-worker limit.
- Fix sketch: add the same size check to `joinMatch()`'s match-creation branch (or better, reject at `assignMatch()` time — see M5 — so the master never routes a new match to a full worker in the first place).
- How to verify: spin up one worker, force-route N synthetic matches to it, and confirm creation is rejected once `MAX_MATCHES` is hit — currently it will not be.

### [M5] `assignMatch()` never rejects an over-capacity worker
- File/line: `enhancedWorkerPool.ts` `assignMatch()`, load calc at line 261, "no workers" branch at 273-276
- Category: unbounded-growth
- What happens: the function always returns the least-loaded existing worker, with no `load >= 1` rejection branch — the only `null` return is "there are zero workers." Combined with M4 (no per-worker hard cap in the live join path), a worker pool that's fully saturated will keep stacking matches onto whichever worker is *least* saturated rather than refusing new matches or forcing a scale-up-and-wait.
- Trigger: match-creation rate exceeding `checkAndScale()`'s scale-up reaction time (5s check interval, but new workers take real wall-clock time to spawn and pass the 2-min health-check grace period).
- Maps to which reported bug: "match hangs" / general degradation under load — an overloaded worker process (event loop contention, GC pressure) makes *every* match it holds laggy, which surfaces to users as stuck-feeling matches even without a logic bug like M3.
- Severity: high, silent — degrades rather than errors.
- Blast radius at 6K matches: directly proportional to gap between demand and worker scale-up speed; worst during traffic spikes, which is exactly when 6K-match capacity would be stress-tested.
- Fix sketch: `assignMatch()` should refuse (return `null`) once every worker's load ≥ some ceiling, forcing the caller (master's join handler) to hold/queue the join briefly while `checkAndScale()` spins up capacity, rather than silently overloading one process.
- How to verify: load-test past the proactive-spawn threshold and graph per-worker match count — today it can exceed `MAX_MATCHES_PER_WORKER` on a single worker; after a fix it should plateau at the ceiling.

### [M6] Worker-death reaper races its own graceful shutdown and never touches Redis
- File/line: `enhancedWorkerPool.ts` `startHealthChecks()` 460-481 (kills after 3 min no-heartbeat, 2-min startup grace), `handleWorkerDeath()` 218-241, scale-down `idleWorkers.forEach` 448-453 (`worker.send({type:'shutdown'}); worker.kill();` back-to-back, no wait)
- Category: race-condition
- What happens: both the reaper and the scale-down path call `.kill()` immediately (reaper doesn't even send a shutdown message first; scale-down sends one but kills in the same tick without waiting for the worker's own `shutdown()` — worker.ts:1208-1212 — to run). `handleWorkerDeath` cleans master's own `matchToWorker`/`matchLastActivity` maps and tells connected clients to rejoin (`match_error`, "Match server restarted"), but it **never touches the Redis `match:{matchId}` key**, which still carries the dead worker's ID until its TTL (3600s) expires or something overwrites it.
- Trigger: a worker goes quiet for 3 minutes (real crash, or just GC/event-loop stall from M5's overload), or a scale-down fires while the worker is mid-request.
- Maps to which reported bug: **"one joins, other stuck loading"** is the most plausible fit — if player A's `join_match` is forwarded to a worker that dies (or is scale-down-killed) between player A's join and player B's join, the master's bookkeeping is cleared and B's join gets routed to a fresh worker with no memory of A, while A was already told `match_joined`/`LOAD_GAME_SCENE` by the now-dead worker and has no signal that anything went wrong until (if ever) a stale-match timeout elsewhere fires.
- Severity: critical when it hits an in-progress join, silent to the affected client (the `match_error` broadcast only reaches sockets still in the Socket.io room on redis-adapter, which depends on the room actually having been joined before the process died — timing-dependent).
- Blast radius at 6K matches: proportional to worker crash/restart rate × concurrent-join rate; low probability per event but the population size (500 workers, thousands of joins/minute at target load) makes it a background drip of "stuck" reports rather than a one-off.
- Fix sketch: (a) have `handleWorkerDeath` delete or reassign the Redis `match:{matchId}` key's `workerId` field so a subsequent join re-triggers `assignMatch()` cleanly instead of finding a stale worker reference; (b) give scale-down a real grace period (await an ack or a fixed delay) before `.kill()`, and don't kill via the health-check reaper without at least attempting a `send({type:'shutdown'})` first — right now the health-check path is a hard kill with zero grace.
- How to verify: kill a worker holding an in-progress join (one player joined, second not yet) and confirm the second player's join lands cleanly on a new worker within the 30s reconnection window, and the first player's client receives an actionable error rather than an indefinite loading state.

### [M7] Reconnection resync omits opponent state
- File/line: `matchServerWorker.ts:357-389` (`joinMatch()` reconnect branch)
- Category: reconnection-gap
- What happens: on reconnect during `IN_PROGRESS`, the server sends the reconnecting player's own question/score/answers/submission-status, but **no opponent connection status, opponent score, or opponent submission status**. The client has to infer whether the other player is even still connected.
- Trigger: any client refresh mid-match.
- Maps to which reported bug: contributes to "one joins other stuck loading" — a refreshed client that can't tell whether the opponent is present or gone has no way to distinguish "waiting for opponent to answer" from "opponent disconnected and match is effectively dead" (which is exactly what M3 makes possible).
- Severity: medium — not a hang by itself, but it removes the UI's ability to disambiguate a hang from normal waiting.
- Blast radius at 6K matches: every refresh mid-match hits this gap; scales with reconnection frequency, which the constraints call a first-class requirement ("refresh always recovers").
- Fix sketch: include opponent's `socketId != null` (connected), `hasSubmittedCurrent`, and `score` in the `match_reconnected` payload.
- How to verify: refresh one client mid-question and assert the resync payload includes a field the UI can use to render "opponent connected/disconnected" state, not just infer it from timeouts.

### [M8] `endMatch()` serializes DB writes ahead of the completion emit
- File/line: `matchServerWorker.ts` `endMatch()` 920-965 — sequential `await this.ensureDbMatch(match)` → `await matchDb.update(...)` → per-player loop with `await MatchPlayerModel.findOne/create/update` (930-951, in a `for` loop, not `Promise.all`) — all before `match_completed` emit at 959-965
- Category: blocking-hot-path
- What happens: both players' "match complete" notification is delayed by however long the full sequential DB write chain takes, unlike `submitAnswer()` (line 793 `saveMatchState`, Redis-only, then the fire-and-forget `.then()` chain at 819-834 explicitly kept off the critical path per the code's own comment). `endMatch` doesn't get the same treatment.
- Trigger: every match completion.
- Maps to which reported bug: none/latent at low load; contributes to general perceived latency at scale.
- Severity: low-medium, loud in the sense that it's measurable latency, not silent failure.
- Blast radius at 6K matches: linear in matches-completing-per-second × DB round-trip time × (1 + player count) since the player loop is sequential, not parallel — compounds with the Sequelize pool being hardcoded to `max: 10` (Section 2, H1), which is the more severe version of this same class of problem.
- Fix sketch: emit `match_completed` immediately after `saveMatchState`/Redis update, then run the Sequelize persistence off the critical path the same way `submitAnswer` already does — the pattern to copy already exists in this file.
- How to verify: measure time from last `submitAnswer` to client-received `match_completed` before/after; should drop to roughly the Redis round-trip.

### [M9] Scale-down capacity check trusts `matchCount` bookkeeping that can desync from the worker's real state
- File/line: `enhancedWorkerPool.ts` `checkAndScale()` 429-455 (guard: `w.matchCount === 0 && w.status === 'idle'`), `cleanupStaleMatches()` 353-388 (decrements `matchCount` for matches idle >5 min at master's clock, called from inside `checkAndScale()` at line 391) vs. worker's own independent 5-min reaper (`matchServerWorker.ts` `reapStaleMatches`, 90-100)
- Category: race-condition
- What happens: two independent 5-minute idle-match reapers exist — master's `cleanupStaleMatches` (decrements `matchCount` without notifying the worker) and the worker's own `reapStaleMatches` (actually deletes from `this.matches`). They run on different clocks/timers with no coordination. A narrow window exists where master believes a worker is idle (`matchCount === 0`) and scale-down-kills it while the worker process still has a match object mid-cleanup.
- Trigger: worker-pool scale-down coinciding with the ~5-minute idle boundary on a match.
- Maps to which reported bug: latent contributor to M6's family of symptoms — same "worker killed while still relevant" shape, narrower window.
- Severity: low (narrow race window), silent.
- Blast radius at 6K matches: low probability per worker but scales with worker churn, which scale-up/down cycles make more frequent at the target load than at today's scale.
- Fix sketch: have master's stale-match cleanup message the worker to confirm/trigger its own cleanup (single source of truth) instead of running two independent timers against the same data.
- How to verify: instrument both reapers' fire times in a soak test and look for overlap windows where master decrements `matchCount` to 0 while the worker's `this.matches` for that ID is still populated.

### Async-handler / unhandled-rejection audit — no findings
**[verified]** Every `async` `socket.on`/message handler in `matchServerMaster.ts` (`authenticate`, `start_auto_matchmaking`, `create_friend_match`, `join_match`, `join_match_by_code`, `connect_to_match`, `client_closing`, the forwarded-events loop) wraps its body in try/catch. `matchServerWorker.ts` has no direct `socket.on` handlers (it's driven by `process.on('message', ...)`, which is also try/catch-wrapped). This category, called out as a hunt target in the brief, came back clean — noted for completeness rather than padded into a finding.

### Ranked shortlist — most likely causes of the reported bugs

1. **[M3] No server-side question-advance fallback** — names "questions don't advance" exactly, is unconditional (fires on the very first mid-question disconnect, not just under load), and is the most concretely verified (the `questionTimers` Map is provably dead code, zero call sites). **Top pick.**
2. **[M6] Worker-death/scale-down races leaving a client mid-join with no signal** — best fit for "one joins, other stuck loading," but is probabilistic (needs a worker death/kill to land in the join window) rather than deterministic like M3.
3. **[M5]/[M4] Missing capacity ceiling in the live join path** — doesn't directly cause a named bug but is the load-bearing reason M6 becomes *likely* rather than rare: without a real per-worker cap, workers get overloaded, which raises crash/stall probability, which feeds M6.
4. **[M9] Dual uncoordinated stale-match reapers** — same failure family as M6, lower probability, worth fixing in the same pass.
5. **[M1]/[M2] Map/Set leaks** — not acute-hang causes, but at 12K sustained connections they're the kind of slow leak that eventually forces process restarts, which then *trigger* M6's failure mode. Worth fixing alongside, not first.

**Strongest case against M3 being the single root cause:** the resource-contradiction in [H-section below] is real and severe (docker-compose limits are ~2.3x the host's RAM and ~3.2x its cores) — under actual memory pressure, the OOM killer or CPU starvation could produce symptoms that *look* like "questions don't advance" (an unresponsive process rather than a logic gap) without M3 being involved at all. The distinguishing test: if disconnect-triggered hangs occur even on a lightly-loaded single match with no memory/CPU pressure, that isolates M3 as the cause; if hangs only appear under concurrent load, the resource ceilings are the more likely primary cause and M3 is a secondary, compounding bug. I have not run that test — this ordering is inferred from code reading, not from a load test.

---

## SECTION 2 — HTTP/Express + Socket.io app-server audit

**[verified]** Several items the brief flagged as likely-present issues are **already fixed** in the current uncommitted working tree (visible in `git diff --stat`: `authController.ts`, `middleware/auth.ts`, `routes/authRoutes.ts`, `utils/auth.ts` are all modified, plus a new untracked `middleware/rateLimiter.ts`). Calling this out explicitly since it changes the shape of this section from "here's what's broken" to "here's what's already fixed vs. what remains":

- **Auth hot path caching — already fixed.** `middleware/auth.ts:24-25,90,119-125` caches the authenticated user in Redis for 60s (`user:{id}:auth`), falling back to `User.findByPk` (line 98-100) only on cache miss. Not a finding.
- **Register TOCTOU — already fixed.** `authController.ts:16-26` creates directly and catches `UniqueConstraintError` (lines 64-71) instead of a `findOne`-then-`create` race; `models/User.ts` has `@Unique` on both `username` (32-35) and `email` (37-40). Not a finding.
- **Login enumeration — already mitigated.** Both the not-found branch (110-120, with a dummy bcrypt compare against `DUMMY_PASSWORD_HASH` for timing equalization) and the wrong-password branch (134-140) return an identical `INVALID_CREDENTIALS` error/message. Not a finding.
- **`lastLoginAt` write — already fire-and-forget.** `authController.ts:143-147`, explicitly not awaited, doesn't block the login response. Not a finding.
- **bcrypt — native, not bcryptjs.** `package.json` declares `bcrypt: ^6.0.0`; no `bcryptjs` dependency exists; actual imports (`utils/auth.ts`, `quickSeed.ts`, `engineeringSeeder.ts`) all use native `bcrypt`. Not a finding.
- **Rate limiting — present on the endpoints that matter, one gap.** `routes/authRoutes.ts:11-13` applies `authLimiter` (10 req/15min/IP, from the new untracked `middleware/rateLimiter.ts`) to both `/register` and `/login`. `/refresh` has **no rate limiter** — worth closing since a refresh-token endpoint is also bcrypt/JWT-verification work that could be hammered, though lower severity than register/login since it requires a valid refresh token to do anything.

### [H1] Sequelize pool hardcoded to `max: 10`, ignoring the env vars meant to configure it
- File/line: `backend/src/config/database.ts:38-43`
  ```
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
  ```
- Category: resource-contradiction / blocking-hot-path
- What happens: this is a literal, hardcoded object — `DB_POOL_MAX`/`DB_POOL_MIN` (defined in `.env`, `.env.self-hosted`, and read into `docker-compose.yml`'s env block) are never referenced anywhere in `backend/src` **[verified via repo-wide grep]**. Meanwhile Postgres itself is tuned for `max_connections=5000` (`docker-compose.yml:20` and command args). All that headroom is unusable because the application never opens more than 10 pooled connections per process.
- Trigger: any request volume exceeding ~10 concurrent DB-bound requests per backend/matchserver process.
- Severity: high, loud in one sense (requests will start timing out at the 30s `acquire` ceiling and throwing) but easy to misdiagnose as "the database is slow" rather than "the pool is starved," since Postgres itself will show low connection counts.
- Blast radius at 6K matches: this is likely the single biggest gap between "what the infra was tuned for" (5000 Postgres connections) and "what the app can actually use" (10) — at 6K concurrent matches with any DB-backed operation per question/match-end (see M8), a pool of 10 is trivially saturated.
- Fix sketch: wire `pool.max`/`pool.min` to `process.env.DB_POOL_MAX`/`DB_POOL_MIN` with sane fallbacks, and size them per-process against the shared `max_connections=5000` budget (backend + matchserver process counts × pool size should stay well under that ceiling).
- How to verify: under load, graph Sequelize pool "waiting for connection" time (or acquire-timeout error rate) before/after — should drop to ~0 once the pool matches actual concurrency.

### [H2] Hardcoded round-number ceilings — most likely candidate for "sticks at exactly 10,000"
- File/line: `nginx.conf:4` (`worker_connections 10000;`), `redis.conf:41` (`maxclients 10000;`), `.env` / `.env.self-hosted` (`DB_POOL_IDLE_TIMEOUT=10000` — this one is milliseconds, unrelated to a connection count, ruled out)
- Category: resource-contradiction
- What happens: `nginx.conf`'s `worker_connections 10000` is a **per-nginx-worker-process** ceiling; the effective total capacity is `worker_connections × worker_processes`, and each proxied client typically consumes 2 file descriptors (client-facing + upstream), roughly halving effective client capacity per worker. I did not confirm nginx's `worker_processes` setting in this pass **[inferred, not verified]** — if it's `1` (or `auto` resolving to a low core count under the 4-core budget), the real ceiling could functionally already be close to 10,000 total connections or even ~5,000 concurrent clients, which would explain a hard stop at a suspiciously round number.
- Trigger: aggregate concurrent connections approaching nginx's configured ceiling.
- Severity: critical if this is the actual wall, since it silently drops/refuses connections rather than degrading.
- Blast radius at 6K matches (12K sockets target): if `worker_connections 10000` is the effective ceiling, the app cannot reach the 12,000-socket target *by construction*, independent of any application-level fix.
- Fix sketch: raise `worker_connections` well above the 12K target (with matching `worker_rlimit_nofile`), and confirm `worker_processes` isn't multiplying/dividing that ceiling unexpectedly.
- How to verify: load-test past 10,000 concurrent connections and watch nginx's `stub_status`/error log for `worker_connections are not enough` — this message, if present, is a smoking gun.
- **Strongest case against this being the wall**: H1 (Sequelize pool `max: 10`) would cause request-level failures (500s, timeouts) at a much lower concurrency than 10,000 raw socket connections, especially since Socket.io connections themselves don't need a DB connection just to stay open — only request-driven operations do. If the "stuck at 10K" symptom is about *successful matches/requests* rather than raw socket count, H1 is the more likely culprit and H2 is coincidental. I did not have access to what "stuck at 10K" was measured against (connections vs. requests vs. matches) to disambiguate — **flagging both, ranked by which literal number matches the report.**

### [H3] Console logging left on by default even in production
- File/line: `backend/src/utils/logger.ts:49-75`; `docker-compose.yml:94,156` (`LOG_TO_CONSOLE: ${LOG_TO_CONSOLE:-true}` for both `backend` and `matchserver`)
- Category: blocking-hot-path
- What happens: `shouldLogToConsole` is true whenever `NODE_ENV !== 'production'` **or** `LOG_TO_CONSOLE === 'true'` — and the compose file's own default sets `LOG_TO_CONSOLE=true` regardless of `NODE_ENV`. The code itself already warns about this (lines 55-63, a `console.warn` emitted specifically when this combination is detected) — the awareness exists, the default doesn't reflect it. Winston's Console transport writes synchronously to `process.stdout` with no buffering, per the code's own comment (56-59).
- Severity: medium — compounds under sustained high-throughput logging (e.g., per-request or per-socket-event logs), not a hang by itself.
- Blast radius at 6K matches: scales with log-line volume, which scales with match/question/connection event volume — exactly what's elevated at target load.
- Fix sketch: flip the compose default to `LOG_TO_CONSOLE:-false` for anything running with `NODE_ENV=production`, relying on the file transport (which is already async-appropriate, 5MB/5-file rotation).
- How to verify: compare event-loop lag / request p99 with `LOG_TO_CONSOLE=true` vs `false` under the same load profile.

### Ranked shortlist and the 10K question

1. **[H1] Sequelize pool hardcoded to 10** — most severe, most certain to bite before 6K matches is reached, and independently confirmed by grep (zero references to the env vars meant to control it).
2. **[H2] nginx `worker_connections 10000`** — best literal match for "sticks at exactly 10,000," but unverified against `worker_processes`; my answer to "what's causing the hard stop at 10K": **this is the strongest literal-number match in the codebase**, with the caveat above that H1 could produce a similar-looking wall at a different, lower number that happens to get misreported as "around 10K" if nobody's measuring precisely.
3. **[H3] Synchronous console logging under production defaults** — real but secondary; a latency multiplier, not a hard ceiling.

---

## SECTION 3 — Dead code & config removal (executed)

See [REMOVED.md](REMOVED.md) for the itemized list with commit references. Summary of what was **not** executed and needs your call:

- **`.env.network`** (private-network mode) — left in place; it's gitignored/untracked, so deleting it isn't git-reversible. `deploy.sh`/`deploy.bat`/`deploy-all.*` (the latter already removed) still offer a "network" mode that depends on it — recommend stripping that mode from `deploy.sh`/`deploy.bat`'s menu in a follow-up pass, since editing their control flow safely needs a closer read than this pass budgeted for.
- **12 overlapping deployment-guide markdown files** (`DEPLOYMENT_CHECKLIST.md`, `DEPLOYMENT_GUIDE.md`, `DEPLOYMENT_MODES.md`, `DEPLOYMENT_QUICK_START.md`, `DEPLOYMENT_SUMMARY.md`, `PRODUCTION_DEPLOYMENT_GUIDE.md`, `PRODUCTION-2000-MATCHES-GUIDE.md`, `QUICK_START.md`, `QUICK_REFERENCE.md`, `README_DEPLOYMENT.md`, `SCALING_CONFIGURATION.md`, `SCALING_SUMMARY.md`, `SETUP_GUIDE.md`, `DOCUMENTATION_GUIDE.md`, `INFRASTRUCTURE_UPDATES.md`) — not deleted; genuinely need a human call on which content survives a `docs/` consolidation versus which is stale. Recommend picking one canonical deployment doc + one canonical scaling doc and archiving the rest.
- **`docker-stack.yml`** (Swarm/multi-node) — left in place, not deleted. It doesn't match the stated single-16GB/4-core-host target and has no cloudflared wiring either, but it represents real prior work and might matter for the stated "possible future upgrade" path — flagging for your call rather than deleting.
- **Orphaned `.env` variables** (29 of 79 root `.env` vars have zero code references — see the fact-finding pass for the full list; most infra/deploy-mode-related ones like `DEPLOYMENT_MODE`, `CLOUDFLARE_ACCOUNT_ID/API_TOKEN/ZONE_ID`, `PRODUCTION_DOMAIN`, `COMPOSE_PROJECT_NAME` may still be consumed by the deploy shell scripts, which weren't in the grep scope) — listed, not pruned; editing `.env` risks breaking a deploy script that reads it outside the code paths I checked.
- **`Frontend-admin/src/services/matchClient.ts`** shows as modified in `git status` but wasn't in scope for this audit (admin frontend, not backend/matchserver) — untouched.

---

## SECTION 4 — Monitoring stack (documented, light cleanup only)

No monitoring service in `docker-compose.yml` declares `mem_limit`/`cpus` at all **[verified]** — `prometheus`, `grafana`, `node-exporter`, `postgres-exporter`, `redis-exporter`, `alertmanager`, `influxdb` are entirely unconstrained. On a 16GB/4-core host already overcommitted 2.3x on memory and 3.2x on CPU by the *application* services alone (Section 1's resource-contradiction, restated here: postgres 8G+redis 4G+backend 8G+matchserver 16G+nginx/frontend/adminer 1.5G = 37.5G declared vs 16G physical; cpus 2+1+3+6+0.75 = 12.75 vs 4 physical), seven more unconstrained monitoring processes compete for whatever's left — the exact resource contention this stack is meant to diagnose.

**Prometheus config**: only `monitoring/prometheus/prometheus.yml` is mounted (`docker-compose.yml:271`); it's the most complete of the three (5 scrape targets + alerting + `rule_files: alerts/*.yml`). The root `prometheus.yml` (2 targets) and `monitoring/prometheus.yml` (6 targets) are both **[verified]** unmounted and unreferenced by any compose service — dead config, but not byte-identical to each other or to the active one, so per the "exact dupes and empties only" rule for this pass, **not deleted** — flagged for the rebuild phase.

**Grafana dashboards** (21 files, none empty/sub-1KB): `radis.json` and `radis-exporter.json` are near-identical (same imported community Redis dashboard, different Grafana export versions) but **not byte-identical** (2,873 diff lines — different plugin/schema versions), so also not deleted this pass per the same rule. Broader groupings for the rebuild phase:
- *Working + useful*: `working-metrics-dashboard.json`, `match-capacity.json`, `api-latency-errors.json`, `bottleneck-detection.json`, `match-server-performance.json`, `MASTER-SYSTEM-DASHBOARD.json`
- *Likely duplicate pairs (candidates for a follow-up dedup, not deleted here)*: `radis.json` / `radis-exporter.json`; `postgresql-exporter.json` (92KB, full community dashboard) / `postgresql-prometheus.json` (4.5KB, hand-built); `quiz-match-metrics-dashboard.json` / `complete-quiz-match-metrics.json` / `quiz-match-simple-dashboard.json` (three overlapping match-metric dashboards of different completeness)
- *Not Prometheus-sourced, keep separately*: `cloudflare-DNS-analytics.json`, `cloudflare-analytics.json` (Cloudflare's own analytics API, not scraped metrics)
- *Smoke-test only*: `test-dashboard.json` (2 panels, `up`/`prometheus_build_info`)

**What's actually broken [verified via code cross-reference]:**
- `monitoring/alert_rules.yml`'s alerts query `quizup_http_requests_total`, `quizup_http_request_duration_seconds_bucket`, `quizup_active_users` — these metrics *are* registered in code (`backend/src/utils/metrics.ts`), but only served at `/metrics-custom` (`server.ts:213`), while every scrape config hits `/metrics` (served by `express-prom-bundle`, generic non-`quizup_`-prefixed names). **Prometheus never scrapes these metrics, so this entire alert group is permanently inactive.** This file also isn't inside the `alerts/` subdirectory the active prometheus.yml's `rule_files: alerts/*.yml` glob would pick up — doubly dead.
- `monitoring/prometheus/alerts/match-server-alerts.yml:142` (the one alert file that *is* actually loaded) references `pg_stat_activity_count`, which doesn't match either name postgres-exporter's custom query file actually produces (`pg_stat_activity_total_connections` / `pg_stat_activity_active_connections`, per `monitoring/postgres-exporter/queries.yaml`) — this specific alert will never fire.
- `monitoring/alert_rules.yml`'s `HighMemoryUsage` alert queries `container_memory_usage_bytes`/`container_spec_memory_limit_bytes` (cadvisor-style metrics) but no cadvisor service exists in any compose file — never scraped, never fires. (Same file is already dead per the point above, but worth noting the specific alert would be broken even if the file were wired up.)

**Gap list for the rebuild** (metrics that matter for this project's actual goals — crash-tolerant 6K-match capacity, leak-watching — that are currently missing):
- Per-worker live match count *as actually held by the worker* (`this.matches.size` in `matchServerWorker.ts`), not just master's `matchCount` bookkeeping — Section 1's M9 finding is exactly a desync between these two, and there's no metric today that would let anyone notice that desync happening.
- `questionTimers`/in-memory Map sizes (`userToMatch`, `trackedMatches`, `matchToWorker`, `matchLastActivity`) exported as gauges — M1/M2's leaks are invisible today; a `Gauge` per Map, scraped over time, would make them visible immediately instead of requiring a code read to find.
- Event-loop lag per worker process (Node's own `perf_hooks` event-loop-utilization or a lag-sampling gauge) — the best generic signal for "this worker is overloaded," relevant to M5's missing capacity gate.
- Orphaned/active match ratio — a match is "active" (worker holds it, clients connected) vs. "orphaned" (Redis key exists, no worker claims it, per M6) — currently indistinguishable from outside the process.
- Reconnection attempt/success rate — the constraints call refresh-recovery a first-class requirement; there's no metric today that would show whether it's actually working in production versus just in a manual smoke test.
- Sequelize pool saturation (`pool.max` vs. in-use vs. waiting-for-acquire) — directly relevant to H1.
