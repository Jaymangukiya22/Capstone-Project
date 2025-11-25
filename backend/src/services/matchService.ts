// src/services/matchService.ts
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import type RedisType from 'ioredis';
import { Quiz, QuizQuestion, QuestionBankItem, QuestionBankOption, User } from '../models';
import { getRedisClient, getRedisPubSub } from '../config/redis';
import { logInfo, logError } from '../utils/logger';
import jwt from 'jsonwebtoken';

type Redis = RedisType;

const PUBSUB_CHANNEL = 'match-events';
const ANALYTICS_STREAM = 'match_analytics';
const LOCK_PREFIX = 'lock:match:start:';
const DEFAULT_LOCK_TTL_MS = 10_000;

interface MatchPlayer {
  userId: number;
  username: string;
  socketId: string;
  score: number;
  currentQuestionIndex: number;
  isReady: boolean;
  isAI: boolean;
  answers: any[];
  aiOpponent?: {
    id: string;
    name: string;
    difficulty: string;
    avatar: string;
  };
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

export class MatchService {
  private io: SocketIOServer | null = null;
  private matches: Map<string, MatchRoom> = new Map();
  private userToMatch: Map<number, string> = new Map();
  private joinCodeToMatch: Map<string, string> = new Map();

  private redisClient: Redis;
  private redisPub: Redis;
  private redisSub: Redis;

  // Unique token for lock ownership
  private instanceId: string = uuidv4();

  constructor(io?: SocketIOServer) {
    // Get Redis clients (assumes initializeRedis() already called)
    this.redisClient = getRedisClient();
    const { pub, sub } = getRedisPubSub();
    this.redisPub = pub;
    this.redisSub = sub;

    this.setupRedisSubscriber();

    if (io) {
      this.io = io;
      this.setupSocketHandlers();
    }
  }

  public setSocketServer(io: SocketIOServer) {
    this.io = io;
    this.setupSocketHandlers();
  }

  /* -------------------------
     Utilities
  ------------------------- */
  private generateJoinCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private async writeAnalytics(eventType: string, payload: Record<string, any>): Promise<void> {
    try {
      const timestamp = Date.now().toString();
      // XADD stream: field-value pairs
      await this.redisClient.xadd(
        ANALYTICS_STREAM,
        '*',
        'event',
        eventType,
        'timestamp',
        timestamp,
        'payload',
        JSON.stringify(payload)
      );
    } catch (err: unknown) {
      logError('Failed to write analytics stream', err as Error);
    }
  }

  // Acquire lock (SET key value NX PX ttl)
  private async acquireLock(lockKey: string, ttlMs = DEFAULT_LOCK_TTL_MS): Promise<string | null> {
    try {
      const token = this.instanceId;
      // Use options object form so typings accept NX/PX
      const res = await this.redisClient.set(lockKey, token, 'PX', ttlMs, 'NX');
      if (res === 'OK') return token;
      return null;
    } catch (err: unknown) {
      logError('acquireLock error', err as Error);
      return null;
    }
  }

  // Safe release via Lua script (delete only if value matches)
  private async releaseLock(lockKey: string, token: string): Promise<boolean> {
    const lua = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    try {
      const res = await this.redisClient.eval(lua, 1, lockKey, token);
      return res === 1;
    } catch (err: unknown) {
      logError('releaseLock error', err as Error);
      return false;
    }
  }

  /* -------------------------
     Redis Pub/Sub subscriber
     Forwards cluster events to local Socket.IO
  ------------------------- */
  private setupRedisSubscriber() {
    // subscribe returns a Promise<number> — ignore the return value
    this.redisSub.subscribe(PUBSUB_CHANNEL).catch((err: unknown) => {
      logError('Failed to subscribe to match-events', err as Error);
    });

    // ioredis 'message' event: (channel, message)
    this.redisSub.on('message', (channel: string, message: string) => {
      if (channel !== PUBSUB_CHANNEL) return;
      try {
        const parsed = JSON.parse(message) as { type: string; matchId?: string; payload?: any };
        const { type, matchId, payload } = parsed;

        switch (type) {
          case 'PLAYER_JOINED':
            if (matchId) this.io?.to(matchId).emit('player_joined', payload);
            break;
          case 'PLAYER_LIST_UPDATED':
            if (matchId) this.io?.to(matchId).emit('player_list_updated', payload);
            break;
          case 'PLAYER_READY':
            if (matchId) this.io?.to(matchId).emit('player_ready', payload);
            break;
          case 'MATCH_STARTED':
            if (matchId) this.io?.to(matchId).emit('match_started', payload);
            break;
          case 'NEXT_QUESTION':
            if (matchId) this.io?.to(matchId).emit('next_question', payload);
            break;
          case 'MATCH_COMPLETED':
            if (matchId) this.io?.to(matchId).emit('match_completed', payload);
            break;
          case 'ANSWER_RESULT':
            // answer result may target specific socketId
            if (payload?.socketId) {
              this.io?.to(payload.socketId).emit('answer_result', payload);
            }
            break;
          default:
            if (matchId) this.io?.to(matchId).emit(type.toLowerCase(), payload);
        }
      } catch (err: unknown) {
        logError('Error parsing pubsub message', err as Error);
      }
    });
  }

  /* -------------------------
     Socket handlers (local)
  ------------------------- */
  private setupSocketHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      logInfo('Client connected', { socketId: socket.id });

      socket.on('authenticate', async (data: any) => {
        try {
          let userId: number;
          let username: string;

          if (typeof data === 'string') {
            const decoded = jwt.verify(data, process.env.JWT_SECRET || '') as any;
            const user = await User.findByPk(decoded.userId, { attributes: ['id', 'username', 'isActive'] });
            if (!user || !user.isActive) {
              socket.emit('auth_error', { message: 'Invalid token or user inactive' });
              return;
            }
            userId = user.id;
            username = user.username;
          } else {
            userId = data.userId || 1;
            username = data.username || `Player${userId}`;
            try {
              const user = await User.findByPk(userId, { attributes: ['id', 'username', 'email', 'isActive'] });
              if (user) username = user.email || user.username;
            } catch (err: unknown) {
              logInfo('Using fallback user data', { userId, username });
            }
          }

          socket.data.userId = userId;
          socket.data.username = username;
          socket.emit('authenticated', { user: { id: userId, username } });
          logInfo('User authenticated', { userId, username, socketId: socket.id });
        } catch (err: unknown) {
          logError('Authentication error', err as Error);
          socket.emit('auth_error', { message: 'Authentication failed' });
        }
      });

      socket.on('create_match', async (data: { quizId: number; maxPlayers?: number }) => {
        try {
          if (!socket.data.userId) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }

          const { matchId, joinCode } = await this.createMatch(data.quizId, socket.data.userId, data.maxPlayers);
          socket.join(matchId);

          // publish events cluster-wide
          await this.publishEvent('PLAYER_JOINED', matchId, { userId: socket.data.userId, username: socket.data.username });
          const match = this.matches.get(matchId)!;
          const playerList = Array.from(match.players.values()).map((p) => ({ userId: p.userId, username: p.username, isReady: p.isReady }));
          await this.publishEvent('PLAYER_LIST_UPDATED', matchId, { players: playerList });

          socket.emit('match_created', { matchId, joinCode });
          await this.writeAnalytics('match_created', { matchId, quizId: data.quizId, creator: socket.data.userId });
          logInfo('Match created', { matchId, userId: socket.data.userId });
        } catch (err: unknown) {
          logError('Create match error', err as Error);
          socket.emit('error', { message: 'Failed to create match' });
        }
      });

      socket.on('create_friend_match', async (data: { quizId: number }) => {
        try {
          if (!socket.data.userId) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }

          const { matchId, joinCode } = await this.createFriendMatch(data.quizId, socket.data.userId);
          socket.join(matchId);

          const match = this.matches.get(matchId);
          if (match && match.players.has(socket.data.userId)) {
            const creator = match.players.get(socket.data.userId)!;
            creator.username = socket.data.username || `Player${socket.data.userId}`;
            creator.socketId = socket.id;
            this.userToMatch.set(socket.data.userId, matchId);
          }

          await this.publishEvent('PLAYER_JOINED', matchId, { userId: socket.data.userId, username: socket.data.username });
          socket.emit('friend_match_created', { matchId, joinCode });
          await this.writeAnalytics('friend_match_created', { matchId, joinCode, creator: socket.data.userId });
          logInfo('Friend match created', { matchId, joinCode, userId: socket.data.userId });
        } catch (err: unknown) {
          logError('Create friend match error', err as Error);
          socket.emit('error', { message: 'Failed to create friend match' });
        }
      });

      socket.on('join_match', async (data: { joinCode: string }) => {
        try {
          if (!socket.data.userId) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }

          const joinCode = data.joinCode.toUpperCase();
          logInfo('Player attempting to join match by code', { joinCode, userId: socket.data.userId });

          // First check local in-memory map (fast path for same instance)
          let matchId = this.joinCodeToMatch.get(joinCode);

          // If not found locally, check Redis (for distributed/scaled setup)
          if (!matchId) {
            const redisMatchId = await this.redisClient.get(`joincode:${joinCode}`);
            if (redisMatchId) {
              matchId = redisMatchId;
              logInfo('Match found in Redis', { joinCode, matchId });
            }
          }

          if (!matchId) {
            logInfo('Match not found for join code', { joinCode });
            socket.emit('error', { message: 'Match not found with code: ' + joinCode });
            return;
          }

          const success = await this.joinMatch(matchId, socket.data.userId, socket.id);
          if (!success) {
            socket.emit('error', { message: 'Failed to join match' });
            return;
          }

          socket.join(matchId);

          const match = this.matches.get(matchId)!;
          const playerList = Array.from(match.players.values()).map((p) => ({ userId: p.userId, username: p.username, isReady: p.isReady }));

          await this.publishEvent('PLAYER_LIST_UPDATED', matchId, { players: playerList });
          await this.publishEvent('PLAYER_JOINED', matchId, { userId: socket.data.userId, username: socket.data.username });

          socket.emit('match_joined', { matchId, players: playerList });
          await this.writeAnalytics('player_joined', { matchId, userId: socket.data.userId });
          logInfo('Player joined match', { matchId, userId: socket.data.userId });
        } catch (err: unknown) {
          logError('Join match error', err as Error);
          socket.emit('error', { message: 'Failed to join match' });
        }
      });

      // Alias for join_match for consistency with frontend naming
      socket.on('join_match_by_code', async (data: { joinCode: string }) => {
        // Reuse the join_match handler logic
        try {
          if (!socket.data.userId) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }

          const joinCode = data.joinCode.toUpperCase();
          logInfo('Player attempting to join match by code (via join_match_by_code)', { joinCode, userId: socket.data.userId });

          // First check local in-memory map (fast path for same instance)
          let matchId = this.joinCodeToMatch.get(joinCode);

          // If not found locally, check Redis (for distributed/scaled setup)
          if (!matchId) {
            const redisMatchId = await this.redisClient.get(`joincode:${joinCode}`);
            if (redisMatchId) {
              matchId = redisMatchId;
              logInfo('Match found in Redis', { joinCode, matchId });
            }
          }

          if (!matchId) {
            logInfo('Match not found for join code', { joinCode });
            socket.emit('error', { message: 'Match not found with code: ' + joinCode });
            return;
          }

          const success = await this.joinMatch(matchId, socket.data.userId, socket.id);
          if (!success) {
            socket.emit('error', { message: 'Failed to join match' });
            return;
          }

          socket.join(matchId);

          const match = this.matches.get(matchId)!;
          const playerList = Array.from(match.players.values()).map((p) => ({ userId: p.userId, username: p.username, isReady: p.isReady }));

          await this.publishEvent('PLAYER_LIST_UPDATED', matchId, { players: playerList });
          await this.publishEvent('PLAYER_JOINED', matchId, { userId: socket.data.userId, username: socket.data.username });

          socket.emit('match_joined', { matchId, players: playerList });
          await this.writeAnalytics('player_joined', { matchId, userId: socket.data.userId });
          logInfo('Player joined match', { matchId, userId: socket.data.userId });
        } catch (err: unknown) {
          logError('Join match by code error', err as Error);
          socket.emit('error', { message: 'Failed to join match' });
        }
      });

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
          if (!player) {
            socket.emit('error', { message: 'Player not in match' });
            return;
          }

          player.isReady = true;
          await this.publishEvent('PLAYER_READY', matchId, { userId: player.userId, username: player.username });
          await this.writeAnalytics('player_ready', { matchId, userId: player.userId });

          const allReady = Array.from(match.players.values()).every((p) => p.isReady);
          const minPlayers = match.matchType === 'FRIEND_1V1' ? 2 : 2;

          if (allReady && match.players.size >= minPlayers) {
            // Attempt cluster-safe start
            await this.attemptStartMatchClusterSafe(matchId, match.timeLimit);
          }
        } catch (err: unknown) {
          logError('Player ready error', err as Error);
        }
      });

      socket.on('submit_answer', async (data: { questionId: number; selectedOptions: number[]; timeSpent: number }) => {
        try {
          const matchId = this.userToMatch.get(socket.data.userId);
          if (!matchId) return;
          await this.submitAnswer(matchId, socket.data.userId, data);
        } catch (err: unknown) {
          logError('Submit answer error', err as Error);
        }
      });

      socket.on('disconnect', () => {
        logInfo('Client disconnected', { socketId: socket.id });
        if (socket.data.userId) {
          const matchId = this.userToMatch.get(socket.data.userId);
          if (matchId) {
            this.publishEvent('PLAYER_DISCONNECTED', matchId, { userId: socket.data.userId, username: socket.data.username }).catch((err) => {
              logError('Publish disconnect error', err as Error);
            });
            // optional reconnection logic could be placed here
          }
        }
      });
    });
  }

  // Publish structured event to cluster via Redis
  private async publishEvent(type: string, matchId: string, payload: Record<string, any>): Promise<void> {
    try {
      const message = JSON.stringify({ type, matchId, payload });
      await this.redisPub.publish(PUBSUB_CHANNEL, message);
    } catch (err: unknown) {
      logError('Failed to publish event', err as Error);
    }
  }

  /* -------------------------
     Match lifecycle methods
  ------------------------- */
  public async createSoloMatch(userId: number, quizId: number, aiOpponentId?: string): Promise<string> {
    const { matchId } = await this.createMatch(quizId, userId, 2);
    return matchId;
  }

  public async createMatch(quizId: number, userId: number, maxPlayers = 10): Promise<{ matchId: string; joinCode: string }> {
    const quiz = await Quiz.findOne({ where: { id: quizId, isActive: true } });
    if (!quiz) throw new Error('Quiz not found');

    const matchId = uuidv4();
    const joinCode = this.generateJoinCode();
    const questions = await this.loadQuizQuestions(quizId);

    const match: MatchRoom = {
      id: matchId,
      quizId,
      quiz: { id: quiz.id, title: quiz.title, timeLimit: quiz.timeLimit },
      players: new Map(),
      status: 'WAITING',
      currentQuestionIndex: 0,
      questionStartTime: 0,
      maxPlayers,
      timeLimit: quiz.timeLimit || 30,
      questions,
      createdAt: new Date(),
      joinCode,
      matchType: 'MULTIPLAYER'
    };

    const creator: MatchPlayer = {
      userId,
      username: '',
      socketId: '',
      score: 0,
      currentQuestionIndex: 0,
      isReady: false,
      isAI: false,
      answers: []
    };

    match.players.set(userId, creator);
    this.matches.set(matchId, match);
    this.userToMatch.set(userId, matchId);
    this.joinCodeToMatch.set(joinCode, matchId);

    await this.redisClient.setex(`match:${matchId}`, 3600, JSON.stringify({
      id: matchId, quizId, joinCode, status: match.status, createdAt: match.createdAt.toISOString()
    }));

    await this.writeAnalytics('match_created', { matchId, quizId, creator: userId });
    return { matchId, joinCode };
  }

  public async createFriendMatch(quizId: number, userId: number): Promise<{ matchId: string; joinCode: string }> {
    const quiz = await Quiz.findOne({ where: { id: quizId, isActive: true } });
    if (!quiz) throw new Error('Quiz not found');

    const matchId = uuidv4();
    const joinCode = this.generateJoinCode();
    const questions = await this.loadQuizQuestions(quizId);

    const match: MatchRoom = {
      id: matchId,
      quizId,
      quiz: { id: quiz.id, title: quiz.title, timeLimit: quiz.timeLimit },
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

    const creator: MatchPlayer = {
      userId,
      username: '',
      socketId: '',
      score: 0,
      currentQuestionIndex: 0,
      isReady: false,
      isAI: false,
      answers: []
    };

    match.players.set(userId, creator);
    this.matches.set(matchId, match);
    this.userToMatch.set(userId, matchId);
    this.joinCodeToMatch.set(joinCode, matchId);

    // Store complete match data in Redis (without workerId - will be assigned on first join)
    await this.redisClient.setex(`match:${matchId}`, 3600, JSON.stringify({
      id: matchId, 
      quizId, 
      joinCode, 
      matchType: 'FRIEND_1V1', 
      status: match.status, 
      createdAt: match.createdAt.toISOString(),
      players: Array.from(match.players.values()).map(p => ({
        userId: p.userId,
        username: p.username,
        score: p.score,
        currentQuestionIndex: p.currentQuestionIndex,
        isReady: p.isReady,
        answers: p.answers
      })),
      currentQuestionIndex: match.currentQuestionIndex,
      questionStartTime: match.questionStartTime,
      timeLimit: match.timeLimit
    }));

    // Store join code to match ID mapping in Redis
    await this.redisClient.setex(`joincode:${joinCode}`, 3600, matchId);

    await this.writeAnalytics('friend_match_created', { matchId, joinCode, creator: userId });
    logInfo('Friend match created', { matchId, joinCode, quizId });
    return { matchId, joinCode };
  }

  public async joinMatch(matchId: string, userId: number, socketId: string): Promise<boolean> {
    const match = this.matches.get(matchId);
    if (!match || match.status !== 'WAITING' || match.players.size >= match.maxPlayers) return false;

    let username = `TestUser${userId}`;
    try {
      const user = await User.findByPk(userId, { attributes: ['username', 'email'] });
      if (user) username = user.email || user.username;
    } catch (err: unknown) {
      logInfo('Using fallback username', { userId, username });
    }

    const player: MatchPlayer = {
      userId, username, socketId, score: 0, currentQuestionIndex: 0, isReady: false, isAI: false, answers: []
    };

    match.players.set(userId, player);
    this.userToMatch.set(userId, matchId);

    await this.writeAnalytics('player_joined', { matchId, userId });
    return true;
  }

  // Attempt start with cluster-safe lock
  private async attemptStartMatchClusterSafe(matchId: string, questionTimeLimitSec: number): Promise<void> {
    const lockKey = LOCK_PREFIX + matchId;
    // Ensure lock TTL covers question duration plus a buffer
    const ttl = Math.max(DEFAULT_LOCK_TTL_MS, questionTimeLimitSec * 1000 + 5000);
    const token = await this.acquireLock(lockKey, ttl);
    if (!token) {
      logInfo('Lock not acquired; another node will start the match', { matchId });
      return;
    }

    try {
      const match = this.matches.get(matchId);
      if (!match) return;
      if (match.status !== 'WAITING') return;

      const allReady = Array.from(match.players.values()).every((p) => p.isReady);
      if (!allReady) return;

      await this.startMatch(matchId);

      // Publish cluster-wide match started
      await this.publishEvent('MATCH_STARTED', matchId, {
        questionIndex: match.currentQuestionIndex,
        question: this.makeQuestionForPlayers(match.questions[match.currentQuestionIndex], match.timeLimit),
        totalQuestions: match.questions.length
      });

      await this.writeAnalytics('match_started', { matchId });
    } catch (err: unknown) {
      logError('attemptStartMatchClusterSafe error', err as Error);
    } finally {
      await this.releaseLock(lockKey, token).catch((err: unknown) => {
        logError('Failed to release start lock', err as Error);
      });
    }
  }

  private makeQuestionForPlayers(currentQuestion: any, timeLimit: number) {
    return {
      id: currentQuestion.id,
      questionText: currentQuestion.questionText,
      options: currentQuestion.options.map((opt: any) => ({ id: opt.id, optionText: opt.optionText })),
      timeLimit
    };
  }

  private async startMatch(matchId: string): Promise<void> {
    const match = this.matches.get(matchId);
    if (!match) {
      logError('Cannot start match - not found', new Error(`Match ${matchId} not found`));
      return;
    }

    if (!match.questions || match.questions.length === 0) {
      logError('Cannot start match - no questions', new Error(`Match ${matchId} has no questions`));
      await this.publishEvent('MATCH_ERROR', matchId, { message: 'No questions available' });
      return;
    }

    match.status = 'IN_PROGRESS';
    match.currentQuestionIndex = 0;
    match.questionStartTime = Date.now();

    const payload = this.makeQuestionForPlayers(match.questions[0], match.timeLimit);

    // Local emit
    this.io?.to(matchId).emit('match_started', { question: payload, questionIndex: 0, totalQuestions: match.questions.length });

    // Start per-question timer on this node (node that started the match)
    setTimeout(() => {
      this.nextQuestion(matchId).catch((err: unknown) => logError('nextQuestion timer error', err as Error));
    }, match.timeLimit * 1000);

    logInfo('Match started', { matchId, players: match.players.size });
  }

  private async submitAnswer(matchId: string, userId: number, answerData: { questionId: number; selectedOptions: number[]; timeSpent: number }): Promise<void> {
    try {
      const match = this.matches.get(matchId);
      if (!match || match.status !== 'IN_PROGRESS') return;

      const player = match.players.get(userId);
      if (!player) return;

      const currentQuestion = match.questions[match.currentQuestionIndex];
      if (!currentQuestion || currentQuestion.id !== answerData.questionId) return;

      const correctOptionIds = currentQuestion.options.filter((opt: any) => opt.isCorrect).map((opt: any) => opt.id);
      const isCorrect = answerData.selectedOptions.length === correctOptionIds.length &&
        answerData.selectedOptions.every((id) => correctOptionIds.includes(id));

      const basePoints = 100;
      const timeBonus = Math.max(0, Math.floor((match.timeLimit - answerData.timeSpent) * 2));
      const points = isCorrect ? basePoints + timeBonus : 0;

      player.score += points;
      player.answers.push({
        questionId: answerData.questionId,
        selectedOptions: answerData.selectedOptions,
        isCorrect,
        timeSpent: answerData.timeSpent,
        points
      });

      const payload = {
        socketId: player.socketId,
        isCorrect,
        points,
        correctOptions: correctOptionIds,
        totalScore: player.score
      };

      await this.publishEvent('ANSWER_RESULT', matchId, payload);
      await this.writeAnalytics('answer_submitted', { matchId, userId, isCorrect, points });
    } catch (err: unknown) {
      logError('submitAnswer error', err as Error);
    }
  }

  private async nextQuestion(matchId: string): Promise<void> {
    const match = this.matches.get(matchId);
    if (!match) return;

    match.currentQuestionIndex++;

    if (match.currentQuestionIndex >= match.questions.length) {
      await this.endMatch(matchId);
      return;
    }

    const currentQuestion = match.questions[match.currentQuestionIndex];
    const payload = this.makeQuestionForPlayers(currentQuestion, match.timeLimit);
    match.questionStartTime = Date.now();

    await this.publishEvent('NEXT_QUESTION', matchId, {
      question: payload,
      questionIndex: match.currentQuestionIndex,
      totalQuestions: match.questions.length
    });

    this.io?.to(matchId).emit('next_question', { question: payload, questionIndex: match.currentQuestionIndex, totalQuestions: match.questions.length });

    setTimeout(() => {
      this.nextQuestion(matchId).catch((err: unknown) => logError('nextQuestion timer error', err as Error));
    }, match.timeLimit * 1000);
  }

  private async endMatch(matchId: string): Promise<void> {
    const match = this.matches.get(matchId);
    if (!match) return;

    match.status = 'COMPLETED';

    const results = Array.from(match.players.values()).map((player) => ({
      userId: player.userId,
      username: player.username,
      score: player.score,
      answers: player.answers
    }));

    results.sort((a, b) => b.score - a.score);

    const payload = { results, winner: results[0], matchId };

    await this.publishEvent('MATCH_COMPLETED', matchId, payload);
    this.io?.to(matchId).emit('match_completed', payload);
    await this.writeAnalytics('match_completed', { matchId, results });

    // Cleanup
    match.players.forEach((p) => this.userToMatch.delete(p.userId));
    if (match.joinCode) this.joinCodeToMatch.delete(match.joinCode);
    this.matches.delete(matchId);

    logInfo('Match completed', { matchId });
  }

  private startAIResponseTimer(_match: MatchRoom, _questionIndex: number): void {
    // Placeholder for AI logic
  }

  private async loadQuizQuestions(quizId: number): Promise<any[]> {
    try {
      const quizQuestions = await QuizQuestion.findAll({
        where: { quizId },
        include: [{
          model: QuestionBankItem,
          as: 'question',
          include: [{ model: QuestionBankOption, as: 'options' }]
        }],
        order: [['orderIndex', 'ASC']]
      });

      if (!quizQuestions || quizQuestions.length === 0) return [];

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
    } catch (err: unknown) {
      logError('Failed to load quiz questions', err as Error);
      return [];
    }
  }

  /* -------------------------
     Monitoring / getters (public)
  ------------------------- */
  public getMatchById(matchId: string): MatchRoom | undefined {
    return this.matches.get(matchId);
  }

  public getAvailableMatches(): Array<{
    id: string;
    quizId: number;
    quiz: any;
    playerCount: number;
    maxPlayers: number;
    status: string;
    createdAt: Date;
  }> {
    const available: any[] = [];
    this.matches.forEach((match, id) => {
      if (match.status === 'WAITING' && match.players.size < match.maxPlayers) {
        available.push({
          id,
          quizId: match.quizId,
          quiz: match.quiz,
          playerCount: match.players.size,
          maxPlayers: match.maxPlayers,
          status: match.status,
          createdAt: match.createdAt
        });
      }
    });
    return available;
  }

  public getDetailedStats() {
    const stats = {
      totalMatches: this.matches.size,
      totalPlayers: Array.from(this.matches.values()).reduce((acc, m) => acc + m.players.size, 0),
      matchesByStatus: { WAITING: 0, IN_PROGRESS: 0, COMPLETED: 0 },
      matchesByType: { SOLO: 0, MULTIPLAYER: 0, FRIEND_1V1: 0 }
    };

    for (const m of this.matches.values()) {
      stats.matchesByStatus[m.status]++;
      stats.matchesByType[m.matchType]++;
    }
    return stats;
  }
}

// Lazy-load singleton to ensure Redis is initialized first
let matchServiceInstance: MatchService | null = null;

export function getMatchService(): MatchService {
  if (!matchServiceInstance) {
    matchServiceInstance = new MatchService();
  }
  return matchServiceInstance;
}

// For backward compatibility, export as property getter
export const matchService = new Proxy({} as any, {
  get: () => getMatchService()
});
