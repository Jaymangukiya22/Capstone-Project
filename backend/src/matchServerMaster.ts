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

      await redisClient.setex(`joinCode:${joinCode}`, 3600, matchId);

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
      const matchId = await redisClient.get(`joinCode:${joinCode.toUpperCase()}`);

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

        await redisClient.setex(`joinCode:${joinCode}`, 3600, matchId);

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