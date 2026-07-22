# Removed in this cleanup pass

Branch `hotfix/error-handeling`. Each group is its own commit so any of them can be reverted independently with `git revert <sha>`.

| Commit | What | Why |
|---|---|---|
| `24345cf` | `Backend/` (capital) — `dump/only data ig.sql`, `dump/s.sql`, `fix-dump.js`, `init-data.sql`, `src/disableBackendCors.js`, `src/ex.matchServer.ts` | Stray git-tracked paths that alias the same on-disk folder as `backend/` (case-insensitive filesystem), but are separate blobs in git's index. Nothing in `package.json`, the Dockerfiles, or `docker-compose.yml` references `Backend/`-cased paths — confirmed dead via `git ls-tree` and repo-wide reference search. The working-tree "modifications" git reported on 4 of these files were pure CRLF/LF line-ending noise (verified with `git diff --ignore-all-space`, zero real content diff), so nothing of substance was lost. |
| `dfc76ec` | `backend/src/matchServer-enhanced.ts`, plus `package.json` scripts `start:match`/`dev:match`, plus references in `pre-build.js`, `start.sh`, `start-server.js` | Confirmed unreachable in production: `docker-compose.yml`'s `matchserver` service builds the `matchserver-master` Dockerfile stage (`CMD node dist/matchServerMaster.js`), which never imports this file. The only live production path is `matchServerMaster.ts` + `matchServerWorker.ts`. `start.sh`/`start-server.js` (which did reference `matchServer-enhanced.js`) aren't invoked as a Dockerfile `CMD` anywhere either — they were already dead entrypoints; their fallback branches were repointed at `matchServerMaster.js` instead of deleted, so they don't dangle-reference a removed file if ever run by hand. `pre-build.js`'s required-file check was repointed at `matchServerMaster.ts`/`matchServerWorker.ts` so the Docker build's `prebuild` step doesn't hard-fail. |
| `59ded67` | `scripts/start-tunnelmole.bat`, `scripts/start-tunnelmole.sh`, `scripts/test-tunnelmole.bat` | Abandoned tunnel provider — the stated networking target is local + Cloudflare tunnel (cloudflared) only. Nothing outside docs referenced these scripts. `.env.network` (the other "private network" mode artifact) was **not** deleted — it's gitignored/untracked, so removal wouldn't be git-reversible; left for a manual decision (see AUDIT_FINDINGS.md Section 3). |
| `955adfd` | `test_disconnect_fix.js` (root), `deploy.js`, `deploy-all.sh`, `deploy-all.bat`, `QUICK_FIX.sh` | `test_disconnect_fix.js`: standalone manual socket.io smoke script, never wired into `npm test`/jest — not literally broken, but redundant and superseded by the reconnection-path analysis in AUDIT_FINDINGS.md Section 1. `deploy.js`: Node reimplementation of `deploy.sh`/`deploy.bat` covering the same three modes — redundant. `deploy-all.sh`/`.bat`: batch-ran all three deploy modes including the now-abandoned "network" mode. `QUICK_FIX.sh`: one-off fix for the 403 Forbidden Vite build issue, already applied and documented as VERIFIED (that doc was removed in the next commit). Canonical deploy path kept: `deploy.sh`/`deploy.bat` (local, multi-mode) + `deploy-ec2.sh`/`deploy-ec2-envs.sh`/`deploy-ec2-update.sh` (cloudflared + EC2 production). |
| `c5c0d83` | `DISCONNECT_FIX_VERIFIED.md`, `FIX_DISCONNECT_DURING_MATCH.md`, `FIX_403_FORBIDDEN.md`, `FILES_CREATED.md`, `FINAL_SUMMARY.md` | Point-in-time "fix applied/verified" status docs superseded by current code state (the 403 fix's corresponding script was just removed; the disconnect-fix docs are superseded by the gaps found in AUDIT_FINDINGS.md Section 1, which found the current reconnection path still has real holes these docs don't cover). `FILES_CREATED.md`/`FINAL_SUMMARY.md` are stale scaffolding-completion logs from an earlier infra pass, fully superseded by git history. |

## Cleanup pass 2 (post-observability rebuild)

Removed the code/config the observability rebuild made dead, plus the deployment/docs sprawl the user approved:

| What | Why |
|---|---|
| `backend/src/tracing.ts` + its `server.ts` import + the 4 `@opentelemetry/*` deps | No-op OpenTelemetry stub (fully commented out); superseded by the correlation-ID approach. The OTel packages were unused. |
| `backend/src/middleware/metricsMiddleware.ts` | Hand-written metrics middleware imported nowhere (server.ts uses express-prom-bundle; its `metricsMiddleware` const is a local promBundle instance). |
| `/metrics-custom` route + `metricsEndpoint` export | Redundant now that business metrics register on the default registry served at `/metrics`. |
| `influxdb` service + `influxdb_data`/`influxdb_config` volumes + cloudflare Grafana datasource provisioning (`cloudflare.yml`, `cloudflare.yml.example`) | Only the already-deleted cloudflare analytics dashboards used influxdb. |
| `monitoring/autoscaler/autoscale-matchserver.ps1` | Standalone script wired into nothing; the worker pool autoscales itself in `enhancedWorkerPool`. |
| `docker-stack.yml` + `scripts/verify-replicas.sh` / `.bat` | Docker Swarm path — doesn't match the single-host target; verify-replicas were swarm-only tools. Only echo/help text referenced them (fixed the stale `generate-env.js` line). |
| 15 root markdown docs (`DEPLOYMENT_*`, `PRODUCTION_*`, `SCALING_*`, `QUICK_*`, `README_DEPLOYMENT.md`, `SETUP_GUIDE.md`, `DOCUMENTATION_GUIDE.md`, `INFRASTRUCTURE_UPDATES.md`) | Overlapping deployment/scaling guides. Kept: `README.md`, `ARCHITECTURE.md`, `CLOUDFLARE_TUNNEL_SETUP.md`, `AUDIT_FINDINGS.md`, `REMOVED.md`, `DEV_NOTES.md`. |
| "network" deploy mode removed from `deploy.sh` + `deploy.bat` (functions, dispatch branch, usage text) | Abandoned network mode; depended on the removed `.env.network`. Localhost + self-hosted (cloudflared) modes kept and syntax-verified. |
| `.env.network`, `.env.unified` (local only — gitignored) | Abandoned network mode + old unified template. |

**Kept despite being a removal candidate: `docker-compose.prod.yml`** — the earlier plan was to remove it, but `.github/workflows/ci.yml` actively uses it (`docker compose -f docker-compose.prod.yml pull/up/ps`) for its deploy job. Removing it would break CI, and migrating CI to `docker-compose.yml` would change prod deploy behavior (it would pull in the whole monitoring stack). Flagged for a deliberate decision rather than silently breaking CI or changing its deploy target.

## Explicitly left in place (superseded by cleanup pass 2 above for the resolved items)

- **`.env.network`** — gitignored/untracked; deleting it isn't git-reversible. Still referenced by `deploy.sh`/`deploy.bat`'s "network" mode menu option.
- **12 overlapping deployment/scaling markdown docs** (`DEPLOYMENT_CHECKLIST.md`, `DEPLOYMENT_GUIDE.md`, `DEPLOYMENT_MODES.md`, `DEPLOYMENT_QUICK_START.md`, `DEPLOYMENT_SUMMARY.md`, `PRODUCTION_DEPLOYMENT_GUIDE.md`, `PRODUCTION-2000-MATCHES-GUIDE.md`, `QUICK_START.md`, `QUICK_REFERENCE.md`, `README_DEPLOYMENT.md`, `SCALING_CONFIGURATION.md`, `SCALING_SUMMARY.md`, `SETUP_GUIDE.md`, `DOCUMENTATION_GUIDE.md`, `INFRASTRUCTURE_UPDATES.md`) — needs a human call on a `docs/` consolidation, not a mechanical delete.
- **`docker-stack.yml`** (Swarm/multi-node) — doesn't match the stated single-host target and has no cloudflared wiring, but represents real prior work for a possible future multi-node upgrade; flagged, not deleted.
- **29 orphaned root `.env` variables** — zero references in `backend/src`, `Frontend-admin/src`, or the three compose files, but may still be consumed by deploy shell scripts not covered by this pass's grep scope. Listed in AUDIT_FINDINGS.md, not pruned.
- **3 duplicate-ish prometheus.yml files and near-duplicate Grafana dashboards** — none are byte-identical or empty, so out of scope for "exact dupes and empties only"; catalogued in AUDIT_FINDINGS.md Section 4 for the later monitoring rebuild.
- **`Frontend-admin/src/services/matchClient.ts`** — shows modified in `git status` but is outside this audit's backend/matchserver scope; untouched.

---

## Old test-system cleanup + CI green (branch `fix/audit-reliability-and-security`)

Removed old load-test scaffolding (superseded by `backend/scripts/loadtest.js` +
[docs/STRESS_TESTING.md](docs/STRESS_TESTING.md)) and an unreferenced duplicate docs dir:

| Removed | Why |
|---|---|
| `tests/` (root: `stress-test-{bots-small,debug,master-worker,parallel-10-fixed,sequential}.js`, `seed-2000-users.sql`, `seed-users.js`, `monitor-resources.js`, `debug-ui-selectors.js`, `grafana-dashboard.json`, `package.json`, `package-lock.json`, + `QUICK-START.md`/`README-ULTIMATE.md`/`README-MULTI-ENVIRONMENT-TESTING.md`/`STRESS_TEST_100_README.md`) | Abandoned standalone stress harness. Unreferenced by CI/Docker/compose. Superseded by the reusable, documented `backend/scripts/loadtest.js` (hold/play modes, multi-quiz, prod-URL support). |
| `backend/test-worker-pool.ps1`, `backend/test-worker-pool.sh` | One-off worker-pool smoke scripts, never wired into `npm test`/CI. Superseded by the load harness. |
| `backend/dumb.sql` | Scratch SQL, unreferenced. |
| `backend/SCALING_TO_2000_MATCHES.md` | Obsolete planning doc (target was 2,000 matches); the system is now validated to a 24,000-match cap — see [docs/STRESS_TESTING.md](docs/STRESS_TESTING.md) and [docs/RUNNING.md](docs/RUNNING.md). |
| `system_design/` (`architecture-diagrams.md`, `database-schema.sql`, `DEV_NOTES.md`, `openapi.yaml`, `README.md`, `socket_spec.md`, `SYSTEM_DESIGN.md`) | Unreferenced near-duplicate of `docs/` (5 of 7 byte-identical; `docs/` is the canonical location referenced by `README.md` and served by the app at `/api-docs/`). Divergent content preserved in git history. |

Kept `start.sh`/`start-server.js` (copied by `backend/Dockerfile`; already repointed to `matchServerMaster.js` in an earlier pass).
