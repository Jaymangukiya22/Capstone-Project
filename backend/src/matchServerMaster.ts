import cluster from 'cluster';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { logInfo, logError } from './utils/logger';
import { initializeRedis, getRedisPubSub, getRedisClient } from './config/redis';
import { EnhancedWorkerPool } from './services/enhancedWorkerPool';
import sequelize from './config/database';
import { User, Quiz } from './models';

dotenv.config();  

const MASTER_PORT = parseInt(process.env.MASTER_PORT || '3001', 10);

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
    transports: ['websocket', 'polling'],
    adapter: createAdapter(pub, sub)
  });

  // Middleware
  app.use(helmet());
  app.use(compression());
  app.use(express.json());

  // Initialize Worker Pool
  const workerPool = new EnhancedWorkerPool(io, redisClient);

  type AutoMatchmakingPreference = {
    categoryId: number;
    quizId?: number;
  };

  type AutoMatchmakingEntry = {
    socketId: string;
    userId: number;
    username: string;
    eloRating: number;
    preference: AutoMatchmakingPreference;
    startedAtMs: number;
    currentRange: number;
    widenTimer?: NodeJS.Timeout;
    timeoutTimer?: NodeJS.Timeout;
  };

  const autoMatchQueueByUserId: Map<number, AutoMatchmakingEntry> = new Map();

  const AUTO_MATCH_TIMEOUT_MS = 5 * 60 * 1000;
  const AUTO_MATCH_START_RANGE = 50;
  const AUTO_MATCH_RANGE_STEP = 50;
  const AUTO_MATCH_MAX_RANGE = 300;
  const AUTO_MATCH_WIDEN_INTERVAL_MS = 15 * 1000;

  const cleanupAutoQueueEntry = (userId: number) => {
    const entry = autoMatchQueueByUserId.get(userId);
    if (!entry) return;
    if (entry.widenTimer) clearInterval(entry.widenTimer);
    if (entry.timeoutTimer) clearTimeout(entry.timeoutTimer);
    autoMatchQueueByUserId.delete(userId);
  };

  const emitMatchmakingErrorToBoth = (a: AutoMatchmakingEntry, b: AutoMatchmakingEntry, message: string) => {
    io.to(a.socketId).emit('matchmaking_error', { message });
    io.to(b.socketId).emit('matchmaking_error', { message });
  };

  const isCompatible = (a: AutoMatchmakingEntry, b: AutoMatchmakingEntry) => {
    if (a.userId === b.userId) return false;
    if (a.preference.categoryId !== b.preference.categoryId) return false;

    const aQuizId = a.preference.quizId;
    const bQuizId = b.preference.quizId;
    if (aQuizId && bQuizId) return aQuizId === bQuizId;
    return true;
  };

  const canMatchByElo = (a: AutoMatchmakingEntry, b: AutoMatchmakingEntry) => {
    const diff = Math.abs(a.eloRating - b.eloRating);
    const allowed = Math.max(a.currentRange, b.currentRange);
    return diff <= allowed;
  };

  const chooseQuizId = async (a: AutoMatchmakingEntry, b: AutoMatchmakingEntry) => {
    const preferredQuizId = a.preference.quizId || b.preference.quizId;
    if (preferredQuizId) return preferredQuizId;

    const quizzes = await Quiz.findAll({
      where: {
        isActive: true,
        categoryId: a.preference.categoryId,
      },
      attributes: ['id'],
    });

    if (!quizzes.length) return null;
    const randomIndex = Math.floor(Math.random() * quizzes.length);
    return (quizzes[randomIndex] as any).id as number;
  };

  const createAutoMatchRedisPayload = (
    matchId: string,
    quizId: number,
    a: AutoMatchmakingEntry,
    b: AutoMatchmakingEntry,
  ) => {
    return {
      matchId,
      quizId,
      status: 'WAITING',
      createdAt: new Date().toISOString(),
      mode: 'AUTO',
      players: [
        { userId: a.userId, username: a.username },
        { userId: b.userId, username: b.username },
      ],
    };
  };

  const joinSocketsToMatchRoom = (matchId: string, socketIds: string[]) => {
    for (const socketId of socketIds) {
      const s = io.sockets.sockets.get(socketId);
      if (s) s.join(matchId);
    }
  };

  const forwardJoinToWorker = (
    workerId: number,
    matchId: string,
    entry: AutoMatchmakingEntry,
  ) => {
    return workerPool.sendToWorker(workerId, {
      type: 'join_match',
      matchId,
      userId: entry.userId,
      username: entry.username,
      socketId: entry.socketId,
    });
  };

  const finalizeAutoMatch = (a: AutoMatchmakingEntry, b: AutoMatchmakingEntry, matchId: string, quizId: number) => {
    io.to(a.socketId).emit('auto_match_found', { matchId, quizId });
    io.to(b.socketId).emit('auto_match_found', { matchId, quizId });
    cleanupAutoQueueEntry(a.userId);
    cleanupAutoQueueEntry(b.userId);
  };

  const tryFindMatchFor = async (entry: AutoMatchmakingEntry) => {
    for (const other of autoMatchQueueByUserId.values()) {
      if (!isCompatible(entry, other) || !canMatchByElo(entry, other)) continue;
      const quizId = await chooseQuizId(entry, other);
      if (!quizId) {
        emitMatchmakingErrorToBoth(entry, other, 'No quizzes available for the selected category');
        cleanupAutoQueueEntry(entry.userId);
        cleanupAutoQueueEntry(other.userId);
        return;
      }
      const matchId = `auto_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const matchPayload: any = createAutoMatchRedisPayload(matchId, quizId, entry, other);
      await redisClient.setex(`match:${matchId}`, 3600, JSON.stringify(matchPayload));
      const workerId = await workerPool.assignMatch(matchId);
      if (!workerId) {
        emitMatchmakingErrorToBoth(entry, other, 'No available workers');
        await redisClient.del(`match:${matchId}`);
        cleanupAutoQueueEntry(entry.userId);
        cleanupAutoQueueEntry(other.userId);
        return;
      }
      matchPayload.workerId = workerId;
      await redisClient.setex(`match:${matchId}`, 3600, JSON.stringify(matchPayload));
      joinSocketsToMatchRoom(matchId, [entry.socketId, other.socketId]);
      const sentA = forwardJoinToWorker(workerId, matchId, entry);
      const sentB = forwardJoinToWorker(workerId, matchId, other);
      if (!sentA || !sentB) {
        emitMatchmakingErrorToBoth(entry, other, 'Match worker not available');
        cleanupAutoQueueEntry(entry.userId);
        cleanupAutoQueueEntry(other.userId);
        return;
      }
      finalizeAutoMatch(entry, other, matchId, quizId);
      return;
    }
  };

  const getPlayersSearchingForCategory = (categoryId: number) => {
    let count = 0;
    for (const entry of autoMatchQueueByUserId.values()) {
      if (entry.preference.categoryId === categoryId) count += 1;
    }
    return count;
  };

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
    if (detailedStats.workers && detailedStats.workers.length > 0) {
      perWorkerMetrics = `
# HELP matchserver_worker_matches Matches assigned to each worker
# TYPE matchserver_worker_matches gauge
${detailedStats.workers.map(w => 
  `matchserver_worker_matches{worker_id="${w.workerId}",pid="${w.pid}",status="${w.status}"} ${w.matchCount}`
).join('\n')}

# HELP matchserver_worker_utilization Worker utilization percentage
# TYPE matchserver_worker_utilization gauge
${detailedStats.workers.map(w => 
  `matchserver_worker_utilization{worker_id="${w.workerId}",pid="${w.pid}"} ${parseFloat(w.utilization)}`
).join('\n')}
`;
    }
    
    res.set('Content-Type', 'text/plain');
    res.send((metrics + perWorkerMetrics).trim());
  });

  // Create friend match (HTTP API)
  app.post('/matches/friend', async (req, res) => {
    try {
      const { quizId, userId, username } = req.body;

      if (!quizId || !userId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: quizId, userId'
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
        error: 'Failed to create match'
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
          error: 'Match not found'
        });
      }

      const matchData = await redisClient.get(`match:${matchId}`);
      if (!matchData) {
        return res.status(404).json({
          success: false,
          error: 'Match data not found'
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
        error: 'Failed to get match'
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

    // Authenticate
    socket.on('authenticate', async (data) => {
      try {
        const userId = data.userId || data.id;
        const username = data.username || `Player${userId}`;

        socket.data.userId = userId;
        socket.data.username = username;

        socket.emit('authenticated', { 
          user: { id: userId, username } 
        });

        logInfo('User authenticated', { userId, username, socketId: socket.id });
      } catch (error) {
        socket.emit('auth_error', { message: 'Authentication failed' });
        logError('Authentication error', error as Error);
      }
    });

    socket.on('start_auto_matchmaking', async (data: { categoryId: number; quizId?: number }) => {
      try {
        if (!socket.data.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        const categoryId = Number(data.categoryId);
        const quizId = data.quizId ? Number(data.quizId) : undefined;

        if (!categoryId || Number.isNaN(categoryId)) {
          socket.emit('matchmaking_error', { message: 'categoryId is required' });
          return;
        }

        cleanupAutoQueueEntry(socket.data.userId);

        const user = await User.findByPk(socket.data.userId, {
          attributes: ['id', 'eloRating'],
        });

        const eloRating = user ? (user as any).eloRating : 1200;

        const entry: AutoMatchmakingEntry = {
          socketId: socket.id,
          userId: socket.data.userId,
          username: socket.data.username,
          eloRating,
          preference: { categoryId, quizId },
          startedAtMs: Date.now(),
          currentRange: AUTO_MATCH_START_RANGE,
        };

        entry.widenTimer = setInterval(() => {
          const current = autoMatchQueueByUserId.get(entry.userId);
          if (!current) return;
          current.currentRange = Math.min(AUTO_MATCH_MAX_RANGE, current.currentRange + AUTO_MATCH_RANGE_STEP);
          io.to(current.socketId).emit('matchmaking_update', {
            range: current.currentRange,
            elapsedMs: Date.now() - current.startedAtMs,
            playersSearching: getPlayersSearchingForCategory(current.preference.categoryId),
          });
          tryFindMatchFor(current).catch(() => {});
        }, AUTO_MATCH_WIDEN_INTERVAL_MS);

        entry.timeoutTimer = setTimeout(() => {
          const current = autoMatchQueueByUserId.get(entry.userId);
          if (!current) return;
          io.to(current.socketId).emit('auto_match_timeout', {
            message: 'No match found within 5 minutes',
          });
          cleanupAutoQueueEntry(entry.userId);
        }, AUTO_MATCH_TIMEOUT_MS);

        autoMatchQueueByUserId.set(entry.userId, entry);
        socket.emit('matchmaking_started', {
          range: entry.currentRange,
          playersSearching: getPlayersSearchingForCategory(entry.preference.categoryId),
        });

        await tryFindMatchFor(entry);
      } catch (error) {
        logError('start_auto_matchmaking error', error as Error);
        socket.emit('matchmaking_error', { message: 'Failed to start matchmaking' });
      }
    });

    socket.on('cancel_auto_matchmaking', () => {
      if (!socket.data.userId) return;
      cleanupAutoQueueEntry(socket.data.userId);
      socket.emit('matchmaking_cancelled', { success: true });
    });

    // Create friend match (DO NOT assign worker yet - wait for first player to join)
    socket.on('create_friend_match', async (data) => {
      try {
        if (!socket.data.userId) {
          return socket.emit('error', { message: 'Not authenticated' });
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
        socket.emit('error', { message: 'Failed to create match' });
      }
      return;
    });

    // Join match by code
    socket.on('join_match', async (data) => {
      try {
        if (!socket.data.userId) {
          return socket.emit('error', { message: 'Not authenticated' });
        }

        const { joinCode } = data;
        const matchId = await redisClient.get(`joincode:${joinCode.toUpperCase()}`);

        if (!matchId) {
          return socket.emit('error', { message: 'Invalid join code' });
        }

        const matchData = await redisClient.get(`match:${matchId}`);
        if (!matchData) {
          return socket.emit('error', { message: 'Match not found' });
        }

        // Assign worker if not already assigned
        const match = JSON.parse(matchData);
        let workerId = match.workerId;

        if (!workerId) {
          // Assign to least-loaded worker
          workerId = await workerPool.assignMatch(matchId);
          if (!workerId) {
            logError('No available workers', new Error(`Cannot assign match ${matchId}`));
            socket.emit('error', { message: 'No available workers' });
            // Broadcast to all clients in match room
            io.to(matchId).emit('error', { message: 'No available workers' });
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
          socket.emit('error', { message: 'Match worker not available' });
          // Broadcast to all clients in match room
          io.to(matchId).emit('error', { message: 'Match worker not available' });
          return;
        }

        socket.join(matchId);
        socket.emit('match_joined', { matchId });

        logInfo('Player joining match on worker', { matchId, workerId, userId: socket.data.userId });
      } catch (error) {
        logError('Join match error', error as Error);
        socket.emit('error', { message: 'Failed to join match' });
      }
      return;
    });

    // Alias for join_match_by_code (frontend sends this event)
    socket.on('join_match_by_code', async (data) => {
      try {
        if (!socket.data.userId) {
          return socket.emit('error', { message: 'Not authenticated' });
        }

        const { joinCode } = data;
        logInfo('Player attempting to join match by code', { joinCode, userId: socket.data.userId });
        
        const matchId = await redisClient.get(`joincode:${joinCode.toUpperCase()}`);

        if (!matchId) {
          logInfo('Match not found for join code', { joinCode });
          return socket.emit('error', { message: 'Invalid join code' });
        }

        const matchData = await redisClient.get(`match:${matchId}`);
        if (!matchData) {
          logInfo('Match data not found in Redis', { matchId });
          return socket.emit('error', { message: 'Match not found' });
        }

        // Assign worker if not already assigned
        const match = JSON.parse(matchData);
        let workerId = match.workerId;

        if (!workerId) {
          // Assign to least-loaded worker
          workerId = await workerPool.assignMatch(matchId);
          if (!workerId) {
            logError('No available workers', new Error(`Cannot assign match ${matchId}`));
            socket.emit('error', { message: 'No available workers' });
            // Broadcast to all clients in match room
            io.to(matchId).emit('error', { message: 'No available workers' });
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
          socket.emit('error', { message: 'Match worker not available' });
          // Broadcast to all clients in match room
          io.to(matchId).emit('error', { message: 'Match worker not available' });
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
        socket.emit('error', { message: 'Failed to join match' });
      }
      return;
    });

    // Connect to match by matchId (creator joining their own match)
    socket.on('connect_to_match', async (data) => {
      try {
        if (!socket.data.userId) {
          return socket.emit('error', { message: 'Not authenticated' });
        }

        const { matchId } = data;
        if (!matchId) {
          return socket.emit('error', { message: 'Match ID required' });
        }

        const matchData = await redisClient.get(`match:${matchId}`);
        if (!matchData) {
          logInfo('Match not found for connect_to_match', { matchId });
          return socket.emit('error', { message: 'Match not found' });
        }

        // Assign worker if not already assigned
        const match = JSON.parse(matchData);
        let workerId = match.workerId;

        if (!workerId) {
          // Assign to least-loaded worker
          workerId = await workerPool.assignMatch(matchId);
          if (!workerId) {
            logError('No available workers', new Error(`Cannot assign match ${matchId}`));
            socket.emit('error', { message: 'No available workers' });
            io.to(matchId).emit('error', { message: 'No available workers' });
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
          socket.emit('error', { message: 'Match worker not available' });
          io.to(matchId).emit('error', { message: 'Match worker not available' });
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
        socket.emit('error', { message: 'Failed to connect to match' });
      }
      return;
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
            return socket.emit('error', { message: 'Not in any match' });
          }

          const matchData = await redisClient.get(`match:${matchId}`);
          if (!matchData) {
            return socket.emit('error', { message: 'Match not found' });
          }

          const match = JSON.parse(matchData);
          let workerId = match.workerId;

          // If no worker assigned, assign one now
          if (!workerId) {
            workerId = await workerPool.assignMatch(matchId);
            if (!workerId) {
              logError('No available workers', new Error(`Cannot assign match ${matchId}`));
              socket.emit('error', { message: 'No available workers' });
              io.to(matchId).emit('error', { message: 'No available workers' });
              return;
            }
            // Update Redis with assigned worker
            match.workerId = workerId;
            await redisClient.setex(`match:${matchId}`, 3600, JSON.stringify(match));
            logInfo('Assigned worker to match', { matchId, workerId });
          }

          const sent = workerPool.sendToWorker(workerId, {
            type: eventName,
            matchId,
            userId: socket.data.userId,
            username: socket.data.username,
            socketId: socket.id,
            data
          });

          if (!sent) {
            logError('Failed to send event to worker', new Error(`Worker ${workerId} unavailable for event ${eventName}`));
            return socket.emit('error', { message: 'Match worker not available' });
          }
        } catch (error) {
          logError(`Error forwarding ${eventName}`, error as Error);
        }
        return;
      });
    });

    socket.on('disconnect', () => {
      if (socket.data.userId) {
        cleanupAutoQueueEntry(socket.data.userId);
      }
    });
  });

  // Start server
  server.listen(MASTER_PORT, '0.0.0.0', () => {
    logInfo('Master server started', {
      port: MASTER_PORT,
      host: '0.0.0.0',
      pid: process.pid
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logInfo('SIGTERM received, shutting down gracefully');
    await workerPool.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logInfo('SIGINT received, shutting down gracefully');
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