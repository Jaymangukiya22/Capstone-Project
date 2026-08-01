# AUTO Matchmaking

How QuizUP pairs strangers into a ranked 1v1 match without a join code, the
socket contract clients use to opt in, the metrics that expose queue health,
and how to load-test it to prove matches are never double-assigned.

This complements [socket_spec.md](socket_spec.md) (full event catalogue) and
[STRESS_TESTING.md](STRESS_TESTING.md) (harness usage) — this doc is scoped to
the AUTO-matchmaking path specifically.

---

## 1. What AUTO matchmaking is

FRIEND matches (`POST /api/friend-matches` + join-by-code) pair two players who
already know each other. AUTO matchmaking instead pairs a player with whoever
else is currently searching in the same category, weighted by skill (ELO), and
starts the match automatically — no code exchange.

A client opts in over the socket connection it already holds for match play:
authenticate, then emit `start_auto_matchmaking` with a `categoryId`. The match
server queues the player, tries to pair them immediately, and — if nobody
compatible is waiting yet — keeps retrying as new players join the queue or as
the acceptable ELO range widens, until a match is found or the search times out.

## 2. Design

- **Queue.** Searching players are held in a queue keyed by category and scored
  by ELO rating (conceptually a Redis sorted set: `ZADD queue:{categoryId}
  eloRating userId`), so pairing candidates near a player's skill are cheap to
  find without a linear scan, and the queue is visible/consistent across every
  match-server replica rather than pinned to whichever process instance a
  socket happened to land on.
- **Atomic pairing.** When a candidate pair looks compatible (same category,
  compatible quiz preference, ELO within the current widened range), pairing
  them and removing both from the queue happens as one atomic, lock-protected
  step (a distributed lock / atomic Redis operation such as a Lua script or
  `WATCH`/`MULTI`-style compare-and-remove) — not a check followed by a
  separate removal. That atomicity is what makes **no-double-match** an
  invariant rather than a race: two concurrent pairing attempts can never both
  claim the same waiting player, because only one can win the atomic
  remove-and-claim on that player's queue entry. A player is in the queue,
  matched, or gone (timed out / disconnected) — never claimed twice.
- **Sweep + fairness.** Alongside opportunistic pairing on enqueue, a central
  sweep periodically walks the queue(s) to catch pairings that weren't found at
  enqueue time (e.g. two players whose ranges only started overlapping after
  widening). The sweep favors the **best ELO match** available and breaks ties
  toward the **longest-waiting** player, so nobody is perpetually skipped in
  favor of fresher, better-matched arrivals. A player's acceptable ELO range
  **widens over time** the longer they wait (starting narrow, stepping wider on
  an interval, capped at a maximum), trading match quality for wait time the
  longer someone searches.
- **Ranked play.** Matches created via AUTO matchmaking are ranked: completing
  one updates both players' ELO rating and win/loss record, unlike FRIEND
  matches which are casual.
- **Cross-replica join routing.** The match server runs multiple replicas
  behind Nginx, each holding a disjoint set of live socket connections. Once a
  pair is formed, the two players' sockets may be attached to different
  replicas. Routing the resulting match/room join to both uses the socket.io
  Redis adapter (cross-replica room membership) plus `serverSideEmit` (or the
  equivalent inter-replica broadcast) so both sockets receive `auto_match_found`
  and get placed in the match room regardless of which replica they're
  connected to — the same mechanism that lets FRIEND-match join-by-code work
  across replicas.

## 3. Socket event contract

All events are on the existing match-server socket (same connection used for
`authenticate` / gameplay). Categories and quizzes: a `categoryId` groups
quizzes (`quizzes.category_id`); AUTO matchmaking requires **both players to
share a `categoryId`** to be compatible, and additionally requires a shared
`quizId` only if *both* explicitly specified one.

### Client → Server

#### `start_auto_matchmaking`
Enter the queue for a category (optionally pinning a specific quiz).
```typescript
interface StartAutoMatchmakingPayload {
  categoryId: number;
  quizId?: number; // optional — if set, only pairs with a compatible/matching preference
}
```
Re-emitting cancels and re-enters the queue with the new preference.

### Server → Client

#### `matchmaking_started`
Acknowledges entry into the queue.
```typescript
interface MatchmakingStartedPayload {
  range: number;            // current ELO search range
  playersSearching: number; // others currently searching this category
}
```

#### `matchmaking_update`
Periodic progress update while still searching (sent as the range widens).
```typescript
interface MatchmakingUpdatePayload {
  range: number;
  elapsedMs: number;
  playersSearching: number;
}
```

#### `auto_match_found`
A pair was formed. Sent to **both** matched sockets, **exactly once each** —
this is the invariant the load-test harness (§5) verifies under concurrency.
```typescript
interface AutoMatchFoundPayload {
  matchId: string;
  quizId: number;
}
```
After this, gameplay proceeds exactly like a FRIEND match (`match_started`,
`next_question`, `submit_answer`, ... `match_completed`) with ranked ELO/W-L
updates applied on completion.

#### `auto_match_timeout`
No compatible opponent was found within the search window (default 5 minutes);
the player is removed from the queue.
```typescript
interface AutoMatchTimeoutPayload {
  success: false;
  error: 'MATCHMAKING_TIMEOUT';
  message: string;
}
```

#### `matchmaking_error`
Matchmaking could not proceed (bad/missing `categoryId`, no quizzes available
for the category, no worker capacity, etc.).
```typescript
interface MatchmakingErrorPayload {
  success: false;
  error: 'VALIDATION_ERROR' | 'MATCHMAKING_FAILED' | 'MATCHMAKING_START_FAILED';
  message: string;
}
```

## 4. Metrics

Exposed on the match server's existing Prometheus endpoint, `MATCH_URL/metrics`
(same master process that serves `matchserver_active_matches_total` etc. — see
[STRESS_TESTING.md §4](STRESS_TESTING.md#4-monitoring-during-a-run)):

| Metric | Type | Meaning |
|---|---|---|
| `matchserver_matchmaking_queue_depth` | gauge | Players currently searching (ideally labeled by category) — should return toward 0 as pairing/timeouts drain the queue after a load spike. |
| `matchserver_matchmaking_wait_seconds` | histogram | Time from `start_auto_matchmaking` to `auto_match_found`, i.e. search latency. |
| `matchserver_matchmaking_matches_found_total` | counter | Cumulative successful pairings. Should climb roughly in step with `queue_depth` draining. |
| `matchserver_matchmaking_timeouts_total` | counter | Cumulative `auto_match_timeout` events — searches that never found a compatible opponent in time. |

Quick check while a run is live:
```bash
curl -s $MATCH_URL/metrics | grep matchserver_matchmaking_
```

## 5. Proving no-double-match: `MODE=auto`

The load-test harness ([`backend/scripts/loadtest.js`](../backend/scripts/loadtest.js))
has a matchmaking mode built specifically to stress the pairing path and assert
the invariant under concurrency, rather than just trusting single-request
testing:

1. Connects and authenticates `NUM_MATCHES * 2` sockets in tight waves (small
   batch size, near-zero pause) so many players hit `start_auto_matchmaking`
   for the same category at almost the same moment — the scenario where a
   pairing race would actually manifest.
2. Records every `auto_match_found` a socket receives. **Fails loudly and
   exits non-zero** if any single user receives it more than once, or if any
   `matchId` is reported by more than 2 distinct users.
3. Measures `start_auto_matchmaking` → `auto_match_found` latency (p50/p95)
   and counts `auto_match_timeout`.
4. Best-effort fetches `MATCH_URL/metrics` afterward and prints the four
   matchmaking series (§4) so you can eyeball `matches_found_total` and confirm
   `queue_depth` settled back down.

### Prerequisite: find a `categoryId`

All searchers in one run must share a category to be eligible to pair:
```sql
SELECT DISTINCT q.category_id, c.name
FROM quizzes q JOIN categories c ON c.id = q.category_id
WHERE q.is_active = true
ORDER BY q.category_id;
```
Pick a category with enough active quizzes/questions to seat the load you're
generating (`quizzes` IDs 102–153 used elsewhere in this repo's seed data
belong to various categories — see [STRESS_TESTING.md §1](STRESS_TESTING.md#quizzes)).

### Run it (in-container — see [STRESS_TESTING.md §3](STRESS_TESTING.md#3-running-it) for why)

```bash
MSYS_NO_PATHCONV=1 docker run --rm --name loadgen-auto \
  --network quizup_quizup_network --ulimit nofile=65535:65535 \
  -v /d/Capstone-Project/backend:/app -w /app \
  -e MATCH_URL=http://matchserver:3001 -e API_URL=http://backend:3000 \
  -e NUM_MATCHES=500 -e USER_OFFSET=0 -e MODE=auto -e CATEGORY_ID=1 \
  node:20-alpine node --max-old-space-size=3072 scripts/loadtest.js
```

Env specific to `MODE=auto` (full list in the harness's own header comment):

| Var | Default | Meaning |
|---|---|---|
| `CATEGORY_ID` | — (required) | Category all searchers queue under. |
| `QUIZ_ID` | — | Optional — pins a preferred quiz instead of letting the server pick randomly within the category. |
| `AUTO_WAIT_MS` | 20000 | How long to wait after the ramp for pairing/sweep to settle before reporting results. Raise it (e.g. toward the 5-minute timeout) to also exercise `auto_match_timeout` under load. |
| `NUM_MATCHES` | 1000 | Intended pairs; harness connects `NUM_MATCHES * 2` searchers. |
| `USER_OFFSET` | 0 | Non-overlapping user-id range for parallel generators. |
| `BATCH` / `BATCH_PAUSE_MS` | 50 / 20ms | Tighter than FRIEND-mode defaults (25 / 250ms) — auto mode wants concurrent enqueue pressure. |

### Reading the result

```
=== AUTO RESULT ===
searching=1000 matched=996 timeouts=4 connectErrors=0 matchmakingErrors=0
unique matchIds=498 matchedSockets=996 (expect matchedSockets == 2 x uniqueMatchIds when everything paired cleanly)
wait latency (startSearch -> auto_match_found): p50=340ms p95=1210ms n=996

=== PASS: no-double-match invariant holds (every user matched at most once; every matchId held by <=2 users) ===
```

A failing run instead prints `=== FAIL: no-double-match invariant VIOLATED ===`
with the offending user IDs / matchIds and exits code 1 — treat that as a
correctness regression in the pairing path, not noise.
