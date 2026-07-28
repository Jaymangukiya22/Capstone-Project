---
description: Run a quiz match load/stress test against the local stack
argument-hint: "[num_matches] [hold|play]"
---
Run the match-server load test using `backend/scripts/loadtest.js`.

Arguments (optional): `$1` = number of matches (default 500), `$2` = mode
`hold` (idle sockets — capacity/resources) or `play` (finish matches — throughput
+ persistence). Default `hold`.

Steps:
1. Confirm the stack is up and healthy: `docker compose ps`, `curl -s localhost:3001/health`.
2. Ensure enough seeded users exist (each match needs 2 distinct users). Seeding
   SQL is in `docs/STRESS_TESTING.md §1`.
3. Run **in-container** on the compose network (the Windows host caps ~2000
   connections). Spread across quizzes with `QUIZ_IDS=102-153`:
   ```bash
   MSYS_NO_PATHCONV=1 docker run --rm --network quizup_quizup_network \
     --ulimit nofile=65535:65535 -v /d/Capstone-Project/backend:/app -w /app \
     -e MATCH_URL=http://matchserver:3001 -e API_URL=http://backend:3000 \
     -e NUM_MATCHES=${1:-500} -e MODE=${2:-hold} -e QUIZ_IDS=102-153 -e HOLD_MS=60000 \
     node:20-alpine node scripts/loadtest.js
   ```
4. Watch `curl -s localhost:3001/metrics | grep -E 'active_matches|event_loop_lag|worker_matches'`
   and `docker stats --no-stream`.
5. For `play` mode, verify correctness with the DB queries in `docs/STRESS_TESTING.md §5`.

Full guide: `docs/STRESS_TESTING.md`. Do NOT hammer the prod Cloudflare URLs.
