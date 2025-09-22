import express from 'express';
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
import { InMemoryStore } from './utils/InMemoryStore';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const port = process.env.MATCH_SERVICE_PORT || 3001;

// Store interface for Redis/InMemory compatibility
interface StoreInterface {
  set(key: string, value: string): Promise<string | null>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  keys?(pattern: string): Promise<string[]>;
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
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      )
    ]);
    
    // Test the connection
    await redis.ping();
    
    store = redis;
    isRedisConnected = true;
    console.log('✅ Connected to Redis');
    logInfo('Successfully connected to Redis', { url: process.env.REDIS_URL || 'redis://localhost:6379' });
    
  } catch (error) {
    console.log('⚠️ Redis not available, using in-memory store instead');
    logError('Redis connection failed, falling back to in-memory store', error as Error);
    
    store = new InMemoryStore();
    isRedisConnected = false;
  }
}

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

// Enhanced Match Interfaces
interface MatchPlayer {
  userId: number;
  username: string;
  socketId: string;
  score: number;
  currentQuestionIndex: number;
  isReady: boolean;
  answers: Array<{
    questionId: number;
    selectedOptions: number[];
    timeSpent: number;
    isCorrect: boolean;
  }>;
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
  joinCode: string;
  matchType: 'FRIEND_1V1' | 'MULTIPLAYER';
}

// Enhanced Match Service
class EnhancedMatchService {
  private io: SocketIOServer;
  private matches: Map<string, MatchRoom> = new Map();
  private userToMatch: Map<number, string> = new Map();
  private joinCodeToMatch: Map<string, string> = new Map();

  constructor(server: any) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.setupSocketHandlers();
    this.startMatchCleanup();
  }

  /**
   * Generate a unique 6-character join code
   */
  private generateJoinCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    do {
      result = '';
      for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
    } while (this.joinCodeToMatch.has(result));
    
    return result;
  }

  /**
   * Load questions for a quiz from the database
   */
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

      return quizQuestions.map(qq => ({
        id: qq.question.id,
        questionText: qq.question.questionText,
        difficulty: qq.question.difficulty,
        options: qq.question.options.map((opt: any) => ({
          id: opt.id,
          optionText: opt.optionText,
          isCorrect: opt.isCorrect
        }))
      }));
    } catch (error) {
      logError('Failed to load quiz questions', error as Error);
      return [];
    }
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      logInfo('Client connected', { socketId: socket.id });

      // Authenticate user (simplified for testing)
      socket.on('authenticate', async (data: { userId?: number; username?: string }) => {
        try {
          // Simplified authentication for testing
          const userId = data.userId || 1;
          const username = data.username || `User${userId}`;
          
          socket.data.userId = userId;
          socket.data.username = username;
          socket.emit('authenticated', { user: { id: userId, username } });

          logInfo('User authenticated', { userId, socketId: socket.id });
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

          const { matchId, joinCode } = await this.createFriendMatch(data.quizId, socket.data.userId, socket.data.username);
          socket.join(matchId);
          socket.emit('friend_match_created', { 
            matchId, 
            joinCode,
            message: `Share this code with your friend: ${joinCode}` 
          });

          logInfo('Friend match created', { matchId, joinCode, userId: socket.data.userId });
        } catch (error) {
          socket.emit('error', { message: 'Failed to create friend match' });
          logError('Create friend match error', error as Error);
        }
      });

      // Join match by code
      socket.on('join_match_by_code', async (data: { joinCode: string }) => {
        try {
          if (!socket.data.userId) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }

          const matchId = this.joinCodeToMatch.get(data.joinCode.toUpperCase());
          if (!matchId) {
            socket.emit('error', { message: `No match found with code: ${data.joinCode}` });
            return;
          }

          const success = await this.joinMatch(matchId, socket.data.userId, socket.id, socket.data.username);
          if (success) {
            socket.join(matchId);
            const match = this.matches.get(matchId)!;
            
            socket.emit('match_joined', { 
              matchId,
              joinCode: data.joinCode,
              players: Array.from(match.players.values()).map(p => ({
                userId: p.userId,
                username: p.username,
                isReady: p.isReady
              }))
            });

            // Notify other players
            socket.to(matchId).emit('player_joined', {
              userId: socket.data.userId,
              username: socket.data.username
            });

            logInfo('Player joined match', { matchId, userId: socket.data.userId });
          } else {
            socket.emit('error', { message: 'Failed to join match - match may be full or already started' });
          }
        } catch (error) {
          socket.emit('error', { message: 'Failed to join match' });
          logError('Join match error', error as Error);
        }
      });

      // Player ready
      socket.on('player_ready', async () => {
        try {
          const matchId = this.userToMatch.get(socket.data.userId);
          if (!matchId) {
            socket.emit('error', { message: 'Not in a match' });
            return;
          }

          const match = this.matches.get(matchId);
          if (!match) {
            socket.emit('error', { message: 'Match not found' });
            return;
          }

          const player = match.players.get(socket.data.userId);
          if (player) {
            player.isReady = true;
            
            this.io.to(matchId).emit('player_ready', {
              userId: socket.data.userId,
              username: socket.data.username
            });

            // Check if all players are ready
            const allReady = Array.from(match.players.values()).every(p => p.isReady);
            const minPlayers = match.matchType === 'FRIEND_1V1' ? 2 : 2;
            
            if (allReady && match.players.size >= minPlayers) {
              await this.startMatch(matchId);
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
          if (!matchId) {
            socket.emit('error', { message: 'Not in a match' });
            return;
          }

          await this.submitAnswer(matchId, socket.data.userId, data);
        } catch (error) {
          socket.emit('error', { message: 'Failed to submit answer' });
          logError('Submit answer error', error as Error);
        }
      });

      // Disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket.data.userId, socket.id);
        logInfo('Client disconnected', { socketId: socket.id, userId: socket.data.userId });
      });
    });
  }

  /**
   * Create a friend match (1v1 with join code)
   */
  public async createFriendMatch(quizId: number, userId: number, username: string): Promise<{ matchId: string; joinCode: string }> {
    const quiz = await Quiz.findOne({
      where: { id: quizId, isActive: true }
    });

    if (!quiz) {
      throw new Error('Quiz not found');
    }

    const matchId = uuidv4();
    const joinCode = this.generateJoinCode();
    const questions = await this.loadQuizQuestions(quizId);

    const match: MatchRoom = {
      id: matchId,
      quizId,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        timeLimit: quiz.timeLimit
      },
      players: new Map(),
      status: 'WAITING',
      currentQuestionIndex: 0,
      questionStartTime: 0,
      maxPlayers: 2, // 1v1 match
      timeLimit: quiz.timeLimit || 30,
      questions,
      createdAt: new Date(),
      joinCode,
      matchType: 'FRIEND_1V1'
    };

    // Add creator as first player
    const creator: MatchPlayer = {
      userId,
      username,
      socketId: '',
      score: 0,
      currentQuestionIndex: 0,
      isReady: false,
      answers: []
    };

    match.players.set(userId, creator);
    this.matches.set(matchId, match);
    this.userToMatch.set(userId, matchId);
    this.joinCodeToMatch.set(joinCode, matchId);

    // Store match for persistence
    await store.set(`match:${matchId}`, JSON.stringify({
      id: matchId,
      quizId,
      joinCode,
      status: 'WAITING',
      players: [],
      createdAt: new Date().toISOString()
    }));

    logInfo('Friend match created', { matchId, joinCode, quizId, creator: username });

    return { matchId, joinCode };
  }

  public async joinMatch(matchId: string, userId: number, socketId: string, username: string): Promise<boolean> {
    const match = this.matches.get(matchId);
    if (!match || match.status !== 'WAITING' || match.players.size >= match.maxPlayers) {
      return false;
    }

    const player: MatchPlayer = {
      userId,
      username,
      socketId,
      score: 0,
      currentQuestionIndex: 0,
      isReady: false,
      answers: []
    };

    match.players.set(userId, player);
    this.userToMatch.set(userId, matchId);

    return true;
  }

  private async startMatch(matchId: string) {
    const match = this.matches.get(matchId);
    if (!match) return;

    match.status = 'IN_PROGRESS';
    match.currentQuestionIndex = 0;
    match.questionStartTime = Date.now();

    // Send first question
    const currentQuestion = match.questions[0];
    const questionForPlayers = {
      id: currentQuestion.id,
      questionText: currentQuestion.questionText,
      options: currentQuestion.options.map((opt: any) => ({
        id: opt.id,
        optionText: opt.optionText
        // Don't send isCorrect to players
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

  private async submitAnswer(
    matchId: string, 
    userId: number, 
    answerData: { questionId: number; selectedOptions: number[]; timeSpent: number }
  ) {
    const match = this.matches.get(matchId);
    if (!match || match.status !== 'IN_PROGRESS') return;

    const player = match.players.get(userId);
    if (!player) return;

    const currentQuestion = match.questions[match.currentQuestionIndex];
    if (currentQuestion.id !== answerData.questionId) return;

    // Check if answer is correct
    const correctOptionIds = currentQuestion.options
      .filter((opt: any) => opt.isCorrect)
      .map((opt: any) => opt.id);

    const isCorrect = answerData.selectedOptions.length === correctOptionIds.length &&
      answerData.selectedOptions.every(id => correctOptionIds.includes(id));

    // Calculate points (faster answers get more points)
    const maxTime = match.timeLimit;
    const timeBonus = Math.max(0, (maxTime - answerData.timeSpent) / maxTime);
    const points = isCorrect ? Math.round(100 + (timeBonus * 50)) : 0;

    player.answers.push({
      questionId: answerData.questionId,
      selectedOptions: answerData.selectedOptions,
      timeSpent: answerData.timeSpent,
      isCorrect
    });

    player.score += points;

    // Notify player of result
    this.io.to(player.socketId).emit('answer_result', {
      isCorrect,
      points,
      correctOptions: correctOptionIds,
      totalScore: player.score
    });

    // Broadcast to other players that this player answered
    this.io.to(matchId).emit('player_answered', {
      userId,
      username: player.username,
      timeSpent: answerData.timeSpent
    });

    logInfo('Answer submitted', { 
      matchId, 
      userId, 
      isCorrect, 
      points, 
      timeSpent: answerData.timeSpent 
    });
  }

  private async nextQuestion(matchId: string) {
    const match = this.matches.get(matchId);
    if (!match) return;

    match.currentQuestionIndex++;

    if (match.currentQuestionIndex >= match.questions.length) {
      // Match completed
      await this.endMatch(matchId);
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

    // Set timer for next question
    setTimeout(() => {
      this.nextQuestion(matchId);
    }, match.timeLimit * 1000);
  }

  private async endMatch(matchId: string) {
    const match = this.matches.get(matchId);
    if (!match) return;

    match.status = 'COMPLETED';

    // Calculate final rankings
    const rankings = Array.from(match.players.values())
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        // Tiebreaker: faster average time
        const avgTimeA = a.answers.reduce((sum, ans) => sum + ans.timeSpent, 0) / a.answers.length;
        const avgTimeB = b.answers.reduce((sum, ans) => sum + ans.timeSpent, 0) / b.answers.length;
        return avgTimeA - avgTimeB;
      })
      .map((player, index) => ({
        rank: index + 1,
        userId: player.userId,
        username: player.username,
        score: player.score,
        correctAnswers: player.answers.filter(a => a.isCorrect).length,
        totalAnswers: player.answers.length
      }));

    // Send final results
    this.io.to(matchId).emit('match_completed', {
      rankings,
      matchId,
      winner: rankings[0]
    });

    // Clean up
    for (const player of match.players.values()) {
      this.userToMatch.delete(player.userId);
    }
    this.joinCodeToMatch.delete(match.joinCode);

    // Keep match data for a while before cleanup
    setTimeout(() => {
      this.matches.delete(matchId);
      store.del(`match:${matchId}`);
    }, 300000); // 5 minutes

    logInfo('Match completed', { matchId, players: rankings.length, winner: rankings[0].username });
  }

  private handleDisconnect(userId: number, socketId: string) {
    const matchId = this.userToMatch.get(userId);
    if (!matchId) return;

    const match = this.matches.get(matchId);
    if (!match) return;

    const player = match.players.get(userId);
    if (!player) return;

    // Notify other players
    this.io.to(matchId).emit('player_disconnected', {
      userId,
      username: player.username
    });

    // If match hasn't started, remove player
    if (match.status === 'WAITING') {
      match.players.delete(userId);
      this.userToMatch.delete(userId);

      // If no players left, clean up match
      if (match.players.size === 0) {
        this.matches.delete(matchId);
        this.joinCodeToMatch.delete(match.joinCode);
        store.del(`match:${matchId}`);
      }
    }
  }

  private startMatchCleanup() {
    // Clean up old matches every 10 minutes
    setInterval(() => {
      const now = Date.now();
      const maxAge = 60 * 60 * 1000; // 1 hour

      for (const [matchId, match] of this.matches) {
        if (now - match.createdAt.getTime() > maxAge) {
          this.matches.delete(matchId);
          this.joinCodeToMatch.delete(match.joinCode);
          store.del(`match:${matchId}`);
          logInfo('Cleaned up old match', { matchId });
        }
      }
    }, 10 * 60 * 1000);
  }

  // Public methods for HTTP API integration
  public getActiveMatches(): any[] {
    return Array.from(this.matches.values()).map(match => ({
      id: match.id,
      quizId: match.quizId,
      quiz: match.quiz,
      playerCount: match.players.size,
      maxPlayers: match.maxPlayers,
      status: match.status,
      joinCode: match.joinCode,
      matchType: match.matchType,
      createdAt: match.createdAt
    }));
  }

  public getMatchById(matchId: string): MatchRoom | undefined {
    return this.matches.get(matchId);
  }

  public findMatchByJoinCode(joinCode: string): MatchRoom | undefined {
    const matchId = this.joinCodeToMatch.get(joinCode.toUpperCase());
    return matchId ? this.matches.get(matchId) : undefined;
  }
}

// Enhanced Match Service will be initialized in startServer function
let enhancedMatchService: EnhancedMatchService;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Enhanced Quiz Match Service',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Get active matches (for monitoring/admin)
app.get('/matches', (req, res) => {
  try {
    const matches = enhancedMatchService.getActiveMatches();
    res.json({
      success: true,
      data: { matches },
      count: matches.length
    });
  } catch (error) {
    logError('Failed to get active matches', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active matches'
    });
  }
});

// Get specific match details
app.get('/matches/:matchId', (req, res) => {
  try {
    const match = enhancedMatchService.getMatchById(req.params.matchId);
    if (!match) {
      res.status(404).json({
        success: false,
        error: 'Match not found'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        match: {
          id: match.id,
          quizId: match.quizId,
          quiz: match.quiz,
          playerCount: match.players.size,
          maxPlayers: match.maxPlayers,
          status: match.status,
          joinCode: match.joinCode,
          matchType: match.matchType,
          currentQuestionIndex: match.currentQuestionIndex,
          totalQuestions: match.questions.length,
          createdAt: match.createdAt
        }
      }
    });
  } catch (error) {
    logError('Failed to get match details', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to get match details'
    });
  }
});

// Find match by join code
app.get('/matches/code/:joinCode', (req, res) => {
  try {
    const match = enhancedMatchService.findMatchByJoinCode(req.params.joinCode);
    if (!match) {
      res.status(404).json({
        success: false,
        error: 'No match found with that join code'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        match: {
          id: match.id,
          quizId: match.quizId,
          quiz: match.quiz,
          playerCount: match.players.size,
          maxPlayers: match.maxPlayers,
          status: match.status,
          joinCode: match.joinCode,
          matchType: match.matchType,
          createdAt: match.createdAt
        }
      }
    });
  } catch (error) {
    logError('Failed to find match by code', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to find match by code'
    });
  }
});

// Create friend match via HTTP (for testing)
app.post('/matches/friend', async (req, res) => {
  try {
    const { quizId, userId = 1, username = 'TestUser' } = req.body;
    
    if (!quizId) {
      res.status(400).json({
        success: false,
        error: 'Quiz ID is required'
      });
      return;
    }

    const result = await enhancedMatchService.createFriendMatch(quizId, userId, username);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logError('Failed to create friend match', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to create friend match'
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logError('Unhandled error in match service', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logInfo('SIGTERM received, shutting down gracefully');
  server.close(() => {
    if (isRedisConnected && (store as any).disconnect) {
      (store as any).disconnect();
    }
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logInfo('SIGINT received, shutting down gracefully');
  server.close(() => {
    if (isRedisConnected && (store as any).disconnect) {
      (store as any).disconnect();
    }
    process.exit(0);
  });
});

// Start server
async function startServer() {
  // Initialize store (Redis with fallback to in-memory)
  await initializeStore();
  
  // Create match service instance
  enhancedMatchService = new EnhancedMatchService(server);
  
  server.listen(port, () => {
    logInfo(`Enhanced Match service started on port ${port}`, {
      port,
      environment: process.env.NODE_ENV || 'development',
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
