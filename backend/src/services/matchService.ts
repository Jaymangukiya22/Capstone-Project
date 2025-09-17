import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import jwt from 'jsonwebtoken';
import { logInfo, logError } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();
const redis = createClient({ url: process.env.REDIS_URL });

export interface MatchPlayer {
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

export interface MatchRoom {
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
}

export class MatchService {
  private io: SocketIOServer;
  private matches: Map<string, MatchRoom> = new Map();
  private userToMatch: Map<number, string> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    // Connect to Redis
    redis.connect().catch(console.error);

    this.setupSocketHandlers();
    this.startMatchCleanup();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      logInfo('Client connected', { socketId: socket.id });

      // Authenticate user
      socket.on('authenticate', async (token: string) => {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
          const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, username: true, isActive: true }
          });

          if (!user || !user.isActive) {
            socket.emit('auth_error', { message: 'Invalid token or user inactive' });
            return;
          }

          socket.data.userId = user.id;
          socket.data.username = user.username;
          socket.emit('authenticated', { user });

          logInfo('User authenticated', { userId: user.id, socketId: socket.id });
        } catch (error) {
          socket.emit('auth_error', { message: 'Authentication failed' });
          logError('Authentication error', error as Error);
        }
      });

      // Create match
      socket.on('create_match', async (data: { quizId: number; maxPlayers?: number }) => {
        try {
          if (!socket.data.userId) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }

          const match = await this.createMatch(data.quizId, socket.data.userId, data.maxPlayers);
          socket.join(match.id);
          socket.emit('match_created', { matchId: match.id, matchCode: match.id.slice(-6).toUpperCase() });

          logInfo('Match created', { matchId: match.id, userId: socket.data.userId });
        } catch (error) {
          socket.emit('error', { message: 'Failed to create match' });
          logError('Create match error', error as Error);
        }
      });

      // Join match
      socket.on('join_match', async (data: { matchCode: string }) => {
        try {
          if (!socket.data.userId) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }

          const matchId = await this.findMatchByCode(data.matchCode);
          if (!matchId) {
            socket.emit('error', { message: 'Match not found' });
            return;
          }

          const success = await this.joinMatch(matchId, socket.data.userId, socket.id);
          if (success) {
            socket.join(matchId);
            const match = this.matches.get(matchId)!;
            
            socket.emit('match_joined', { 
              matchId, 
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
            socket.emit('error', { message: 'Failed to join match' });
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
            if (allReady && match.players.size >= 2) {
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

  private async createMatch(quizId: number, userId: number, maxPlayers = 10): Promise<MatchRoom> {
    // Get quiz with questions
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId, isActive: true },
      include: {
        quizQuestions: {
          include: {
            question: {
              include: {
                options: true
              }
            }
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!quiz || quiz.quizQuestions.length === 0) {
      throw new Error('Quiz not found or has no questions');
    }

    const matchId = uuidv4();
    const questions = quiz.quizQuestions.map((qq: any) => qq.question);

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
      maxPlayers,
      timeLimit: quiz.timeLimit || 30, // seconds per question
      questions,
      createdAt: new Date()
    };

    // Add creator as first player
    const creator: MatchPlayer = {
      userId,
      username: '', // Will be set when socket connects
      socketId: '',
      score: 0,
      currentQuestionIndex: 0,
      isReady: false,
      answers: []
    };

    match.players.set(userId, creator);
    this.matches.set(matchId, match);
    this.userToMatch.set(userId, matchId);

    // Store match in Redis for persistence
    await redis.setEx(`match:${matchId}`, 3600, JSON.stringify({
      id: matchId,
      quizId,
      status: match.status,
      createdAt: match.createdAt
    }));

    return match;
  }

  private async findMatchByCode(code: string): Promise<string | null> {
    // Find match by last 6 characters of ID
    for (const [matchId, match] of this.matches) {
      if (matchId.slice(-6).toUpperCase() === code.toUpperCase()) {
        return matchId;
      }
    }
    return null;
  }

  private async joinMatch(matchId: string, userId: number, socketId: string): Promise<boolean> {
    const match = this.matches.get(matchId);
    if (!match || match.status !== 'WAITING' || match.players.size >= match.maxPlayers) {
      return false;
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true }
    });

    if (!user) {
      return false;
    }

    const player: MatchPlayer = {
      userId,
      username: user.username,
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

    // Update ELO ratings
    await this.updateEloRatings(rankings);

    // Send final results
    this.io.to(matchId).emit('match_completed', {
      rankings,
      matchId
    });

    // Clean up
    for (const player of match.players.values()) {
      this.userToMatch.delete(player.userId);
    }

    // Keep match data for a while before cleanup
    setTimeout(() => {
      this.matches.delete(matchId);
      redis.del(`match:${matchId}`);
    }, 300000); // 5 minutes

    logInfo('Match completed', { matchId, players: rankings.length });
  }

  private async updateEloRatings(rankings: any[]) {
    try {
      // Simple ELO update - winner gains points, others lose points
      const winner = rankings[0];
      const eloChange = 25;

      for (const player of rankings) {
        const change = player.rank === 1 ? eloChange : -Math.floor(eloChange / (rankings.length - 1));
        
        await prisma.user.update({
          where: { id: player.userId },
          data: {
            eloRating: { increment: change },
            totalMatches: { increment: 1 },
            wins: player.rank === 1 ? { increment: 1 } : undefined,
            losses: player.rank !== 1 ? { increment: 1 } : undefined
          }
        });
      }
    } catch (error) {
      logError('Failed to update ELO ratings', error as Error);
    }
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
        redis.del(`match:${matchId}`);
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
          redis.del(`match:${matchId}`);
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
      createdAt: match.createdAt
    }));
  }

  public getMatchById(matchId: string): MatchRoom | undefined {
    return this.matches.get(matchId);
  }
}

export let matchService: MatchService;
