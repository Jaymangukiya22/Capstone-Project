import cluster from 'cluster';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { logInfo, logError } from './utils/logger';
import { MatchWorkerPool } from './matchWorkerPool';
import { Quiz } from './models/index';
import { createClient } from 'redis';
import { metricsMiddleware, getPrometheusMetrics, getDetailedMetrics } from './middleware/metricsMiddleware';

// Load environment variables
dotenv.config();

const port = process.env.MATCH_SERVICE_PORT || 3001;

// Store interface
interface StoreInterface {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

class InMemoryStore implements StoreInterface {
  private data: Map<string, string> = new Map();

  async get(key: string): Promise<string | null> {
    return this.data.get(key) || null;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    this.data.set(key, value);
    if (ttl) {
      setTimeout(() => this.data.delete(key), ttl * 1000);
    }
  }

  async del(key: string): Promise<void> {
    this.data.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.data.has(key);
  }
}

let store: StoreInterface;
let isRedisConnected = false;

async function initializeStore(): Promise<void> {
  try {
    const redis = createClient({ 
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 3000
      }
    });
    
    redis.on('error', () => {});

    await Promise.race([
      redis.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connection timeout')), 3000))
    ]);
    
    await redis.ping();
    
    store = redis as any;
    isRedisConnected = true;
    logInfo('Master connected to Redis');
  } catch (error) {
    logInfo('Master using in-memory store');
    store = new InMemoryStore();
    isRedisConnected = false;
  }
}

// CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174'
    ];
    
    const networkIP = process.env.NETWORK_IP;
    if (networkIP) {
      allowedOrigins.push(`http://${networkIP}:5173`);
      allowedOrigins.push(`http://${networkIP}:5174`);
    }
    
    if (origin.match(/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d{4,5}$/)) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// Master process
if (cluster.isPrimary) {
  const app = express();
  const server = createServer(app);
  
  // Middleware
  app.use(helmet());
  app.use(compression());
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(metricsMiddleware); // Track all API requests

  let workerPool: MatchWorkerPool;

  async function startMaster() {
    await initializeStore();

    // Initialize worker pool
    workerPool = new MatchWorkerPool();

    // Health check endpoint
    app.get('/health', (req, res) => {
      const stats = workerPool.getStats();
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Match Service Master',
        version: '3.0.0 (Worker Pool)',
        environment: process.env.NODE_ENV || 'development',
        store: isRedisConnected ? 'Redis' : 'In-Memory',
        workerPool: stats
      });
    });

    // Prometheus metrics endpoint
    app.get('/metrics', (req, res) => {
      try {
        const stats = workerPool.getStats();
        
        let metrics = getPrometheusMetrics(); // Get comprehensive metrics
        
        // Add worker pool specific metrics
        metrics += `
# HELP matchserver_active_workers Total number of active worker processes
# TYPE matchserver_active_workers gauge
matchserver_active_workers ${stats.activeWorkers}

# HELP matchserver_total_workers Total number of worker processes
# TYPE matchserver_total_workers gauge
matchserver_total_workers ${stats.totalWorkers}

# HELP matchserver_active_matches_total Total number of active matches across all workers
# TYPE matchserver_active_matches_total gauge
matchserver_active_matches_total ${stats.totalMatches}

# HELP matchserver_idle_workers Number of idle workers
# TYPE matchserver_idle_workers gauge
matchserver_idle_workers ${stats.idleWorkers}

# HELP matchserver_uptime_seconds Uptime of the master server in seconds
# TYPE matchserver_uptime_seconds counter
matchserver_uptime_seconds ${Math.floor(process.uptime())}

# HELP matchserver_memory_usage_bytes Memory usage in bytes
# TYPE matchserver_memory_usage_bytes gauge
matchserver_memory_usage_bytes ${process.memoryUsage().heapUsed}

# HELP matchserver_store_type Store type being used (1=Redis, 0=InMemory)
# TYPE matchserver_store_type gauge
matchserver_store_type ${isRedisConnected ? 1 : 0}
`.trim();

        res.set('Content-Type', 'text/plain');
        res.send(metrics);
      } catch (error) {
        logError('Error generating metrics', error as Error);
        res.status(500).send('Error generating metrics');
      }
    });

    // Get match by join code
    app.get('/matches/code/:joinCode', async (req, res) => {
      try {
        const { joinCode } = req.params;
        
        const matchId = await store.get(`joinCode:${joinCode.toUpperCase()}`);
        
        if (!matchId) {
          return res.status(404).json({
            success: false,
            error: 'No match found with that join code'
          });
        }
        
        const matchData = await store.get(`match:${matchId}`);
        
        if (!matchData) {
          return res.status(404).json({
            success: false,
            error: 'Match data not found'
          });
        }
        
        const match = JSON.parse(matchData);
        
        let quizDetails = null;
        try {
          const quiz = await Quiz.findByPk(match.quizId);
          if (quiz) {
            quizDetails = {
              id: quiz.id,
              title: quiz.title,
              description: quiz.description,
              difficulty: quiz.difficulty,
              timeLimit: quiz.timeLimit
            };
          }
        } catch (error) {
          logError('Failed to fetch quiz details', error as Error);
        }
        
        return res.json({
          success: true,
          data: {
            match: {
              id: matchId,
              matchId,
              joinCode: match.joinCode,
              quizId: match.quizId,
              quiz: quizDetails || {
                id: match.quizId,
                title: `Quiz ${match.quizId}`,
                description: 'Quiz description',
                difficulty: 'MEDIUM',
                timeLimit: 30
              },
              status: match.status,
              playerCount: match.players ? match.players.length : 0,
              maxPlayers: 2,
              matchType: 'FRIEND',
              players: match.players,
              createdAt: match.createdAt
            }
          }
        });
      } catch (error) {
        logError('Failed to get match by code', error as Error);
        return res.status(500).json({
          success: false,
          error: 'Failed to get match by code'
        });
      }
    });

    // Friend match creation (HTTP API)
    app.post('/matches/friend', async (req, res) => {
      try {
        const { quizId, userId, username } = req.body;
        
        logInfo('Friend match request received on master', { quizId, userId, username });
        
        const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const joinCode = Math.random().toString(36).substr(2, 6).toUpperCase();
        
        const matchInfo = {
          matchId,
          joinCode,
          quizId,
          creatorId: userId,
          creatorName: username,
          status: 'waiting',
          players: [{
            userId,
            username,
            ready: false
          }],
          createdAt: new Date()
        };
        
        await store.set(`match:${matchId}`, JSON.stringify(matchInfo));
        await store.set(`joinCode:${joinCode}`, matchId);
        
        logInfo('Friend match created on master', { matchId, joinCode, quizId, userId });
        
        res.json({
          success: true,
          data: {
            matchId,
            joinCode
          }
        });
      } catch (error) {
        logError('Failed to handle friend match request', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to process request'
        });
      }
    });

    // Worker pool stats endpoint
    app.get('/workers/stats', (req, res) => {
      const stats = workerPool.getStats();
      res.json({
        success: true,
        data: stats
      });
    });

    // Detailed metrics with bottleneck detection
    app.get('/metrics/detailed', (req, res) => {
      try {
        const detailedMetrics = getDetailedMetrics();
        res.json({
          success: true,
          data: detailedMetrics
        });
      } catch (error) {
        logError('Failed to get detailed metrics', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to get detailed metrics'
        });
      }
    });

    // Bottleneck detection endpoint
    app.get('/bottlenecks', (req, res) => {
      try {
        const detailedMetrics = getDetailedMetrics();
        res.json({
          success: true,
          data: {
            bottlenecks: detailedMetrics.bottlenecks,
            summary: {
              critical: detailedMetrics.bottlenecks.filter(b => b.severity === 'high').length,
              warning: detailedMetrics.bottlenecks.filter(b => b.severity === 'medium').length,
              info: detailedMetrics.bottlenecks.filter(b => b.severity === 'low').length
            },
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        logError('Failed to detect bottlenecks', error as Error);
        res.status(500).json({
          success: false,
          error: 'Failed to detect bottlenecks'
        });
      }
    });

    // Listen on all network interfaces
    server.listen(port as number, '0.0.0.0', () => {
      const networkIP = process.env.NETWORK_IP || 'localhost';
      logInfo(`Match Service Master started`, {
        port,
        host: '0.0.0.0',
        environment: process.env.NODE_ENV || 'development',
        networkAccess: `http://${networkIP}:${port}`,
        timestamp: new Date().toISOString(),
        store: isRedisConnected ? 'Redis' : 'In-Memory',
        mode: 'Worker Pool Architecture'
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

  startMaster().catch((error) => {
    logError('Failed to start master', error);
    process.exit(1);
  });

} else {
  // Worker process
  require('./matchServerWorker');
}
