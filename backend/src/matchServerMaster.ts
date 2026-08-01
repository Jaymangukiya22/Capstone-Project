import cluster from 'cluster';
import os from 'os';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { logInfo, logError, logDebug } from './utils/logger';

import { initializeRedis, getRedisPubSub, getRedisClient } from './config/redis';
import { EnhancedWorkerPool } from './services/enhancedWorkerPool';
import sequelize from './config/database';
import { User, Quiz, QuizQuestion } from './models';
import {
  matchRegister,
  matchmakingQueueDepth,
  matchmakingMatchesFoundTotal,
  matchmakingTimeoutsTotal,
  recordMatchmakingWait,
} from './matchMetrics';
import {
  createMatchmakingQueue,
  DEFAULT_SWEEP_CONFIG,
  AUTO_MATCH_START_RANGE,
  AUTO_MATCH_TIMEOUT_MS,
  type QueueEntry,
  type MatchPair,
  type QueueSnapshot,
} from './services/matchmakingQueue';

// Mirrors middleware/auth.ts's cache key/TTL exactly, so a socket connect
// right after a REST request can hit the same warm cache entry instead of
// forcing a second DB round trip.
const AUTH_CACHE_TTL_SECONDS = 60;
const authCacheKey = (userId: number) => `user:${userId}:auth`;

dotenv.config();  

const MASTER_PORT = parseInt(process.env.MASTER_PORT || '3001', 10);

// Identifies this match-server replica across the cluster. The replica whose
// sweep pops a matchmaking pair becomes the match "owner" (stored in the
// match:<id> Redis blob); inbound client events for that match are routed to
// the owner via the Redis adapter's serverSideEmit. Single-replica default:
// owner === self, so every path short-circuits to the local worker pool.
const SERVER_ID = process.env.SERVER_ID || os.hostname();

const createSocketErrorPayload = (error: string, message: string) => {
  return { success: false, error, message };
};

// Initialize Redis and start master
(async () => {
  try {
    await initializeRedis();
    
    if (cluster.isPrimary) {
      startMaster();
    } else {
      require('./matchServerWorker');
    }
  } catch (error) {
    logError('Failed to initialize Redis', error as Error);
    process.exit(1);
  }
})();

async function startMaster() {
  logInfo('Starting Master Process', { pid: process.pid });

  try {
    await sequelize.authenticate();
    logInfo('Match server connected to database');
  } catch (error) {
    logError('Match server failed to connect to database', error as Error);
    process.exit(1);
  }

  // Initialize Redis
  const { pub, sub } = getRedisPubSub();
  const redisClient = getRedisClient();

  // Express app
  const app = express();
  const server = createServer(app);

  // Socket.IO with Redis Adapter
  const io = new SocketIOServer(server, {
    cors: {
      origin: true, // Nginx handles CORS filtering
      credentials: true
    },
    // websocket-only: we run multiple replicas behind Nginx and don't want
    // long-polling's handshake/session affinity requirements.
    transports: ['websocket'],
    adapter: createAdapter(pub, sub),
    // Fast dead-connection detection: ping every 10s, evict if no pong in 5s
    // (default ~45s). Speeds up failover across replicas.
    pingInterval: 10000,
    pingTimeout: 5000,
    // Seamlessly restore a client's rooms + missed events after a short drop,
    // so a blip does not tear down the match session. (socket.io >= 4.6)
    connectionStateRecovery: {
      maxDisconnectionDuration: parseInt(process.env.SOCKET_RECOVERY_MS || '120000', 10),
      skipMiddlewares: true
    },
    // Quiz payloads are tiny; deflate just burns CPU per message at scale.
    perMessageDeflate: false,
    // Cap payload size so a malformed/huge frame can't blow up memory.
    maxHttpBufferSize: parseInt(process.env.SOCKET_MAX_BUFFER || '65536', 10)
  });

  // Middleware
  app.use(helmet());
  app.use(compression());
  app.use(express.json());

  // Initialize Worker Pool
  const workerPool = new EnhancedWorkerPool(io, redisClient);

  // ===== AUTO matchmaking =====
  // The queue now lives behind an abstraction (Redis-backed by default so every
  // replica shares it; in-memory for MATCHMAKING_BACKEND=memory / tests). A
  // single central sweep replaces the old per-player widen/timeout timers, and
  // the finalize path CLAIMS the pair (atomic lock+ZREM) before any await, which
  // fixes the double-grab race.
  const queue = createMatchmakingQueue(redisClient);
  const sweepConfig = DEFAULT_SWEEP_CONFIG;
  const AUTO_MATCH_SWEEP_INTERVAL_MS = parseInt(
    process.env.AUTO_MATCH_SWEEP_INTERVAL_MS || '1500',
    10,
  );

  // Small in-process cache of the quiz-id pool per category so a burst of AUTO
  // matches in the same category doesn't hit the DB once per pair.
  const AUTO_MATCH_QUIZ_CACHE_TTL_MS = parseInt(
    process.env.AUTO_MATCH_QUIZ_CACHE_TTL_MS || '60000',
    10,
  );
  const quizPoolByCategory: Map<number, { quizIds: number[]; expiresAt: number }> = new Map();

  // Ring buffer of recent matched wait durations (ms) → estimatedWaitMs shown to
  // waiting players. Null until we have a few samples so we don't show noise.
  const WAIT_SAMPLE_CAP = 50;
  const recentWaitMs: number[] = [];
  const pushWait = (ms: number) => {
    recentWaitMs.push(ms);
    if (recentWaitMs.length > WAIT_SAMPLE_CAP) recentWaitMs.shift();
  };
  const estimatedWaitMs = (): number | null => {
    if (recentWaitMs.length < 5) return null;
    const mean = recentWaitMs.reduce((sum, v) => sum + v, 0) / recentWaitMs.length;
    return Math.min(AUTO_MATCH_TIMEOUT_MS, Math.max(0, Math.round(mean)));
  };

  // Throttle matchmaking_update: only emit when something the client cares about
  // changed, or at most once every UPDATE_MIN_INTERVAL_MS.
  const UPDATE_MIN_INTERVAL_MS = 2500;
  type UpdateSnapshot = {
    range: number;
    position: number;
    players: number;
    expanding: boolean;
    atMs: number;
  };
  const lastUpdateByUserId: Map<number, UpdateSnapshot> = new Map();
  const clearMatchmakingState = (userId: number) => {
    lastUpdateByUserId.delete(userId);
  };

  const emitMatchmakingErrorToBoth = (a: QueueEntry, b: QueueEntry, message: string) => {
    io.to(a.socketId).emit('matchmaking_error', createSocketErrorPayload('MATCHMAKING_FAILED', message));
    io.to(b.socketId).emit('matchmaking_error', createSocketErrorPayload('MATCHMAKING_FAILED', message));
  };

  const chooseQuizId = async (a: QueueEntry, b: QueueEntry): Promise<number | null> => {
    const preferredQuizId = a.preference.quizId || b.preference.quizId;
    if (preferredQuizId) return preferredQuizId;

    const categoryId = a.preference.categoryId;
    const now = Date.now();
    let pool = quizPoolByCategory.get(categoryId);
    if (!pool || pool.expiresAt <= now) {
      const quizQuestionRows = await QuizQuestion.findAll({
        attributes: ['quizId'],
        include: [
          {
            model: Quiz,
            as: 'quiz',
            required: true,
            where: {
              isActive: true,
              categoryId,
            },
            attributes: [],
          },
        ],
        // Bare attribute name, not 'QuizQuestion.quizId' - Sequelize doesn't
        // translate the dotted form to the underscored column (quiz_id) here,
        // it passes it through literally, and the root model's query alias is
        // "QuizQuestion" (class name) not the table name, so that string
        // produced invalid SQL (`GROUP BY "QuizQuestion"."quizId"`, a column
        // that doesn't exist - the real column is quiz_id). The bare form
        // resolves to the SELECT list's output alias, which Postgres accepts
        // directly in GROUP BY. Verified against the compiled models.
        group: ['quizId'],
        limit: 1000,
      });
      const quizIds = quizQuestionRows
        .map((row) => (row as any).quizId as number)
        .filter((id) => typeof id === 'number');
      pool = { quizIds, expiresAt: now + AUTO_MATCH_QUIZ_CACHE_TTL_MS };
      quizPoolByCategory.set(categoryId, pool);
    }

    if (!pool.quizIds.length) return null;
    const randomIndex = Math.floor(Math.random() * pool.quizIds.length);
    return pool.quizIds[randomIndex];
  };

  const createAutoMatchRedisPayload = (
    matchId: string,
    quizId: number,
    a: QueueEntry,
    b: QueueEntry,
  ) => {
    return {
      matchId,
      quizId,
      status: 'WAITING',
      createdAt: new Date().toISOString(),
      mode: 'AUTO',
      // Owner replica: the one whose sweep popped this pair. Used to route
      // inbound client events cross-replica (see routeMatchEvent).
      serverId: SERVER_ID,
      players: [
        { userId: a.userId, username: a.username },
        { userId: b.userId, username: b.username },
      ],
    };
  };

  // Cross-replica-safe: io.in([socketId]).socketsJoin() reaches a socket even if
  // it's connected to a different replica (routed via the Redis adapter).
  const joinSocketsToMatchRoom = (matchId: string, socketIds: string[]) => {
    io.in(socketIds).socketsJoin(matchId);
  };

  const forwardJoinToWorker = (workerId: number, matchId: string, entry: QueueEntry) => {
    return workerPool.sendToWorker(workerId, {
      type: 'join_match',
      matchId,
      userId: entry.userId,
      username: entry.username,
      socketId: entry.socketId,
    });
  };

  // Finalize an already-CLAIMED pair (both entries are removed from the queue
  // before we get here, so no other attempt can grab either player). On any
  // failure past this point we emit matchmaking_error and do NOT re-add them.
  const finalizePair = async (pair: MatchPair): Promise<void> => {
    const { a, b } = pair;
    const now = Date.now();
    try {
      const quizId = await chooseQuizId(a, b);
      if (!quizId) {
        emitMatchmakingErrorToBoth(a, b, 'No quizzes available for the selected category');
        clearMatchmakingState(a.userId);
        clearMatchmakingState(b.userId);
        return;
      }

      const matchId = `auto_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const matchPayload: any = createAutoMatchRedisPayload(matchId, quizId, a, b);
      await redisClient.setex(`match:${matchId}`, 3600, JSON.stringify(matchPayload));

      // Owner replica assigns one of ITS local workers.
      const workerId = await workerPool.assignMatch(matchId);
      if (!workerId) {
        emitMatchmakingErrorToBoth(a, b, 'No available workers');
        await redisClient.del(`match:${matchId}`);
        clearMatchmakingState(a.userId);
        clearMatchmakingState(b.userId);
        return;
      }
      matchPayload.workerId = workerId;
      await redisClient.setex(`match:${matchId}`, 3600, JSON.stringify(matchPayload));

      joinSocketsToMatchRoom(matchId, [a.socketId, b.socketId]);
      const sentA = forwardJoinToWorker(workerId, matchId, a);
      const sentB = forwardJoinToWorker(workerId, matchId, b);
      if (!sentA || !sentB) {
        emitMatchmakingErrorToBoth(a, b, 'Match worker not available');
        clearMatchmakingState(a.userId);
        clearMatchmakingState(b.userId);
        return;
      }

      io.to(a.socketId).emit('auto_match_found', { matchId, quizId });
      io.to(b.socketId).emit('auto_match_found', { matchId, quizId });

      const waitA = Math.max(0, now - a.startedAtMs);
      const waitB = Math.max(0, now - b.startedAtMs);
      recordMatchmakingWait(waitA / 1000);
      recordMatchmakingWait(waitB / 1000);
      matchmakingMatchesFoundTotal.inc();
      pushWait(waitA);
      pushWait(waitB);

      clearMatchmakingState(a.userId);
      clearMatchmakingState(b.userId);
    } catch (error) {
      logError('finalizePair error', error as Error);
      emitMatchmakingErrorToBoth(a, b, 'Could not start the match right now. Please try again.');
      clearMatchmakingState(a.userId);
      clearMatchmakingState(b.userId);
    }
  };

  // Emit a matchmaking_update to a still-searching player, throttled.
  const maybeEmitMatchmakingUpdate = (
    entry: QueueEntry,
    playersSearching: number,
    position: number,
    now: number,
  ) => {
    const expanding = entry.currentRange > AUTO_MATCH_START_RANGE;
    const prev = lastUpdateByUserId.get(entry.userId);
    const changed =
      !prev ||
      prev.range !== entry.currentRange ||
      prev.position !== position ||
      prev.players !== playersSearching ||
      prev.expanding !== expanding;
    const stale = !prev || now - prev.atMs >= UPDATE_MIN_INTERVAL_MS;
    if (!changed && !stale) return;

    lastUpdateByUserId.set(entry.userId, {
      range: entry.currentRange,
      position,
      players: playersSearching,
      expanding,
      atMs: now,
    });
    io.to(entry.socketId).emit('matchmaking_update', {
      range: entry.currentRange,
      elapsedMs: now - entry.startedAtMs,
      playersSearching,
      queuePosition: position,
      estimatedWaitMs: estimatedWaitMs(),
      expanding,
    });
  };

  // Zero out queue_depth series for categories that emptied since last tick so
  // Prometheus never keeps reporting a stale non-zero depth.
  let lastDepthLabels: Set<number> = new Set();
  const updateQueueDepthMetrics = (snapshot: QueueSnapshot) => {
    const current = new Set<number>();
    for (const [categoryId, depth] of snapshot.depthByCategory) {
      matchmakingQueueDepth.set({ category: String(categoryId) }, depth);
      current.add(categoryId);
    }
    for (const categoryId of lastDepthLabels) {
      if (!current.has(categoryId)) {
        matchmakingQueueDepth.set({ category: String(categoryId) }, 0);
      }
    }
    lastDepthLabels = current;
  };

  // The one central sweep: pair, time out, and push throttled status updates.
  let sweepRunning = false;
  const runSweep = async () => {
    if (sweepRunning) return; // never overlap a slow sweep with the next tick
    sweepRunning = true;
    const now = Date.now();
    try {
      const { pairs, timedOut, stillSearching } = await queue.sweep(now, sweepConfig);

      for (const pair of pairs) {
        await finalizePair(pair);
      }

      for (const entry of timedOut) {
        io.to(entry.socketId).emit(
          'auto_match_timeout',
          createSocketErrorPayload('MATCHMAKING_TIMEOUT', 'No match found within 5 minutes'),
        );
        matchmakingTimeoutsTotal.inc();
        clearMatchmakingState(entry.userId);
      }

      if (stillSearching.length) {
        const snapshot = await queue.snapshot();
        for (const entry of stillSearching) {
          const playersSearching = snapshot.depthByCategory.get(entry.preference.categoryId) || 0;
          const position = await queue.queuePosition(entry.userId);
          maybeEmitMatchmakingUpdate(entry, playersSearching, position, now);
        }
        updateQueueDepthMetrics(snapshot);
      } else {
        updateQueueDepthMetrics(await queue.snapshot());
      }
    } catch (error) {
      logError('runSweep error', error as Error);
    } finally {
      sweepRunning = false;
    }
  };

  // Route a client match event to the worker holding the match. If another
  // replica owns the match (AUTO match popped elsewhere), forward it there via
  // the adapter instead of touching the local worker pool. Single-replica:
  // match.serverId === SERVER_ID (or unset for friend matches) → local path.
  type RouteResult = 'ok' | 'forwarded' | 'no_match' | 'no_worker' | 'worker_unavailable';
  const routeMatchEvent = async (params: {
    matchId: string;
    event: string;
    data: any;
    userId: number;
    username: string;
    socketId: string;
  }): Promise<RouteResult> => {
    const matchData = await redisClient.get(`match:${params.matchId}`);
    if (!matchData) return 'no_match';
    const match = JSON.parse(matchData);

    if (match.serverId && match.serverId !== SERVER_ID) {
      io.serverSideEmit('mm_match_event', {
        matchId: params.matchId,
        userId: params.userId,
        username: params.username,
        socketId: params.socketId,
        event: params.event,
        data: params.data,
      });
      return 'forwarded';
    }

    let workerId = match.workerId;
    if (!workerId) {
      workerId = await workerPool.assignMatch(params.matchId);
      if (!workerId) return 'no_worker';
      match.workerId = workerId;
      await redisClient.setex(`match:${params.matchId}`, 3600, JSON.stringify(match));
      logInfo('Assigned worker to match', { matchId: params.matchId, workerId });
    }

    const sent = workerPool.sendToWorker(workerId, {
      type: params.event,
      matchId: params.matchId,
      userId: params.userId,
      username: params.username,
      socketId: params.socketId,
      data: params.data,
    });
    return sent ? 'ok' : 'worker_unavailable';
  };

  // Peer replicas forward events for matches WE own via serverSideEmit. Dispatch
  // to our local worker only if we're actually the owner (guards against every
  // replica acting on the broadcast).
  io.on('mm_match_event', async (payload: any) => {
    try {
      const { matchId, userId, username, socketId, event, data } = payload || {};
      if (!matchId || !event) return;
      const matchData = await redisClient.get(`match:${matchId}`);
      if (!matchData) return;
      const match = JSON.parse(matchData);
      if (match.serverId && match.serverId !== SERVER_ID) return; // not ours to run

      let workerId = match.workerId;
      if (!workerId) {
        workerId = await workerPool.assignMatch(matchId);
        if (!workerId) return;
        match.workerId = workerId;
        await redisClient.setex(`match:${matchId}`, 3600, JSON.stringify(match));
      }
      workerPool.sendToWorker(workerId, {
        type: event,
        matchId,
        userId,
        username,
        socketId,
        data,
      });
    } catch (error) {
      logError('mm_match_event dispatch error', error as Error);
    }
  });

  // ===== HTTP ENDPOINTS =====

  // Health check
  app.get('/health', (req, res) => {
    const stats = workerPool.getStats();
    res.json({
      status: 'OK',
      service: 'Match Service Master',
      version: '4.0.0',
      timestamp: new Date().toISOString(),
      workers: stats,
      matches: workerPool.getTotalMatches(),
      players: workerPool.getTotalPlayers()
    });
  });

  // Prometheus metrics
  app.get('/metrics', async (req, res) => {
    const stats = workerPool.getStats();
    const detailedStats = workerPool.getDetailedStats();

    type WorkerStatEntry = {
      workerId: number;
      pid: number;
      status: string;
      matchCount: number;
      utilization: string;
    };

    const workers = detailedStats.workers as WorkerStatEntry[];
    
    // Base metrics
    const metrics = `
# HELP matchserver_total_workers Total worker processes
# TYPE matchserver_total_workers gauge
matchserver_total_workers ${stats.totalWorkers}

# HELP matchserver_active_workers Active worker processes
# TYPE matchserver_active_workers gauge
matchserver_active_workers ${stats.activeWorkers}

# HELP matchserver_idle_workers Idle worker processes
# TYPE matchserver_idle_workers gauge
matchserver_idle_workers ${stats.idleWorkers}

# HELP matchserver_active_matches_total Total active matches
# TYPE matchserver_active_matches_total gauge
matchserver_active_matches_total ${workerPool.getTotalMatches()}

# HELP matchserver_connected_users Total connected users/players
# TYPE matchserver_connected_users gauge
matchserver_connected_users ${workerPool.getTotalPlayers()}

# HELP matchserver_total_matches Total active matches (alias)
# TYPE matchserver_total_matches gauge
matchserver_total_matches ${workerPool.getTotalMatches()}

# HELP matchserver_total_players Total connected players (alias)
# TYPE matchserver_total_players gauge
matchserver_total_players ${workerPool.getTotalPlayers()}

# HELP matchserver_matches_created_total Total matches created since startup
# TYPE matchserver_matches_created_total counter
matchserver_matches_created_total ${workerPool.getMatchesCreated()}

# HELP matchserver_uptime_seconds Master uptime in seconds
# TYPE matchserver_uptime_seconds counter
matchserver_uptime_seconds ${Math.floor(process.uptime())}
`;
    
    // Per-worker metrics
    let perWorkerMetrics = '';
    if (workers && workers.length > 0) {
      perWorkerMetrics = `
# HELP matchserver_worker_matches Matches assigned to each worker
# TYPE matchserver_worker_matches gauge
${workers.map((w) => 
  `matchserver_worker_matches{worker_id="${w.workerId}",pid="${w.pid}",status="${w.status}"} ${w.matchCount}`
).join('\n')}

# HELP matchserver_worker_utilization Worker utilization percentage
# TYPE matchserver_worker_utilization gauge
${workers.map((w) => 
  `matchserver_worker_utilization{worker_id="${w.workerId}",pid="${w.pid}"} ${parseFloat(w.utilization)}`
).join('\n')}
`;
    }
    
    // Append the prom-client registry (histograms/counters fed by worker IPC
    // + default nodejs_/process_ metrics for the master event loop).
    let promText = '';
    try {
      promText = await matchRegister.metrics();
    } catch (err) {
      logError('Failed to render prom-client metrics', err as Error);
    }

    res.set('Content-Type', 'text/plain');
    res.send(((metrics + perWorkerMetrics).trim() + '\n\n' + promText).trim());
  });

  // Create friend match (HTTP API)
  app.post('/matches/friend', async (req, res) => {
    try {
      const { quizId, userId, username } = req.body;

      if (!quizId || !userId) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_REQUIRED_FIELDS',
          message: 'Missing required fields: quizId, userId'
        });
      }

      // Store match request in Redis
      const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const joinCode = generateJoinCode();

      await redisClient.setex(`match:${matchId}`, 3600, JSON.stringify({
        matchId,
        joinCode,
        quizId,
        creatorId: userId,
        creatorName: username,
        status: 'WAITING',
        players: [],
        createdAt: new Date().toISOString()
      }));

      await redisClient.setex(`joincode:${joinCode}`, 3600, matchId);

      logInfo('Friend match created', { matchId, joinCode, quizId, userId });

      res.json({
        success: true,
        data: { matchId, joinCode }
      });
    } catch (error) {
      logError('Failed to create friend match', error as Error);
      res.status(500).json({
        success: false,
        error: 'FRIEND_MATCH_CREATE_FAILED',
        message: 'Failed to create match'
      });
    }
    return;
  });

  // Get match by join code
  app.get('/matches/code/:joinCode', async (req, res) => {
    try {
      const { joinCode } = req.params;
      const matchId = await redisClient.get(`joincode:${joinCode.toUpperCase()}`);

      if (!matchId) {
        return res.status(404).json({
          success: false,
          error: 'INVALID_JOIN_CODE',
          message: 'Match not found'
        });
      }

      const matchData = await redisClient.get(`match:${matchId}`);
      if (!matchData) {
        return res.status(404).json({
          success: false,
          error: 'MATCH_NOT_FOUND',
          message: 'Match data not found'
        });
      }

      const match = JSON.parse(matchData);
      res.json({
        success: true,
        data: { match }
      });
    } catch (error) {
      logError('Failed to get match by code', error as Error);
      res.status(500).json({
        success: false,
        error: 'MATCH_FETCH_FAILED',
        message: 'Could not load match details right now. Please try again.'
      });
    }
    return;
  });

  // Worker stats
  app.get('/workers/stats', (req, res) => {
    res.json({
      success: true,
      data: workerPool.getDetailedStats()
    });
  });

  // ===== SOCKET.IO HANDLERS =====

  io.on('connection', (socket) => {
    logInfo('Client connected to master', { socketId: socket.id });

    // Authenticate - verifies the same JWT the REST API issues (see
    // backend/src/utils/auth.ts generateToken / middleware/auth.ts
    // authenticateToken). Previously this trusted whatever userId/username
    // the client sent with zero verification, letting any socket claim to
    // be any user (see AUDIT_FINDINGS.md S1) - every downstream action
    // (join_match, submit_answer, player_ready, etc.) trusts
    // socket.data.userId, so this is the single point that must be real.
    socket.on('authenticate', async (data) => {
      try {
        const token = data?.token;
        if (!token || typeof token !== 'string') {
          socket.emit(
            'auth_error',
            { success: false, error: 'INVALID_TOKEN', message: 'Authentication token is required.' }
          );
          return;
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          logError('JWT_SECRET not configured', new Error('Missing JWT_SECRET'));
          socket.emit(
            'auth_error',
            createSocketErrorPayload('AUTH_FAILED', 'Authentication failed')
          );
          return;
        }

        let decoded: any;
        try {
          decoded = jwt.verify(token, jwtSecret);
        } catch (verifyError) {
          socket.emit(
            'auth_error',
            { success: false, error: 'INVALID_TOKEN', message: 'Your session has expired. Please log in again.' }
          );
          return;
        }

        const userId = decoded?.userId;
        if (!userId) {
          socket.emit(
            'auth_error',
            { success: false, error: 'INVALID_USER', message: 'Invalid authentication token.' }
          );
          return;
        }

        // Same cache-or-DB isActive check as the REST middleware, so a
        // deactivated/deleted account can't keep using a still-valid JWT on
        // the match server after being locked out of the REST API.
        let isActive = true;
        try {
          const cached = await redisClient.get(authCacheKey(userId));
          if (cached) {
            isActive = JSON.parse(cached).isActive !== false;
          } else {
            const dbUser = await User.findByPk(userId, { attributes: ['id', 'isActive'] });
            if (!dbUser) {
              socket.emit(
                'auth_error',
                { success: false, error: 'INVALID_USER', message: 'Your session has expired. Please log in again.' }
              );
              return;
            }
            isActive = dbUser.isActive;
          }
        } catch (cacheError) {
          logError('Auth cache/DB check failed during socket authenticate, allowing on valid JWT alone', cacheError as Error);
        }

        if (!isActive) {
          socket.emit(
            'auth_error',
            { success: false, error: 'USER_BANNED', message: 'Your account is deactivated.' }
          );
          return;
        }

        // Identity comes from the VERIFIED token claims, never from the
        // client-supplied payload.
        const username = decoded.username || `Player${userId}`;

        socket.data.userId = userId;
        socket.data.username = username;

        socket.emit('authenticated', {
          success: true,
          userId,
          username,
          message: 'Authenticated',
          user: { id: userId, username }
        });

        logInfo('User authenticated', { userId, username, socketId: socket.id });
      } catch (error) {
        socket.emit(
          'auth_error',
          createSocketErrorPayload('AUTH_FAILED', 'Authentication failed')
        );
        logError('Authentication error', error as Error);
      }
    });

    socket.on('start_auto_matchmaking', async (data: { categoryId: number; quizId?: number }) => {
      try {
        if (!socket.data.userId) {
          socket.emit(
            'error',
            createSocketErrorPayload('AUTH_REQUIRED', 'Please log in to continue.')
          );
          return;
        }

        const categoryId = Number(data.categoryId);
        const quizId = data.quizId ? Number(data.quizId) : undefined;

        if (!categoryId || Number.isNaN(categoryId)) {
          socket.emit(
            'matchmaking_error',
            createSocketErrorPayload(
              'VALIDATION_ERROR',
              'Please select a category to start matchmaking.'
            )
          );
          return;
        }

        // Clear any prior search for this user before starting a new one.
        await queue.remove(socket.data.userId);
        clearMatchmakingState(socket.data.userId);

        const user = await User.findByPk(socket.data.userId, {
          attributes: ['id', 'eloRating'],
        });

        const eloRating = user ? (user as any).eloRating : 1200;

        const entry: QueueEntry = {
          socketId: socket.id,
          userId: socket.data.userId,
          username: socket.data.username,
          eloRating,
          preference: { categoryId, quizId },
          startedAtMs: Date.now(),
          currentRange: AUTO_MATCH_START_RANGE,
          serverId: SERVER_ID,
        };

        // No per-player timers: widening + timeout are handled by the central
        // sweep (runSweep). We just enqueue and try once immediately so a
        // waiting partner is matched on the same tick.
        await queue.enqueue(entry);

        const playersSearching = await queue.countByCategory(categoryId);
        const position = await queue.queuePosition(entry.userId);
        socket.emit('matchmaking_started', {
          range: entry.currentRange,
          elapsedMs: 0,
          playersSearching,
          queuePosition: position,
          estimatedWaitMs: estimatedWaitMs(),
          expanding: false,
        });

        // Immediate same-tick attempt: find the closest-ELO waiting partner and
        // CLAIM the pair (atomic) before any await in finalizePair.
        const partner = await queue.findBestMatchFor(entry);
        if (partner) {
          const claimed = await queue.claimPair(entry.userId, partner.userId);
          if (claimed) {
            await finalizePair(claimed);
          }
        }
      } catch (error) {
        logError('start_auto_matchmaking error', error as Error);
        socket.emit(
          'matchmaking_error',
          createSocketErrorPayload(
            'MATCHMAKING_START_FAILED',
            'Could not start matchmaking right now. Please try again.'
          )
        );
      }
    });

    socket.on('cancel_auto_matchmaking', async () => {
      if (!socket.data.userId) return;
      await queue.remove(socket.data.userId);
      clearMatchmakingState(socket.data.userId);
      socket.emit('matchmaking_cancelled', { success: true });
    });

    // Create friend match (DO NOT assign worker yet - wait for first player to join)
    socket.on('create_friend_match', async (data) => {
      try {
        if (!socket.data.userId) {
          return socket.emit(
            'error',
            createSocketErrorPayload('AUTH_REQUIRED', 'Please log in to continue.')
          );
        }

        const { quizId } = data;
        const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const joinCode = generateJoinCode();

        // Store match metadata WITHOUT workerId - will be assigned when first player joins
        await redisClient.setex(`match:${matchId}`, 3600, JSON.stringify({
          matchId,
          joinCode,
          quizId,
          creatorId: socket.data.userId,
          status: 'WAITING',
          createdAt: new Date().toISOString()
          // NOTE: workerId will be set when first player joins
        }));

        await redisClient.setex(`joincode:${joinCode}`, 3600, matchId);

        socket.join(matchId);
        socket.emit('friend_match_created', { matchId, joinCode });

        logInfo('Friend match created (worker will be assigned on first join)', { matchId, joinCode, quizId, creatorId: socket.data.userId });
      } catch (error) {
        logError('Create match error', error as Error);
        socket.emit(
          'error',
          createSocketErrorPayload(
            'FRIEND_MATCH_CREATE_FAILED',
            'Could not create a friend match right now. Please try again.'
          )
        );
      }
      return;
    });

    // Join match by code
    socket.on('join_match', async (data) => {
      try {
        if (!socket.data.userId) {
          return socket.emit(
            'error',
            createSocketErrorPayload('AUTH_REQUIRED', 'Please log in to continue.')
          );
        }

        const { joinCode } = data;
        const matchId = await redisClient.get(`joincode:${joinCode.toUpperCase()}`);

        if (!matchId) {
          return socket.emit(
            'error',
            createSocketErrorPayload(
              'INVALID_JOIN_CODE',
              'Join code is invalid or expired. Please check and try again.'
            )
          );
        }

        const matchData = await redisClient.get(`match:${matchId}`);
        if (!matchData) {
          return socket.emit(
            'error',
            createSocketErrorPayload(
              'MATCH_NOT_FOUND',
              'Match not found. It may have ended or expired.'
            )
          );
        }

        // Assign worker if not already assigned
        const match = JSON.parse(matchData);
        let workerId = match.workerId;

        if (!workerId) {
          // Assign to least-loaded worker
          workerId = await workerPool.assignMatch(matchId);
          if (!workerId) {
            logError('No available workers', new Error(`Cannot assign match ${matchId}`));
            socket.emit(
              'error',
              createSocketErrorPayload(
                'NO_AVAILABLE_WORKERS',
                'No match workers are available right now. Please try again.'
              )
            );
            // Broadcast to all clients in match room
            io.to(matchId).emit(
              'error',
              createSocketErrorPayload(
                'NO_AVAILABLE_WORKERS',
                'No match workers are available right now. Please try again.'
              )
            );
            return;
          }
          // Update Redis with assigned worker
          match.workerId = workerId;
          await redisClient.setex(`match:${matchId}`, 3600, JSON.stringify(match));
          logInfo('Assigned worker to match', { matchId, workerId });
        }

        // Forward to worker
        const sent = workerPool.sendToWorker(workerId, {
          type: 'join_match',
          matchId,
          userId: socket.data.userId,
          username: socket.data.username,
          socketId: socket.id
        });

        if (!sent) {
          logError('Failed to send join request to worker', new Error(`Worker ${workerId} unavailable for match ${matchId}`));
          socket.emit(
            'error',
            createSocketErrorPayload(
              'MATCH_WORKER_UNAVAILABLE',
              'Match worker is not available right now. Please try again.'
            )
          );
          // Broadcast to all clients in match room
          io.to(matchId).emit(
            'error',
            createSocketErrorPayload(
              'MATCH_WORKER_UNAVAILABLE',
              'Match worker is not available right now. Please try again.'
            )
          );
          return;
        }

        socket.join(matchId);
        socket.emit('match_joined', { matchId });

        logInfo('Player joining match on worker', { matchId, workerId, userId: socket.data.userId });
      } catch (error) {
        logError('Join match error', error as Error);
        socket.emit(
          'error',
          createSocketErrorPayload(
            'MATCH_JOIN_FAILED',
            'Could not join match right now. Please try again.'
          )
        );
      }
      return;
    });

    // Alias for join_match_by_code (frontend sends this event)
    socket.on('join_match_by_code', async (data) => {
      try {
        if (!socket.data.userId) {
          return socket.emit(
            'error',
            createSocketErrorPayload('AUTH_REQUIRED', 'Please log in to continue.')
          );
        }

        const { joinCode } = data;
        logInfo('Player attempting to join match by code', { joinCode, userId: socket.data.userId });
        
        const matchId = await redisClient.get(`joincode:${joinCode.toUpperCase()}`);

        if (!matchId) {
          logInfo('Match not found for join code', { joinCode });
          return socket.emit(
            'error',
            createSocketErrorPayload(
              'INVALID_JOIN_CODE',
              'Join code is invalid or expired. Please check and try again.'
            )
          );
        }

        const matchData = await redisClient.get(`match:${matchId}`);
        if (!matchData) {
          logInfo('Match data not found in Redis', { matchId });
          return socket.emit(
            'error',
            createSocketErrorPayload(
              'MATCH_NOT_FOUND',
              'Match not found. It may have ended or expired.'
            )
          );
        }

        // Assign worker if not already assigned
        const match = JSON.parse(matchData);
        let workerId = match.workerId;

        if (!workerId) {
          // Assign to least-loaded worker
          workerId = await workerPool.assignMatch(matchId);
          if (!workerId) {
            logError('No available workers', new Error(`Cannot assign match ${matchId}`));
            socket.emit(
              'error',
              createSocketErrorPayload(
                'NO_AVAILABLE_WORKERS',
                'No match workers are available right now. Please try again.'
              )
            );
            // Broadcast to all clients in match room
            io.to(matchId).emit(
              'error',
              createSocketErrorPayload(
                'NO_AVAILABLE_WORKERS',
                'No match workers are available right now. Please try again.'
              )
            );
            return;
          }
          // Update Redis with assigned worker
          match.workerId = workerId;
          await redisClient.setex(`match:${matchId}`, 3600, JSON.stringify(match));
          logInfo('Assigned worker to match', { matchId, workerId });
        }

        // Forward to worker
        logInfo('Forwarding join request to worker', { matchId, workerId, userId: socket.data.userId });
        
        const sent = workerPool.sendToWorker(workerId, {
          type: 'join_match',
          matchId,
          userId: socket.data.userId,
          username: socket.data.username,
          socketId: socket.id
        });

        if (!sent) {
          logError('Failed to send join request to worker', new Error(`Worker ${workerId} unavailable for match ${matchId}`));
          socket.emit(
            'error',
            createSocketErrorPayload(
              'MATCH_WORKER_UNAVAILABLE',
              'Match worker is not available right now. Please try again.'
            )
          );
          // Broadcast to all clients in match room
          io.to(matchId).emit(
            'error',
            createSocketErrorPayload(
              'MATCH_WORKER_UNAVAILABLE',
              'Match worker is not available right now. Please try again.'
            )
          );
          return;
        }

        // Join socket to room immediately
        socket.join(matchId);
        
        // Emit confirmation to client
        socket.emit('match_joined', { matchId });
        
        // Broadcast player joined to all in room
        io.to(matchId).emit('player_joined_notification', {
          userId: socket.data.userId,
          username: socket.data.username
        });

        logInfo('Player joining match on worker', { matchId, workerId, userId: socket.data.userId, joinCode });
      } catch (error) {
        logError('Join match by code error', error as Error);
        socket.emit(
          'error',
          createSocketErrorPayload(
            'MATCH_JOIN_FAILED',
            'Could not join match right now. Please try again.'
          )
        );
      }
      return;
    });

    // Connect to match by matchId (creator joining their own match)
    socket.on('connect_to_match', async (data) => {
      try {
        if (!socket.data.userId) {
          return socket.emit(
            'error',
            createSocketErrorPayload('AUTH_REQUIRED', 'Please log in to continue.')
          );
        }

        const { matchId } = data;
        if (!matchId) {
          return socket.emit(
            'error',
            createSocketErrorPayload(
              'VALIDATION_ERROR',
              'Match ID is required to connect.'
            )
          );
        }

        const matchData = await redisClient.get(`match:${matchId}`);
        if (!matchData) {
          logInfo('Match not found for connect_to_match', { matchId });
          return socket.emit(
            'error',
            createSocketErrorPayload(
              'MATCH_NOT_FOUND',
              'Match not found. It may have ended or expired.'
            )
          );
        }

        // Assign worker if not already assigned
        const match = JSON.parse(matchData);
        let workerId = match.workerId;

        if (!workerId) {
          // Assign to least-loaded worker
          workerId = await workerPool.assignMatch(matchId);
          if (!workerId) {
            logError('No available workers', new Error(`Cannot assign match ${matchId}`));
            socket.emit(
              'error',
              createSocketErrorPayload(
                'NO_AVAILABLE_WORKERS',
                'No match workers are available right now. Please try again.'
              )
            );
            io.to(matchId).emit(
              'error',
              createSocketErrorPayload(
                'NO_AVAILABLE_WORKERS',
                'No match workers are available right now. Please try again.'
              )
            );
            return;
          }
          // Update Redis with assigned worker IMMEDIATELY
          match.workerId = workerId;
          await redisClient.setex(`match:${matchId}`, 3600, JSON.stringify(match));
          logInfo('Assigned worker to match', { matchId, workerId });
        } else {
          logInfo('Match already assigned to worker', { matchId, workerId });
        }

        // Forward to worker
        logInfo('Forwarding connect_to_match to worker', { matchId, workerId, userId: socket.data.userId });
        
        const sent = workerPool.sendToWorker(workerId, {
          type: 'join_match',
          matchId,
          userId: socket.data.userId,
          username: socket.data.username,
          socketId: socket.id
        });

        if (!sent) {
          logError('Failed to send connect request to worker', new Error(`Worker ${workerId} unavailable for match ${matchId}`));
          socket.emit(
            'error',
            createSocketErrorPayload(
              'MATCH_WORKER_UNAVAILABLE',
              'Match worker is not available right now. Please try again.'
            )
          );
          io.to(matchId).emit(
            'error',
            createSocketErrorPayload(
              'MATCH_WORKER_UNAVAILABLE',
              'Match worker is not available right now. Please try again.'
            )
          );
          return;
        }

        // Join socket to room immediately
        socket.join(matchId);
        
        // Emit confirmation to client
        socket.emit('match_joined', { matchId });
        
        // Broadcast player joined to all in room
        io.to(matchId).emit('player_joined_notification', {
          userId: socket.data.userId,
          username: socket.data.username
        });

        logInfo('Player connecting to match on worker', { matchId, workerId, userId: socket.data.userId });
      } catch (error) {
        logError('Connect to match error', error as Error);
        socket.emit(
          'error',
          createSocketErrorPayload(
            'MATCH_CONNECT_FAILED',
            'Could not connect to the match right now. Please try again.'
          )
        );
      }
      return;
    });

    // Persist reconnection state when client is closing/unloading.
    // This is handled at the master level (not the worker) so the backend
    // pending-match endpoint can reliably find Redis keys.
    socket.on('client_closing', async (data: { matchId?: string } = {}) => {
      try {
        const userId = socket.data.userId;
        if (!userId) {
          logDebug('client_closing ignored - missing userId on socket', {
            socketId: socket.id,
          });
          return;
        }

        const matchId = data.matchId || await workerPool.getUserMatch(userId);
        if (!matchId) {
          logDebug('client_closing ignored - missing matchId', {
            userId,
            socketId: socket.id,
            payloadMatchId: data.matchId,
          });
          return;
        }

        const matchData = await redisClient.get(`match:${matchId}`);
        if (!matchData) {
          logDebug('client_closing ignored - match not found in Redis', {
            userId,
            matchId,
          });
          return;
        }

        const match = JSON.parse(matchData);
        const deadline = Date.now() + 30000;
        const joinCode = typeof match?.joinCode === 'string' ? match.joinCode : '';

        logInfo('Client closing - persisting pending match state (master)', {
          userId,
          matchId,
        });

        io.to(matchId).emit('player_disconnected', {
          userId,
          username: socket.data.username,
          message: `${socket.data.username} disconnected. Waiting up to 30 seconds for reconnection...`,
          reconnectionWindowSeconds: 30,
          deadline,
        });

        const disconnectState = {
          userId,
          matchId,
          joinCode,
          username: socket.data.username,
          disconnectedAt: Date.now(),
          deadline,
          status: 'DISCONNECTED',
          matchStatus: match?.status,
          currentQuestionIndex: (match?.currentQuestionIndex ?? 0) + 1,
          // Worker snapshot now stores a totalQuestions count instead of the full
          // questions array; fall back to the old field for any in-flight snapshot.
          totalQuestions: match?.totalQuestions ?? match?.questions?.length ?? 0,
        };

        await redisClient.setex(
          `user:${userId}:pending_match`,
          30,
          JSON.stringify(disconnectState)
        );
        await redisClient.setex(
          `match:${matchId}:disconnected:${userId}`,
          30,
          'true'
        );

        logInfo('client_closing persisted pending match state to Redis (master)', {
          userId,
          matchId,
          pendingKey: `user:${userId}:pending_match`,
        });
      } catch (error) {
        logError('client_closing handler error (master)', error as Error);
      }
    });

    // Forward all other events to appropriate worker
    const forwardEvents = [
      'player_ready',
      'submit_answer',
      'CLIENT_READY'
      // 'disconnect'
    ];

    forwardEvents.forEach(eventName => {
      socket.on(eventName, async (data) => {
        try {
          const matchId = data.matchId || await workerPool.getUserMatch(socket.data.userId);
          if (!matchId) {
            return socket.emit(
              'error',
              createSocketErrorPayload(
                'MATCH_NOT_FOUND',
                'You are not currently in a match.'
              )
            );
          }

          // routeMatchEvent sends to the local worker, or forwards to the owner
          // replica (AUTO match popped elsewhere) via the adapter. Single-replica
          // and friend matches always take the local path.
          const result = await routeMatchEvent({
            matchId,
            event: eventName,
            data,
            userId: socket.data.userId,
            username: socket.data.username,
            socketId: socket.id,
          });

          if (result === 'no_match') {
            return socket.emit(
              'error',
              createSocketErrorPayload(
                'MATCH_NOT_FOUND',
                'Match not found. It may have ended or expired.'
              )
            );
          }
          if (result === 'no_worker') {
            logError('No available workers', new Error(`Cannot assign match ${matchId}`));
            socket.emit(
              'error',
              createSocketErrorPayload(
                'NO_AVAILABLE_WORKERS',
                'No match workers are available right now. Please try again.'
              )
            );
            io.to(matchId).emit(
              'error',
              createSocketErrorPayload(
                'NO_AVAILABLE_WORKERS',
                'No match workers are available right now. Please try again.'
              )
            );
            return;
          }
          if (result === 'worker_unavailable') {
            logError('Failed to send event to worker', new Error(`Worker unavailable for event ${eventName}`));
            return socket.emit(
              'error',
              createSocketErrorPayload(
                'MATCH_WORKER_UNAVAILABLE',
                'Match worker is not available right now. Please try again.'
              )
            );
          }
          // 'ok' (dispatched locally) or 'forwarded' (owner replica): nothing else.
        } catch (error) {
          logError(`Error forwarding ${eventName}`, error as Error);
        }
        return;
      });
    });

    socket.on('disconnect', () => {
      if (socket.data.userId) {
        Promise.resolve(queue.remove(socket.data.userId)).catch((error) =>
          logError('Failed to remove user from matchmaking queue on disconnect', error as Error),
        );
        clearMatchmakingState(socket.data.userId);
      }
    });
  });

  // Start server
  server.listen(MASTER_PORT, '0.0.0.0', () => {
    logInfo('Master server started', {
      port: MASTER_PORT,
      host: '0.0.0.0',
      pid: process.pid,
      serverId: SERVER_ID
    });
  });

  // Central matchmaking sweep: the single driver of widening, pairing, timeouts,
  // and throttled status updates (replaces the old per-player timers).
  const sweepInterval: NodeJS.Timeout = setInterval(() => {
    runSweep().catch((error) => logError('sweep tick error', error as Error));
  }, AUTO_MATCH_SWEEP_INTERVAL_MS);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logInfo('SIGTERM received, shutting down gracefully');
    clearInterval(sweepInterval);
    await workerPool.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logInfo('SIGINT received, shutting down gracefully');
    clearInterval(sweepInterval);
    await workerPool.shutdown();
    process.exit(0);
  });
}

function generateJoinCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}