/**
 * Match-server Prometheus metrics (master process only).
 *
 * The master serves GET /metrics and owns the prom-client default registry.
 * Workers hold the live match state and detect the events (answers, match
 * completions, reconnections), so they report them to the master over IPC
 * (see notifyMaster in matchServerWorker.ts + handleWorkerMessage in
 * services/enhancedWorkerPool.ts), which records them into the histograms
 * and counters below. The existing live gauges (active matches, connected
 * users, per-worker load) stay hand-written in matchServerMaster.ts because
 * they read current state at scrape time; this module adds the accumulating
 * counters/histograms prom-client is better at.
 */

import client from 'prom-client';

// Standard process metrics for the master (event-loop lag, heap, GC, CPU).
// These appear as nodejs_* / process_* in the /metrics output.
client.collectDefaultMetrics({ prefix: '' });

export const matchRegister = client.register;

export const answerTimeSeconds = new client.Histogram({
  name: 'matchserver_answer_time_seconds',
  help: 'Time a player spent answering a question (seconds)',
  buckets: [1, 2, 3, 5, 8, 13, 21, 34, 55],
});

export const matchDurationSeconds = new client.Histogram({
  name: 'matchserver_match_duration_seconds',
  help: 'Wall-clock duration of a completed match (seconds)',
  buckets: [10, 30, 60, 120, 300, 600, 1200],
});

export const answersTotal = new client.Counter({
  name: 'matchserver_answers_total',
  help: 'Total answers submitted',
  labelNames: ['result'] as const, // 'correct' | 'incorrect' | 'timeout'
});

export const questionsAdvancedTotal = new client.Counter({
  name: 'matchserver_questions_advanced_total',
  help: 'Total question advances',
  labelNames: ['reason'] as const, // 'all_answered' | 'timeout'
});

export const reconnectionsTotal = new client.Counter({
  name: 'matchserver_reconnections_total',
  help: 'Player reconnections into an in-progress match',
});

export const matchesCompletedTotal = new client.Counter({
  name: 'matchserver_matches_completed_total',
  help: 'Matches that reached completion',
});

// Per-worker event-loop lag, reported via the worker heartbeat.
export const workerEventLoopLag = new client.Gauge({
  name: 'matchserver_worker_event_loop_lag_seconds',
  help: 'Event-loop lag sampled on each worker process',
  labelNames: ['worker_id'] as const,
});

// ---- AUTO matchmaking (owned by the master; mutated directly, no worker IPC) ----

// Current depth of the AUTO matchmaking queue, one series per category. The
// master sets this every sweep from the queue snapshot and zeroes categories
// that emptied since the previous tick so no stale non-zero series lingers.
export const matchmakingQueueDepth = new client.Gauge({
  name: 'matchserver_matchmaking_queue_depth',
  help: 'Players currently waiting in the AUTO matchmaking queue, by category',
  labelNames: ['category'] as const,
});

// How long players waited before being paired (both players observed per match).
export const matchmakingWaitSeconds = new client.Histogram({
  name: 'matchserver_matchmaking_wait_seconds',
  help: 'Time a player waited in the AUTO queue before being matched (seconds)',
  buckets: [1, 2, 5, 10, 15, 30, 60, 120, 300],
});

export const matchmakingMatchesFoundTotal = new client.Counter({
  name: 'matchserver_matchmaking_matches_found_total',
  help: 'Total AUTO matchmaking pairs successfully matched',
});

export const matchmakingTimeoutsTotal = new client.Counter({
  name: 'matchserver_matchmaking_timeouts_total',
  help: 'Total AUTO matchmaking searches that timed out without a match',
});

/** Record one submitted answer's outcome + time spent. */
export function recordAnswer(result: 'correct' | 'incorrect' | 'timeout', timeSpentSeconds: number) {
  answersTotal.inc({ result });
  if (typeof timeSpentSeconds === 'number' && timeSpentSeconds >= 0) {
    answerTimeSeconds.observe(timeSpentSeconds);
  }
}

/** Record a completed match's total duration. */
export function recordMatchCompleted(durationSeconds: number) {
  matchesCompletedTotal.inc();
  if (typeof durationSeconds === 'number' && durationSeconds >= 0) {
    matchDurationSeconds.observe(durationSeconds);
  }
}

/** Record how long a matched player waited in the AUTO queue (seconds). */
export function recordMatchmakingWait(seconds: number) {
  if (typeof seconds === 'number' && seconds >= 0) {
    matchmakingWaitSeconds.observe(seconds);
  }
}
