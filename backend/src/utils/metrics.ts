/**
 * QuizUP backend business metrics.
 *
 * IMPORTANT: these register on prom-client's DEFAULT registry, which is the
 * one express-prom-bundle exposes at GET /metrics (server.ts). The previous
 * version created its own `new Registry()` served only at /metrics-custom,
 * which Prometheus never scraped - so none of these were actually collected.
 * It also set active-users to Math.random(), i.e. fake data. Both fixed here.
 */

import client from 'prom-client';
import { sequelize } from '../config/database';

// ---- Metrics (default registry) ----

// Real "active users on the API" = distinct userIds seen in an authenticated
// request within the sliding window below. Fed by markUserActive() from the
// auth middleware. (Live *connected* users is a separate, match-server metric:
// matchserver_connected_users.)
const activeApiUsers = new client.Gauge({
  name: 'quizup_active_api_users',
  help: 'Distinct authenticated users seen on the API in the last 60s',
});

const quizAttemptsTotal = new client.Counter({
  name: 'quizup_quiz_attempts_total',
  help: 'Total quiz attempts',
  labelNames: ['status'] as const,
});

const dbPoolSize = new client.Gauge({
  name: 'quizup_db_pool_size',
  help: 'Sequelize connection pool: total connections',
});
const dbPoolUsed = new client.Gauge({
  name: 'quizup_db_pool_used',
  help: 'Sequelize connection pool: connections currently in use',
});
const dbPoolWaiting = new client.Gauge({
  name: 'quizup_db_pool_waiting',
  help: 'Sequelize connection pool: pending acquire requests (starvation signal)',
});

// ---- Active-user sliding window ----

const ACTIVE_WINDOW_MS = 60_000;
const lastSeenByUser = new Map<number, number>();

/** Call from the auth middleware on every authenticated request. */
export const markUserActive = (userId: number) => {
  if (typeof userId === 'number') lastSeenByUser.set(userId, Date.now());
};

/** Call where a quiz attempt is created/finished. */
export const incQuizAttempt = (status: 'started' | 'completed' | 'abandoned') => {
  quizAttemptsTotal.inc({ status });
};

const pruneAndReportActiveUsers = () => {
  const cutoff = Date.now() - ACTIVE_WINDOW_MS;
  for (const [userId, seen] of lastSeenByUser) {
    if (seen < cutoff) lastSeenByUser.delete(userId);
  }
  activeApiUsers.set(lastSeenByUser.size);
};

const reportDbPool = () => {
  try {
    // sequelize v6 exposes the underlying sequelize-pool here. Shapes vary by
    // version, so read defensively and only set what's available.
    const pool: any = (sequelize as any)?.connectionManager?.pool;
    if (!pool) return;
    if (typeof pool.size === 'number') dbPoolSize.set(pool.size);
    if (typeof pool.using === 'number') dbPoolUsed.set(pool.using);
    else if (typeof pool.borrowed === 'number') dbPoolUsed.set(pool.borrowed);
    if (typeof pool.pending === 'number') dbPoolWaiting.set(pool.pending);
    else if (typeof pool.waiting === 'number') dbPoolWaiting.set(pool.waiting);
  } catch {
    // never let metrics collection throw into the request path
  }
};

let updater: NodeJS.Timeout | null = null;

export const initMetrics = () => {
  if (updater) return;
  updater = setInterval(() => {
    pruneAndReportActiveUsers();
    reportDbPool();
  }, 15_000);
  if (typeof updater.unref === 'function') updater.unref();
  // eslint-disable-next-line no-console
  console.log('📊 Business metrics initialized (default registry, served at /metrics)');
};
