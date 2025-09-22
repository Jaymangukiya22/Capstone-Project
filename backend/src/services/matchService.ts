import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Match, MatchPlayer as MatchPlayerModel, User, Quiz, QuizQuestion, QuestionBankItem, QuestionBankOption, MatchStatus, MatchType, PlayerStatus } from '../models';
import { createClient } from 'redis';
import jwt from 'jsonwebtoken';
import { logInfo, logError } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { Sequelize } from 'sequelize';
import { aiOpponentService, AIOpponent, AIResponse } from './aiOpponentService';

// Removed Prisma client - using Sequelize models instead
const redis = createClient({ url: process.env.REDIS_URL });

export interface MatchPlayer {
  userId: number;
  username: string;
  socketId: string;
  score: number;
  currentQuestionIndex: number;
  isReady: boolean;
  isAI: boolean; // Flag to identify AI players
  aiOpponent?: AIOpponent; // AI opponent data if isAI is true
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
  joinCode: string; // 6-character join code
  matchType: 'SOLO' | 'MULTIPLAYER' | 'FRIEND_1V1'; // Match type
}

export class MatchService {
  private io: SocketIOServer;
  private matches: Map<string, MatchRoom> = new Map();
  private userToMatch: Map<number, string> = new Map();
  private joinCodeToMatch: Map<string, string> = new Map(); // Global join code mapping

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

  /**
   * Generate a unique 6-character join code
   */
  private generateJoinCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    // Keep generating until we get a unique code
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

      // Authenticate user
      socket.on('authenticate', async (token: string) => {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
          const user = await User.findByPk(decoded.userId, {
            attributes: ['id', 'username', 'isActive']
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

      // Create match (regular multiplayer)
      socket.on('create_match', async (data: { quizId: number; maxPlayers?: number }) => {
        try {
          if (!socket.data.userId) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }

          const { matchId, joinCode } = await this.createMatch(data.quizId, socket.data.userId, data.maxPlayers);
          socket.join(matchId);
          socket.emit('match_created', { matchId, joinCode });

          logInfo('Match created', { matchId: matchId, userId: socket.data.userId });
        } catch (error) {
          socket.emit('error', { message: 'Failed to create match' });
          logError('Create match error', error as Error);
        }
      });

      // Create friend match (1v1 with join code)
      socket.on('create_friend_match', async (data: { quizId: number }) => {
        try {
          if (!socket.data.userId) {
            socket.emit('error', { message: 'Not authenticated' });
            return;
          }

          const { matchId, joinCode } = await this.createFriendMatch(data.quizId, socket.data.userId);
          socket.join(matchId);
          socket.emit('friend_match_created', { matchId, joinCode });

          logInfo('Friend match created', { matchId, joinCode, userId: socket.data.userId });
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

          const matchId = this.joinCodeToMatch.get(data.joinCode.toUpperCase());
          if (!matchId) {
            socket.emit('error', { message: 'Match not found with code: ' + data.joinCode });
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
            const minPlayers = match.matchType === 'FRIEND_1V1' ? 2 : 2; // Require at least 2 players
            
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

  public async createMatch(quizId: number, userId: number, maxPlayers = 10): Promise<{ matchId: string; joinCode: string }> {
    // Get quiz (simplified for now - will need to add question loading later)
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
      maxPlayers,
      timeLimit: quiz.timeLimit || 30,
      questions,
      createdAt: new Date(),
      joinCode,
      matchType: 'MULTIPLAYER'
    };

    // Add creator as first player
    const creator: MatchPlayer = {
      userId,
      username: '', // Will be set when socket connects
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

    // Store match in Redis for persistence
    await redis.setEx(`match:${matchId}`, 3600, JSON.stringify({
      id: matchId,
      quizId,
      joinCode,
      status: match.status,
      createdAt: match.createdAt
    }));

    return { matchId, joinCode };
  }

  /**
   * Create a friend match (1v1 with join code)
   */
  public async createFriendMatch(quizId: number, userId: number): Promise<{ matchId: string; joinCode: string }> {
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
      username: '', // Will be set when socket connects
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

    // Store match in Redis for persistence
    await redis.setEx(`match:${matchId}`, 3600, JSON.stringify({
      id: matchId,
      quizId,
      joinCode,
      matchType: 'FRIEND_1V1',
      status: match.status,
      createdAt: match.createdAt
    }));

    logInfo('Friend match created', { matchId, joinCode, quizId });
    return { matchId, joinCode };
  }

  public async joinMatch(matchId: string, userId: number, socketId: string): Promise<boolean> {
    const match = this.matches.get(matchId);
    if (!match || match.status !== 'WAITING' || match.players.size >= match.maxPlayers) {
      return false;
    }

    // Get user info
    const user = await User.findByPk(userId, {
      attributes: ['username']
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
      isAI: false,
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

    // Start AI response timer if there are AI players
    this.startAIResponseTimer(match, 0);

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

    // Start AI response timer if there are AI players
    this.startAIResponseTimer(match, match.currentQuestionIndex);

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
        
        // Get current user data
        const user = await User.findByPk(player.userId);
        if (user) {
          await User.update({
            eloRating: (user.eloRating || 1200) + change,
            totalMatches: (user.totalMatches || 0) + 1
          }, {
            where: { id: player.userId }
          });
        }
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

  /**
   * Create a solo match with AI opponent
   */
  public async createSoloMatch(userId: number, quizId: number, aiOpponentId?: string): Promise<string> {
    const quiz = await Quiz.findByPk(quizId, {
      include: ['category']
    });

    if (!quiz) {
      throw new Error('Quiz not found');
    }

    // Select AI opponent based on quiz difficulty or specific ID
    let aiOpponent: AIOpponent;
    if (aiOpponentId) {
      aiOpponent = aiOpponentService.getAIOpponent(aiOpponentId) || 
                   aiOpponentService.selectAIOpponentByDifficulty(quiz.difficulty);
    } else {
      aiOpponent = aiOpponentService.selectAIOpponentByDifficulty(quiz.difficulty);
    }

    const matchId = uuidv4();
    
    // Create match room
    const match: MatchRoom = {
      id: matchId,
      quizId,
      quiz,
      players: new Map(),
      status: 'WAITING',
      currentQuestionIndex: 0,
      questionStartTime: 0,
      maxPlayers: 2, // Human + AI
      timeLimit: quiz.timeLimit || 30,
      questions: [], // Will be loaded when match starts
      createdAt: new Date()
    };

    // Add human player
    const humanPlayer: MatchPlayer = {
      userId,
      username: '', // Will be set when socket connects
      socketId: '',
      score: 0,
      currentQuestionIndex: 0,
      isReady: false,
      isAI: false,
      answers: []
    };

    // Add AI player
    const aiPlayer: MatchPlayer = {
      userId: -1, // Negative ID for AI players
      username: aiOpponent.name,
      socketId: 'ai-socket',
      score: 0,
      currentQuestionIndex: 0,
      isReady: true, // AI is always ready
      isAI: true,
      aiOpponent,
      answers: []
    };

    match.players.set(userId, humanPlayer);
    match.players.set(-1, aiPlayer);
    
    this.matches.set(matchId, match);
    this.userToMatch.set(userId, matchId);

    logInfo(`Solo match created: ${matchId} with AI opponent: ${aiOpponent.name}`);
    
    return matchId;
  }

  /**
   * Handle AI opponent responses during gameplay
   */
  private async handleAIResponse(match: MatchRoom, questionIndex: number): Promise<void> {
    const aiPlayer = Array.from(match.players.values()).find(p => p.isAI);
    if (!aiPlayer || !aiPlayer.aiOpponent) return;

    const question = match.questions[questionIndex];
    if (!question) return;

    try {
      // Generate AI response
      const aiResponse = await aiOpponentService.generateAIResponse(
        question,
        aiPlayer.aiOpponent,
        match.timeLimit
      );

      // Record AI answer
      aiPlayer.answers.push({
        questionId: question.id,
        selectedOptions: [aiResponse.selectedOptionId],
        timeSpent: aiResponse.responseTime,
        isCorrect: aiResponse.isCorrect
      });

      // Update AI score
      if (aiResponse.isCorrect) {
        const basePoints = 100;
        const timeBonus = Math.max(0, Math.floor((match.timeLimit - aiResponse.responseTime) * 2));
        aiPlayer.score += basePoints + timeBonus;
      }

      // Broadcast AI response to human players
      this.io.to(match.id).emit('ai-answered', {
        aiName: aiPlayer.username,
        responseTime: aiResponse.responseTime,
        isCorrect: aiResponse.isCorrect
      });

      logInfo(`AI ${aiPlayer.username} answered question ${questionIndex}`, {
        isCorrect: aiResponse.isCorrect,
        responseTime: aiResponse.responseTime,
        score: aiPlayer.score
      });

    } catch (error) {
      logError('Error handling AI response', error as Error);
    }
  }

  /**
   * Start AI responses when a question begins
   */
  private startAIResponseTimer(match: MatchRoom, questionIndex: number): void {
    // Start AI response after a short delay to make it feel more natural
    setTimeout(() => {
      this.handleAIResponse(match, questionIndex);
    }, 1000); // 1 second delay before AI starts "thinking"
  }

  /**
   * Get available AI opponents
   */
  public getAvailableAIOpponents(): AIOpponent[] {
    return aiOpponentService.getAIOpponents();
  }

  /**
   * Get available matches for joining
   */
  public getAvailableMatches(): Array<{
    id: string;
    quizId: number;
    quiz: any;
    playerCount: number;
    maxPlayers: number;
    status: string;
    createdAt: Date;
  }> {
    const availableMatches: Array<{
      id: string;
      quizId: number;
      quiz: any;
      playerCount: number;
      maxPlayers: number;
      status: string;
      createdAt: Date;
    }> = [];

    for (const [matchId, match] of this.matches) {
      if (match.status === 'WAITING' && match.players.size < match.maxPlayers) {
        availableMatches.push({
          id: match.id,
          quizId: match.quizId,
          quiz: {
            id: match.quiz.id,
            title: match.quiz.title,
            description: match.quiz.description,
            difficulty: match.quiz.difficulty
          },
          playerCount: match.players.size,
          maxPlayers: match.maxPlayers,
          status: match.status,
          createdAt: match.createdAt
        });
      }
    }

    return availableMatches;
  }
}

// Simple match service for HTTP API usage (without WebSocket functionality)
class SimpleMatchService {
  private matches: Map<string, MatchRoom> = new Map();
  private userToMatch: Map<number, string> = new Map();

  /**
   * Create a solo match with AI opponent
   */
  public async createSoloMatch(userId: number, quizId: number, aiOpponentId?: string): Promise<string> {
    const quiz = await Quiz.findByPk(quizId, {
      include: ['category']
    });

    if (!quiz) {
      throw new Error('Quiz not found');
    }

    // Select AI opponent based on quiz difficulty or specific ID
    let aiOpponent: AIOpponent;
    if (aiOpponentId) {
      aiOpponent = aiOpponentService.getAIOpponent(aiOpponentId) || 
                   aiOpponentService.selectAIOpponentByDifficulty(quiz.difficulty);
    } else {
      aiOpponent = aiOpponentService.selectAIOpponentByDifficulty(quiz.difficulty);
    }

    const matchId = uuidv4();
    
    // Create match room
    const match: MatchRoom = {
      id: matchId,
      quizId,
      quiz,
      players: new Map(),
      status: 'WAITING',
      currentQuestionIndex: 0,
      questionStartTime: 0,
      maxPlayers: 2, // Human + AI
      timeLimit: quiz.timeLimit || 30,
      questions: [], // Will be loaded when match starts
      createdAt: new Date()
    };

    // Add human player
    const humanPlayer: MatchPlayer = {
      userId,
      username: '', // Will be set when socket connects
      socketId: '',
      score: 0,
      currentQuestionIndex: 0,
      isReady: false,
      isAI: false,
      answers: []
    };

    // Add AI player
    const aiPlayer: MatchPlayer = {
      userId: -1, // Negative ID for AI players
      username: aiOpponent.name,
      socketId: 'ai-socket',
      score: 0,
      currentQuestionIndex: 0,
      isReady: true, // AI is always ready
      isAI: true,
      aiOpponent,
      answers: []
    };

    match.players.set(userId, humanPlayer);
    match.players.set(-1, aiPlayer);
    
    this.matches.set(matchId, match);
    this.userToMatch.set(userId, matchId);

    logInfo(`Solo match created: ${matchId} with AI opponent: ${aiOpponent.name}`);
    
    return matchId;
  }

  /**
   * Get available AI opponents
   */
  public getAvailableAIOpponents(): AIOpponent[] {
    return aiOpponentService.getAIOpponents();
  }

  /**
   * Get match by ID
   */
  public getMatchById(matchId: string): MatchRoom | undefined {
    return this.matches.get(matchId);
  }

  /**
   * Get available matches for joining
   */
  public getAvailableMatches(): Array<{
    id: string;
    quizId: number;
    quiz: any;
    playerCount: number;
    maxPlayers: number;
    status: string;
    createdAt: Date;
  }> {
    const availableMatches: Array<{
      id: string;
      quizId: number;
      quiz: any;
      playerCount: number;
      maxPlayers: number;
      status: string;
      createdAt: Date;
    }> = [];

    for (const [matchId, match] of this.matches) {
      if (match.status === 'WAITING' && match.players.size < match.maxPlayers) {
        availableMatches.push({
          id: match.id,
          quizId: match.quizId,
          quiz: {
            id: match.quiz.id,
            title: match.quiz.title,
            description: match.quiz.description,
            difficulty: match.quiz.difficulty
          },
          playerCount: match.players.size,
          maxPlayers: match.maxPlayers,
          status: match.status,
          createdAt: match.createdAt
        });
      }
    }

    return availableMatches;
  }

  /**
   * Create a regular multiplayer match
   */
  public async createMatch(userId: number, quizId: number, maxPlayers = 10): Promise<string> {
    // Get quiz (simplified for now - will need to add question loading later)
    const quiz = await Quiz.findOne({
      where: { id: quizId, isActive: true }
    });

    if (!quiz) {
      throw new Error('Quiz not found');
    }

    const matchId = uuidv4();
    // TODO: Load questions from QuizQuestion model
    const questions: any[] = []; // Simplified for now

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
      isAI: false,
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

    return matchId;
  }

  /**
   * Join an existing match
   */
  public async joinMatch(matchId: string, userId: number, socketId: string): Promise<boolean> {
    const match = this.matches.get(matchId);
    if (!match || match.status !== 'WAITING' || match.players.size >= match.maxPlayers) {
      return false;
    }

    // Get user info
    const user = await User.findByPk(userId, {
      attributes: ['username']
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
      isAI: false,
      answers: []
    };

    match.players.set(userId, player);
    this.userToMatch.set(userId, matchId);

    return true;
  }
}

// Export singleton instance for HTTP API usage
export const matchService = new SimpleMatchService();
