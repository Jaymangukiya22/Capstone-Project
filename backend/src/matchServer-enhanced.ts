import express from 'express';
import promBundle from 'express-prom-bundle';
import client from 'prom-client';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import { User, Quiz, QuizQuestion, QuestionBankItem, QuestionBankOption } from './models/index';
import { createClient } from 'redis';
import jwt from 'jsonwebtoken';
import { logInfo, logError } from './utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { matchService } from './services/matchService';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const port = process.env.MATCH_SERVICE_PORT || 3001;

// Store interface for Redis/InMemory compatibility
interface StoreInterface {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// In-memory store implementation
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

// Initialize Redis with fallback to in-memory store
let store: StoreInterface;
let isRedisConnected = false;

async function initializeStore(): Promise<void> {
  try {
    const redis = createClient({ 
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 3000 // 3 second timeout
      }
    });
    
    // Disable automatic reconnection for faster fallback
    redis.on('error', () => {
      // Silently handle errors during connection attempt
    });

    // Try to connect with timeout
    await Promise.race([
      redis.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connection timeout')), 3000))
    ]);
    
    // Test connection
    await redis.ping();
    
    store = redis as any;
    isRedisConnected = true;
    logInfo('Connected to Redis for match service');
  } catch (error) {
    logInfo('Redis unavailable, using in-memory store as fallback');
    store = new InMemoryStore();
    isRedisConnected = false;
  }
}

// CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // In production, check against allowed origins
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174'
    ];
    
    // Add network IP if configured
    const networkIP = process.env.NETWORK_IP;
    if (networkIP) {
      allowedOrigins.push(`http://${networkIP}:5173`);
      allowedOrigins.push(`http://${networkIP}:5174`);
    }
    
    // Allow any IP in the local network range for LAN play
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

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors(corsOptions));
app.use(express.json());

// Express HTTP metrics (do not expose its own endpoint; we will merge into our /metrics)
const httpMetrics = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  promClient: {
    collectDefaultMetrics: {},
  },
  metricsPath: '/metrics-bundle' // avoid clashing with our /metrics
});
app.use(httpMetrics);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Enhanced Match Service',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    store: isRedisConnected ? 'Redis' : 'In-Memory'
  });
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  try {
    const activeMatches = enhancedMatchService ? enhancedMatchService.getActiveMatchesCount() : 0;
    const connectedUsers = enhancedMatchService ? enhancedMatchService.getConnectedUsersCount() : 0;
    const playersPerMatch = enhancedMatchService ? enhancedMatchService.getPlayersPerMatch() : [];
    const matchesCreated = enhancedMatchService ? enhancedMatchService.getMatchesCreatedTotal() : 0;
    const workerStats = enhancedMatchService ? enhancedMatchService.computeWorkerStats() : {
      activeWorkers: 0,
      totalWorkers: 0,
      idleWorkers: 0,
      workerMatchCounts: [] as Array<{ worker_id: number; matches: number }>
    };
    const workersSpawned = enhancedMatchService ? enhancedMatchService.getWorkersSpawnedTotal() : 0;
    // Pull express/prom-client metrics
    const bundleMetrics = await client.register.metrics();
    
    const metricsHeader = `
# HELP matchserver_active_matches_total Total number of active matches
# TYPE matchserver_active_matches_total gauge
matchserver_active_matches_total ${activeMatches}

# HELP matchserver_connected_users_total Total number of connected users
# TYPE matchserver_connected_users_total gauge
matchserver_connected_users_total ${connectedUsers}

# HELP matchserver_connected_players_total Total number of connected players (alias)
# TYPE matchserver_connected_players_total gauge
matchserver_connected_players_total ${connectedUsers}

# HELP matchserver_matches_created_total Total matches created since start
# TYPE matchserver_matches_created_total counter
matchserver_matches_created_total ${matchesCreated}

# HELP matchserver_uptime_seconds Uptime of the match server in seconds
# TYPE matchserver_uptime_seconds counter
matchserver_uptime_seconds ${Math.floor(process.uptime())}

# HELP matchserver_memory_usage_bytes Memory usage in bytes
# TYPE matchserver_memory_usage_bytes gauge
matchserver_memory_usage_bytes ${process.memoryUsage().heapUsed}

# HELP matchserver_store_type Store type being used (1=Redis, 0=InMemory)
# TYPE matchserver_store_type gauge
matchserver_store_type ${isRedisConnected ? 1 : 0}

# HELP matchserver_status Server status (1=running, 0=stopped)
# TYPE matchserver_status gauge
matchserver_status 1
`.trim();

    // Per-match players metric lines
    const perMatchLines = playersPerMatch.map(pm => `matchserver_match_players{match_id="${pm.matchId}"} ${pm.count}`).join('\n');

    // Worker-related gauges (computed abstraction)
    const workersHeader = `
# HELP matchserver_total_workers Total worker processes handling matches
# TYPE matchserver_total_workers gauge
matchserver_total_workers ${workerStats.totalWorkers}
# HELP matchserver_active_workers Currently active workers
# TYPE matchserver_active_workers gauge
matchserver_active_workers ${workerStats.activeWorkers}
# HELP matchserver_idle_workers Currently idle workers
# TYPE matchserver_idle_workers gauge
matchserver_idle_workers ${workerStats.idleWorkers}
# HELP matchserver_workers_spawned_total Total workers spawned since start
# TYPE matchserver_workers_spawned_total counter
matchserver_workers_spawned_total ${workersSpawned}`.trim();

    const workerMatchLines = workerStats.workerMatchCounts
      .map(w => `matchserver_worker_matches{worker_id="${w.worker_id}"} ${w.matches}`)
      .join('\n');

    const metrics = [bundleMetrics, metricsHeader, perMatchLines, workersHeader, workerMatchLines]
      .filter(Boolean)
      .join('\n');

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
    
    // Get match ID from join code
    const matchId = await store.get(`joinCode:${joinCode.toUpperCase()}`);
    
    if (!matchId) {
      return res.status(404).json({
        success: false,
        error: 'No match found with that join code'
      });
    }
    
    // Get match data
    const matchData = await store.get(`match:${matchId}`);
    
    if (!matchData) {
      return res.status(404).json({
        success: false,
        error: 'Match data not found'
      });
    }
    
    const match = JSON.parse(matchData);
    
    // Get quiz details from database
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

// Match data structures
interface MatchPlayer {
  userId: number;
  username: string;
  firstName?: string;
  lastName?: string;
  socketId: string;
  score: number;
  currentQuestionIndex: number;
  isReady: boolean;
  isAI: boolean;
  answers: any[];
}

interface MatchRoom {
  id: string;
  quizId: number;
  quiz: any;
  players: Map<number, MatchPlayer>;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';
  currentQuestionIndex: number;
  questionStartTime: number;
  maxPlayers: number;
  timeLimit: number;
  questions: any[];
  createdAt: Date;
  joinCode?: string;
  matchType: 'SOLO' | 'MULTIPLAYER' | 'FRIEND_1V1';
}

class EnhancedMatchService {
  private io: SocketIOServer;
  private matches: Map<string, MatchRoom> = new Map();
  private userToMatch: Map<number, string> = new Map();
  private joinCodeToMatch: Map<string, string> = new Map();
  // Simple in-process counters for Prometheus exposition
  private matchesCreatedTotal: number = 0;
  private workersSpawnedTotal: number = 0;
  private lastActiveWorkers: number = 0;

  // Worker scaling configuration (from env with sane defaults)
  private readonly maxMatchesPerWorker: number = parseInt(process.env.MAX_MATCHES_PER_WORKER || '4', 10);
  private readonly minWorkers: number = parseInt(process.env.MIN_WORKERS || '10', 10);
  private readonly maxWorkers: number = parseInt(process.env.MAX_WORKERS || '50', 10);


  constructor(server: any) {
    this.io = new SocketIOServer(server, {
      cors: corsOptions,
      transports: ['websocket', 'polling']
    });

    this.setupSocketHandlers();
  }

  // Metrics helpers
  public getPlayersPerMatch(): Array<{ matchId: string; count: number }> {
    const result: Array<{ matchId: string; count: number }> = [];
    this.matches.forEach((m, id) => {
      result.push({ matchId: id, count: m.players.size });
    });
    return result;
  }

  public getMatchesCreatedTotal(): number {
    return this.matchesCreatedTotal;
  }

  public getActiveMatchesCount(): number {
    return this.matches.size;
  }

  public getConnectedUsersCount(): number {
    let total = 0;
    this.matches.forEach((m) => (total += m.players.size));
    return total;
  }

  public getWorkersSpawnedTotal(): number {
    return this.workersSpawnedTotal;
  }

  // Compute desired worker stats based on active matches and env config
  public computeWorkerStats(): {
    activeWorkers: number;
    totalWorkers: number;
    idleWorkers: number;
    workerMatchCounts: Array<{ worker_id: number; matches: number }>;
  } {
    const activeMatches = this.getActiveMatchesCount();
    // Scale-to-zero when there is no work
    if (activeMatches === 0) {
      this.lastActiveWorkers = 0;
      return { activeWorkers: 0, totalWorkers: 0, idleWorkers: 0, workerMatchCounts: [] };
    }

    // Otherwise determine desired active workers based on load
    const rawActive = Math.ceil(activeMatches / Math.max(1, this.maxMatchesPerWorker));
    const activeWorkers = Math.min(this.maxWorkers, rawActive);
    const totalWorkers = Math.max(this.minWorkers, activeWorkers);
    const idleWorkers = Math.max(0, totalWorkers - activeWorkers);

    // Track spawned workers counter when scaling up
    if (activeWorkers > this.lastActiveWorkers) {
      this.workersSpawnedTotal += (activeWorkers - this.lastActiveWorkers);
    }
    this.lastActiveWorkers = activeWorkers;

    // Distribute matches across active workers for visibility
    const workerMatchCounts: Array<{ worker_id: number; matches: number }> = [];
    if (activeWorkers > 0) {
      const base = Math.floor(activeMatches / activeWorkers);
      const rem = activeMatches % activeWorkers;
      for (let i = 1; i <= activeWorkers; i++) {
        const matches = base + (i <= rem ? 1 : 0);
        workerMatchCounts.push({ worker_id: i, matches });
      }
    }

    return { activeWorkers, totalWorkers, idleWorkers, workerMatchCounts };
  }

  private generateJoinCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private async loadQuizQuestions(quizId: number): Promise<any[]> {
    try {
      const quizQuestions = await QuizQuestion.findAll({
        where: { quizId },
        include: [{
          model: QuestionBankItem,
          as: 'question',
          include: [{
            model: QuestionBankOption,
            as: 'options'
          }]
        }],
        order: [['order', 'ASC']]
      });

      return quizQuestions.map((qq: any) => ({
        id: qq.question.id,
        questionText: qq.question.questionText,
        options: qq.question.options.map((opt: any) => ({
          id: opt.id,
          optionText: opt.optionText,
          isCorrect: opt.isCorrect
        })),
        difficulty: qq.question.difficulty,
        points: qq.points || 100
      }));
    } catch (error) {
      logError('Failed to load quiz questions', error as Error);
      return [];
    }
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      logInfo('Client connected', { socketId: socket.id });

      // Authenticate user
      socket.on('authenticate', async (data: any) => {
        try {
          let userId: number;
          let username: string;
          let firstName: string = '';
          let lastName: string = '';

          if (typeof data === 'string') {
            // JWT token authentication
            const decoded = jwt.verify(data, process.env.JWT_SECRET!) as any;
            const user = await User.findByPk(decoded.userId, {
              attributes: ['id', 'username', 'firstName', 'lastName', 'email', 'isActive']
            });

            if (!user || !user.isActive) {
              socket.emit('auth_error', { message: 'Invalid token or user inactive' });
              return;
            }

            userId = user.id;
            username = user.email || user.username;
            firstName = user.firstName || '';
            lastName = user.lastName || '';
          } else {
            // Direct user data for testing
            userId = data.userId || Math.floor(Math.random() * 1000);
            username = data.username || `Player${userId}`;
            
            // First check if firstName/lastName are provided directly
            if (data.firstName || data.lastName) {
              firstName = data.firstName || '';
              lastName = data.lastName || '';
            } else {
              // Try to get real user from database
              try {
                const user = await User.findByPk(userId, {
                  attributes: ['id', 'username', 'firstName', 'lastName', 'email', 'isActive']
                });
                if (user) {
                  username = user.email || user.username;
                  firstName = user.firstName || '';
                  lastName = user.lastName || '';
                }
              } catch (error) {
                logInfo('Using fallback user data', { userId, username });
              }
            }
          }

          socket.data.userId = userId;
          socket.data.username = username;
          socket.data.firstName = firstName;
          socket.data.lastName = lastName;
          
          const userData = { id: userId, username, firstName, lastName };
          socket.emit('authenticated', { user: userData });

          logInfo('User authenticated', { 
            userId, 
            username,
            firstName,
            lastName,
            socketId: socket.id,
            receivedDataType: typeof data,
            finalUserData: userData
          });
        } catch (error) {
          socket.emit('auth_error', { message: 'Authentication failed' });
          logError('Authentication error', error as Error);
        }
      });

      // Create friend match (1v1 with join code)
      socket.on('create_friend_match', async (data: { quizId: number }) => {
        try {
          if (!socket.data.userId) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }

          const quiz = await Quiz.findOne({
            where: { id: data.quizId, isActive: true }
          });

          if (!quiz) {
            socket.emit('error', { message: 'Quiz not found' });
            return;
          }

          const matchId = uuidv4();
          const joinCode = this.generateJoinCode();
          const questions = await this.loadQuizQuestions(data.quizId);

          const match: MatchRoom = {
            id: matchId,
            quizId: data.quizId,
            quiz: {
              id: quiz.id,
              title: quiz.title,
              timeLimit: quiz.timeLimit
            },
            players: new Map(),
            status: 'WAITING',
            currentQuestionIndex: 0,
            questionStartTime: 0,
            maxPlayers: 2,
            timeLimit: quiz.timeLimit || 30,
            questions,
            createdAt: new Date(),
            joinCode,
            matchType: 'FRIEND_1V1'
          };

          // Add creator as first player
          const creator: MatchPlayer = {
            userId: socket.data.userId,
            username: socket.data.username,
            firstName: socket.data.firstName,
            lastName: socket.data.lastName,
            socketId: socket.id,
            score: 0,
            currentQuestionIndex: 0,
            isReady: false,
            isAI: false,
            answers: []
          };

          match.players.set(socket.data.userId, creator);
          this.matches.set(matchId, match);
          this.userToMatch.set(socket.data.userId, matchId);
          this.joinCodeToMatch.set(joinCode, matchId);
          // metrics: created match
          this.matchesCreatedTotal += 1;

          socket.join(matchId);
          socket.emit('friend_match_created', { matchId, joinCode });

          // Store match in Redis/InMemory with player data AND questions
          const matchDataToStore = {
            id: matchId,
            quizId: data.quizId,
            joinCode,
            status: match.status,
            createdAt: match.createdAt,
            questions: questions,
            timeLimit: match.timeLimit,
            players: Array.from(match.players.values()).map(p => ({
              userId: p.userId,
              username: p.username,
              firstName: p.firstName,
              lastName: p.lastName,
              isReady: p.isReady
            }))
          };
          
          logInfo('Storing match in Redis', { 
            matchId,
            playersData: matchDataToStore.players
          });
          
          // Store match data
          await store.set(`match:${matchId}`, JSON.stringify(matchDataToStore));
          // CRITICAL: Store joinCode mapping so friend can find the match
          await store.set(`joinCode:${joinCode}`, matchId);

          logInfo('Friend match created', { 
            matchId, 
            joinCode, 
            userId: socket.data.userId,
            username: socket.data.username 
          });
        } catch (error) {
          socket.emit('error', { message: 'Failed to create friend match' });
          logError('Create friend match error', error as Error);
        }
      });

      // Join match by code
      socket.on('join_match', async (data: { joinCode: string }) => {
        try {
          if (!socket.data.userId) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }

          // First check in-memory map
          let matchId = this.joinCodeToMatch.get(data.joinCode.toUpperCase());
          
          // If not found in memory, check store
          if (!matchId) {
            const storedMatchId = await store.get(`joinCode:${data.joinCode.toUpperCase()}`);
            if (!storedMatchId) {
              socket.emit('error', { message: 'Invalid join code' });
              return;
            }
            matchId = storedMatchId;
          }

          // Try to get match from memory first
          let match = this.matches.get(matchId);
          
          // If not in memory, try to load from store
          if (!match) {
            const matchData = await store.get(`match:${matchId}`);
            if (!matchData) {
              socket.emit('error', { message: 'Match not found' });
              return;
            }
            
            // Parse stored match data and create match object
            const storedMatch = JSON.parse(matchData);
            
            // Use stored questions if available, otherwise load from DB
            const questions = storedMatch.questions && storedMatch.questions.length > 0 
              ? storedMatch.questions 
              : await this.loadQuizQuestions(storedMatch.quizId);
            
            // Create match in memory
            match = {
              id: matchId,
              quizId: storedMatch.quizId,
              quiz: null,
              joinCode: storedMatch.joinCode,
              players: new Map(),
              maxPlayers: 2,
              status: 'WAITING',
              questions,
              currentQuestionIndex: 0,
              questionStartTime: 0,
              timeLimit: storedMatch.timeLimit || 30,
              createdAt: new Date(storedMatch.createdAt),
              matchType: 'FRIEND_1V1'
            };
            
            // IMPORTANT: Restore creator from Redis but mark as disconnected
            // They'll update their socket when they reconnect
            if (storedMatch.players && storedMatch.players.length > 0) {
              for (const storedPlayer of storedMatch.players) {
                const restoredPlayer: MatchPlayer = {
                  userId: storedPlayer.userId,
                  username: storedPlayer.username,
                  firstName: storedPlayer.firstName || '',
                  lastName: storedPlayer.lastName || '',
                  socketId: '', // Empty socket - they're disconnected
                  score: 0,
                  currentQuestionIndex: 0,
                  isReady: false,
                  isAI: false,
                  answers: []
                };
                match.players.set(storedPlayer.userId, restoredPlayer);
              }
            }
            
            // Store in memory maps
            if (match) {
              this.matches.set(matchId, match);
              this.joinCodeToMatch.set(storedMatch.joinCode, matchId);
            }
          }
          
          if (!match) {
            socket.emit('error', { message: 'Match not found' });
            return;
          }
          
          if (match.status !== 'WAITING') {
            socket.emit('error', { message: 'Match already started or completed' });
            return;
          }
          
          if (match.players.size >= match.maxPlayers && !match.players.has(socket.data.userId)) {
            socket.emit('error', { message: 'Match is full' });
            return;
          }
          
          // Validate questions exist
          if (!match.questions || match.questions.length === 0) {
            socket.emit('error', { message: 'No questions available for this quiz' });
            return;
          }

          // Check if user is already in the match
          if (match.players.has(socket.data.userId)) {
            // If already in the match, just update their socket ID and proceed
            const existingPlayer = match.players.get(socket.data.userId);
            if (existingPlayer) {
              existingPlayer.socketId = socket.id;
              this.userToMatch.set(socket.data.userId, matchId);
              socket.join(matchId);
              socket.emit('match_joined', {
                matchId,
                players: Array.from(match.players.values()).map(p => ({
                  userId: p.userId,
                  username: p.username,
                  firstName: p.firstName,
                  lastName: p.lastName,
                  isReady: p.isReady
                }))
              });
              logInfo('Player reconnected to match', {
                matchId,
                userId: socket.data.userId,
                playerCount: match.players.size
              });
              return;
            }
          }

          // Add player to match
          const player: MatchPlayer = {
            userId: socket.data.userId,
            username: socket.data.username,
            firstName: socket.data.firstName,
            lastName: socket.data.lastName,
            socketId: socket.id,
            score: 0,
            currentQuestionIndex: 0,
            isReady: false,
            isAI: false,
            answers: []
          };

          match.players.set(socket.data.userId, player);
          this.userToMatch.set(socket.data.userId, matchId);

          socket.join(matchId);
          
          logInfo('Second player joined WebSocket room', { 
            matchId, 
            userId: socket.data.userId,
            socketId: socket.id,
            roomSizeAfterJoin: this.io.sockets.adapter.rooms.get(matchId)?.size || 0
          });
          
          socket.emit('match_joined', { 
            matchId, 
            players: Array.from(match.players.values()).map(p => ({
              userId: p.userId,
              username: p.username,
              firstName: p.firstName,
              lastName: p.lastName,
              isReady: p.isReady
            }))
          });

          // Notify all players about the new joiner
          logInfo('Broadcasting player list update', { 
            matchId, 
            roomSize: this.io.sockets.adapter.rooms.get(matchId)?.size || 0,
            playerCount: match.players.size 
          });
          
          this.io.to(matchId).emit('player_list_updated', {
            players: Array.from(match.players.values()).map(p => ({
              userId: p.userId,
              username: p.username,
              firstName: p.firstName,
              lastName: p.lastName,
              isReady: p.isReady
            }))
          });
          
          // Also emit to individual sockets as backup
          Array.from(match.players.values()).forEach(player => {
            if (player.socketId) {
              this.io.to(player.socketId).emit('player_list_updated', {
                players: Array.from(match.players.values()).map(p => ({
                  userId: p.userId,
                  username: p.username,
                  firstName: p.firstName,
                  lastName: p.lastName,
                  isReady: p.isReady
                }))
              });
            }
          });

          // Update match in Redis with new player data
          await store.set(`match:${matchId}`, JSON.stringify({
            id: matchId,
            quizId: match.quizId,
            joinCode: match.joinCode,
            status: match.status,
            createdAt: match.createdAt,
            questions: match.questions, // Include questions
            timeLimit: match.timeLimit,
            players: Array.from(match.players.values()).map(p => ({
              userId: p.userId,
              username: p.username,
              firstName: p.firstName,
              lastName: p.lastName,
              isReady: p.isReady
            }))
          }));

          logInfo('Player joined match', { 
            matchId, 
            userId: socket.data.userId,
            playerCount: match.players.size 
          });
        } catch (error) {
          socket.emit('error', { message: 'Failed to join match' });
          logError('Join match error', error as Error);
        }
      });

      // Connect to existing match (for creator or reconnection)
      socket.on('connect_to_match', async (data: { matchId: string }) => {
        try {
          if (!socket.data.userId) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }
          
          
          // Try to get match from memory first
          let match = this.matches.get(data.matchId);
          
          // If not in memory, try to load from store
          if (!match) {
            const matchData = await store.get(`match:${data.matchId}`);
            if (!matchData) {
              socket.emit('error', { message: 'Match not found' });
              return;
            }
            
            // Parse stored match data and create match object
            const storedMatch = JSON.parse(matchData);
            
            // Use stored questions if available, otherwise load from DB
            const questions = storedMatch.questions && storedMatch.questions.length > 0 
              ? storedMatch.questions 
              : await this.loadQuizQuestions(storedMatch.quizId);
            
            // Validate questions exist
            if (!questions || questions.length === 0) {
              socket.emit('error', { message: 'No questions available for this quiz' });
              return;
            }
            
            // Create match in memory - restore status and progress from stored data
            match = {
              id: data.matchId,
              quizId: storedMatch.quizId,
              quiz: null,
              joinCode: storedMatch.joinCode,
              players: new Map(),
              maxPlayers: 2,
              status: storedMatch.status || 'WAITING',
              questions,
              currentQuestionIndex: storedMatch.currentQuestionIndex || 0,
              questionStartTime: storedMatch.questionStartTime || 0,
              timeLimit: storedMatch.timeLimit || 30,
              createdAt: new Date(storedMatch.createdAt),
              matchType: 'FRIEND_1V1'
            };
            
            // Restore players from stored data
            if (storedMatch.players && Array.isArray(storedMatch.players)) {
              for (const storedPlayer of storedMatch.players) {
                const restoredPlayer: MatchPlayer = {
                  userId: storedPlayer.userId,
                  username: storedPlayer.username,
                  firstName: storedPlayer.firstName || '',
                  lastName: storedPlayer.lastName || '',
                  socketId: '', // Will be updated when they reconnect
                  score: 0,
                  currentQuestionIndex: 0,
                  isReady: storedPlayer.isReady || false,
                  isAI: false,
                  answers: []
                };
                match.players.set(storedPlayer.userId, restoredPlayer);
              }
            }
            
            // Store in memory maps
            this.matches.set(data.matchId, match);
            this.joinCodeToMatch.set(storedMatch.joinCode, data.matchId);
          }

          if (match) {
            // Check if player already exists in match (reconnecting)
            const existingPlayer = match.players.get(socket.data.userId);
            
            if (existingPlayer) {
              // Update existing player's socket ID
              existingPlayer.socketId = socket.id;
            } else {
              // Add new player
              const player: MatchPlayer = {
                userId: socket.data.userId,
                username: socket.data.username,
                firstName: socket.data.firstName,
                lastName: socket.data.lastName,
                socketId: socket.id,
                score: 0,
                currentQuestionIndex: 0,
                isReady: false,
                isAI: false,
                answers: []
              };
              match.players.set(socket.data.userId, player);
            }
            
            this.userToMatch.set(socket.data.userId, data.matchId);

            socket.join(data.matchId);
            
            logInfo('Player joined WebSocket room', { 
              matchId: data.matchId, 
              userId: socket.data.userId,
              socketId: socket.id,
              roomSize: this.io.sockets.adapter.rooms.get(data.matchId)?.size || 0
            });
            
            // Check if match is in progress and send current state
            if (match.status === 'IN_PROGRESS') {
              // Calculate time elapsed for current question
              const timeElapsed = match.questionStartTime ? Date.now() - match.questionStartTime : 0;
              const currentQuestion = match.questions[match.currentQuestionIndex];
              
              if (currentQuestion) {
                const questionForPlayer = {
                  id: currentQuestion.id,
                  questionText: currentQuestion.questionText,
                  options: currentQuestion.options.map((opt: any) => ({
                    id: opt.id,
                    optionText: opt.optionText
                  })),
                  timeLimit: match.timeLimit
                };
                
                // Send current match state to reconnecting player
                socket.emit('match_started', {
                  question: questionForPlayer,
                  questionIndex: match.currentQuestionIndex,
                  totalQuestions: match.questions.length,
                  timeElapsed: timeElapsed // Send time elapsed to sync timer
                });
                
                logInfo('Sent match state to reconnecting player', {
                  matchId: data.matchId,
                  userId: socket.data.userId,
                  currentQuestion: match.currentQuestionIndex + 1,
                  timeElapsed
                });
              }
            } else {
              // Match not started yet, send normal connection
              socket.emit('match_connected', { 
                matchId: data.matchId,
                joinCode: match.joinCode,
                players: Array.from(match.players.values()).map(p => ({
                  userId: p.userId,
                  username: p.username,
                  firstName: p.firstName,
                  lastName: p.lastName,
                  isReady: p.isReady
                }))
              });
            }

            // Broadcast updated player list to all players in the match
            this.io.to(data.matchId).emit('player_list_updated', {
              players: Array.from(match.players.values()).map(p => ({
                userId: p.userId,
                username: p.username,
                firstName: p.firstName,
                lastName: p.lastName,
                isReady: p.isReady
              }))
            });

            logInfo('Player connected to match', { 
              matchId: data.matchId, 
              userId: socket.data.userId,
              playerCount: match.players.size 
            });
          }
        } catch (error) {
          socket.emit('error', { message: 'Failed to connect to match' });
          logError('Connect to match error', error as Error);
        }
      });

      // Player ready
      socket.on('player_ready', async (data: { ready?: boolean } = {}) => {
        try {
          const matchId = this.userToMatch.get(socket.data.userId);
          if (!matchId) {
            socket.emit('error', { message: 'Not in any match' });
            return;
          }

          const match = this.matches.get(matchId);
          if (!match) {
            socket.emit('error', { message: 'Match not found' });
            return;
          }

          const player = match.players.get(socket.data.userId);
          if (player) {
            player.isReady = data.ready !== false; // Default to true if not specified
            
            // Emit individual player ready event
            this.io.to(matchId).emit('player_ready', {
              userId: socket.data.userId,
              username: socket.data.username,
              isReady: player.isReady
            });

            // Emit updated player list to all players
            this.io.to(matchId).emit('player_list_updated', {
              players: Array.from(match.players.values()).map(p => ({
                userId: p.userId,
                username: p.username,
                firstName: p.firstName,
                lastName: p.lastName,
                isReady: p.isReady
              }))
            });

            // Update match in Redis with new ready status
            await store.set(`match:${matchId}`, JSON.stringify({
              id: matchId,
              quizId: match.quizId,
              joinCode: match.joinCode,
              status: match.status,
              createdAt: match.createdAt,
              questions: match.questions, // Include questions
              timeLimit: match.timeLimit,
              players: Array.from(match.players.values()).map(p => ({
                userId: p.userId,
                username: p.username,
                firstName: p.firstName,
                lastName: p.lastName,
                isReady: p.isReady
              }))
            }));

            logInfo('Player ready status updated', { 
              matchId, 
              userId: socket.data.userId,
              isReady: player.isReady,
              playerCount: match.players.size 
            });

            // Check if all players are ready
            const allReady = Array.from(match.players.values()).every(p => p.isReady);
            if (allReady && match.players.size === match.maxPlayers) {
              logInfo('All players ready, starting match', { matchId });
              this.startMatch(matchId);
            }
          }
        } catch (error) {
          logError('Player ready error', error as Error);
        }
      });

      // Submit answer
      socket.on('submit_answer', async (data: { 
        questionId: number; 
        selectedOptions: number[]; 
        timeSpent: number 
      }) => {
        try {
          const matchId = this.userToMatch.get(socket.data.userId);
          if (!matchId) return;

          const match = this.matches.get(matchId);
          if (!match || match.status !== 'IN_PROGRESS') return;

          const player = match.players.get(socket.data.userId);
          if (!player) return;

          const currentQuestion = match.questions[match.currentQuestionIndex];
          if (!currentQuestion || currentQuestion.id !== data.questionId) return;

          // Check if answer is correct
          const correctOptionIds = currentQuestion.options
            .filter((opt: any) => opt.isCorrect)
            .map((opt: any) => opt.id);

          const isCorrect = data.selectedOptions.length === correctOptionIds.length &&
            data.selectedOptions.every(id => correctOptionIds.includes(id));

          // Calculate points
          const basePoints = 100;
          const timeBonus = Math.max(0, Math.floor((match.timeLimit - data.timeSpent) * 2));
          const points = isCorrect ? basePoints + timeBonus : 0;

          // Update player score
          player.score += points;
          player.answers.push({
            questionId: data.questionId,
            selectedOptions: data.selectedOptions,
            isCorrect,
            timeSpent: data.timeSpent,
            points
          });

          // Notify player of result
          socket.emit('answer_result', {
            isCorrect,
            points,
            correctOptions: correctOptionIds,
            totalScore: player.score
          });

          // Check if all players have answered the current question
          const allAnswered = Array.from(match.players.values()).every(
            p => p.answers.length > match.currentQuestionIndex
          );

          logInfo('Answer submission check:', {
            matchId,
            currentQuestionIndex: match.currentQuestionIndex,
            totalQuestions: match.questions.length,
            playerAnswers: Array.from(match.players.values()).map(p => ({
              userId: p.userId,
              username: p.username,
              answersCount: p.answers.length,
              currentScore: p.score
            })),
            allAnswered
          });

          if (allAnswered) {
            // Check if this was the last question for ALL players
            if (match.currentQuestionIndex >= match.questions.length - 1) {
              logInfo('All players completed all questions - ending match', { 
                matchId,
                finalQuestion: match.currentQuestionIndex + 1,
                totalQuestions: match.questions.length
              });
              
              // End the match only when ALL players have finished ALL questions
              this.endMatch(matchId);
            } else {
              logInfo('Moving to next question - all players answered current question', { 
                matchId, 
                nextQuestionIndex: match.currentQuestionIndex + 1,
                totalQuestions: match.questions.length
              });
              
              // Move to next question
              this.nextQuestion(matchId);
            }
          } else {
            logInfo('Waiting for other players to answer', {
              matchId,
              playersWhoAnswered: Array.from(match.players.values())
                .filter(p => p.answers.length > match.currentQuestionIndex)
                .map(p => ({ userId: p.userId, username: p.username })),
              playersWaiting: Array.from(match.players.values())
                .filter(p => p.answers.length <= match.currentQuestionIndex)
                .map(p => ({ userId: p.userId, username: p.username }))
            });
          }
        } catch (error) {
          logError('Submit answer error', error as Error);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        logInfo('Client disconnected', { socketId: socket.id });
        
        if (socket.data.userId) {
          const matchId = this.userToMatch.get(socket.data.userId);
          if (matchId) {
            const match = this.matches.get(matchId);
            if (match) {
              // Notify other players
              socket.to(matchId).emit('player_disconnected', {
                userId: socket.data.userId,
                username: socket.data.username
              });
            }
          }
        }
      });
    });
  }

  private async startMatch(matchId: string) {
    const match = this.matches.get(matchId);
    if (!match) return;

    // Debug: Log questions array
    logInfo('Starting match with questions', {
      matchId,
      questionsCount: match.questions.length,
      questions: match.questions.map(q => ({ id: q.id, text: q.questionText.substring(0, 50) + '...' }))
    });

    // Check if questions are loaded
    if (!match.questions || match.questions.length === 0) {
      logError('No questions found for match', new Error(`Match ${matchId} has no questions for quiz ${match.quizId}`));
      this.io.to(matchId).emit('error', {
        message: 'No questions available for this quiz. Please add questions to the quiz first.'
      });
      return;
    }

    match.status = 'IN_PROGRESS';
    match.currentQuestionIndex = 0;
    match.questionStartTime = Date.now();

    // Update match in Redis with new status
    await store.set(`match:${matchId}`, JSON.stringify({
      id: matchId,
      quizId: match.quizId,
      joinCode: match.joinCode,
      status: match.status,
      currentQuestionIndex: match.currentQuestionIndex,
      questionStartTime: match.questionStartTime,
      createdAt: match.createdAt,
      questions: match.questions,
      timeLimit: match.timeLimit,
      players: Array.from(match.players.values()).map(p => ({
        userId: p.userId,
        username: p.username,
        firstName: p.firstName,
        lastName: p.lastName,
        isReady: p.isReady
      }))
    }));

    // Send first question
    const currentQuestion = match.questions[0];
    if (!currentQuestion) {
      logError('First question is undefined', new Error(`Match ${matchId} has undefined first question`));
      this.io.to(matchId).emit('error', {
        message: 'Unable to load the first question. Please try again.'
      });
      return;
    }

    const questionForPlayers = {
      id: currentQuestion.id,
      questionText: currentQuestion.questionText,
      options: currentQuestion.options.map((opt: any) => ({
        id: opt.id,
        optionText: opt.optionText
      })),
      timeLimit: match.timeLimit
    };

    this.io.to(matchId).emit('match_started', {
      question: questionForPlayers,
      questionIndex: 0,
      totalQuestions: match.questions.length
    });

    // Set timer for question
    setTimeout(() => {
      this.nextQuestion(matchId);
    }, match.timeLimit * 1000);

    logInfo('Match started', { matchId, players: match.players.size });
  }

  private async nextQuestion(matchId: string) {
    const match = this.matches.get(matchId);
    if (!match) return;

    match.currentQuestionIndex++;

    if (match.currentQuestionIndex >= match.questions.length) {
      // Match completed
      this.endMatch(matchId);
      return;
    }

    // Send next question
    const currentQuestion = match.questions[match.currentQuestionIndex];
    const questionForPlayers = {
      id: currentQuestion.id,
      questionText: currentQuestion.questionText,
      options: currentQuestion.options.map((opt: any) => ({
        id: opt.id,
        optionText: opt.optionText
      })),
      timeLimit: match.timeLimit
    };

    match.questionStartTime = Date.now();

    this.io.to(matchId).emit('next_question', {
      question: questionForPlayers,
      questionIndex: match.currentQuestionIndex,
      totalQuestions: match.questions.length
    });

    // Set timer for question
    setTimeout(() => {
      this.nextQuestion(matchId);
    }, match.timeLimit * 1000);
  }

  private async endMatch(matchId: string) {
    const match = this.matches.get(matchId);
    if (!match) {
      logError('Attempted to end non-existent match', new Error(`Match ${matchId} not found`));
      return;
    }

    match.status = 'COMPLETED';

    // Calculate final results for ALL players
    const results = Array.from(match.players.values()).map(player => {
      // Calculate accuracy
      const totalAnswers = player.answers.length;
      const correctAnswers = player.answers.filter(answer => answer.isCorrect).length;
      const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

      return {
        userId: player.userId,
        username: player.username,
        firstName: player.firstName,
        lastName: player.lastName,
        score: player.score,
        answers: player.answers,
        correctAnswers,
        totalAnswers,
        accuracy
      };
    });

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    logInfo('Match completed - final results calculated', {
      matchId,
      playerCount: results.length,
      results: results.map(r => ({
        userId: r.userId,
        username: r.username,
        score: r.score,
        correctAnswers: r.correctAnswers,
        totalAnswers: r.totalAnswers,
        accuracy: r.accuracy
      })),
      winner: results[0] ? { 
        userId: results[0].userId, 
        username: results[0].username, 
        score: results[0].score,
        accuracy: results[0].accuracy
      } : null
    });

    // Create the complete match data that ALL players will receive
    const completionData = {
      results,
      winner: results[0] || null,
      matchId,
      completedAt: new Date().toISOString(),
      isFriendMatch: true
    };

    logInfo('Broadcasting match completion to ALL players:', {
      matchId,
      roomPlayers: Array.from(match.players.values()).map(p => ({
        userId: p.userId,
        username: p.username,
        socketId: p.socketId
      })),
      completionData
    });

    // SINGLE broadcast to ensure ALL players get IDENTICAL data
    this.io.to(matchId).emit('match_completed', completionData);

    // Clean up after a delay to ensure the broadcast is sent
    setTimeout(() => {
      match.players.forEach(player => {
        this.userToMatch.delete(player.userId);
      });
      
      if (match.joinCode) {
        this.joinCodeToMatch.delete(match.joinCode);
      }
      
      this.matches.delete(matchId);
      
      logInfo('Match cleanup completed', { matchId });
    }, 1000);

    logInfo('Match completion broadcast sent', { matchId });
  }

}

// API Routes for friend matches
app.post('/matches/friend', async (req, res) => {
  try {
    const { quizId, userId, username } = req.body;
    
    logInfo('Friend match request received', { quizId, userId, username });
    
    // Generate a unique match ID and join code
    const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const joinCode = Math.random().toString(36).substr(2, 6).toUpperCase();
    
    // Store match info in memory/redis for WebSocket to use
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
    
    // Store match info - stringify the object for storage
    await store.set(`match:${matchId}`, JSON.stringify(matchInfo));
    await store.set(`joinCode:${joinCode}`, matchId);
    
    logInfo('Friend match created', { matchId, joinCode, quizId, userId });
    
    // Return the match info
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

// Start server
let enhancedMatchService: EnhancedMatchService;

async function startServer() {
  await initializeStore();
  
  // Create match service instance
  enhancedMatchService = new EnhancedMatchService(server);
  
  // Listen on all network interfaces for LAN access
  server.listen(port as number, '0.0.0.0', () => {
    const networkIP = process.env.NETWORK_IP || 'localhost';
    logInfo(`Enhanced Match service started`, {
      port,
      host: '0.0.0.0',
      environment: process.env.NODE_ENV || 'development',
      networkAccess: `http://${networkIP}:${port}`,
      timestamp: new Date().toISOString(),
      store: isRedisConnected ? 'Redis' : 'In-Memory'
    });
  });
}

startServer().catch((error) => {
  logError('Failed to start server', error);
  process.exit(1);
});

export { enhancedMatchService };
