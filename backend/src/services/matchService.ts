import { Server as SocketIOServer, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { Quiz, QuizQuestion, QuestionBankItem, QuestionBankOption, User } from '../models';
import { redis } from '../config/redis';
import { logInfo, logError } from '../utils/logger';
import jwt from 'jsonwebtoken';

// Types
interface MatchPlayer {
  userId: number;
  username: string;
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

export class MatchService {
  private io: SocketIOServer | null = null;
  private matches: Map<string, MatchRoom> = new Map();
  private userToMatch: Map<number, string> = new Map();
  private joinCodeToMatch: Map<string, string> = new Map();

  constructor(io?: SocketIOServer) {
    if (io) {
      this.io = io;
      this.setupSocketHandlers();
    }
  }

  public setSocketServer(io: SocketIOServer) {
    this.io = io;
    this.setupSocketHandlers();
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
      // Load quiz questions through QuizQuestion junction table
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
        order: [['orderIndex', 'ASC']]
      });

      if (!quizQuestions || quizQuestions.length === 0) {
        return [];
      }

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
    if (!this.io) return;
    
    this.io.on('connection', (socket) => {
      logInfo('Client connected', { socketId: socket.id });

      // Authenticate user - simplified for testing
      socket.on('authenticate', async (data: any) => {
        try {
          // Handle both JWT token and direct user data
          let userId: number;
          let username: string;

          if (typeof data === 'string') {
            // JWT token authentication
            const decoded = jwt.verify(data, process.env.JWT_SECRET!) as any;
            const user = await User.findByPk(decoded.userId, {
              attributes: ['id', 'username', 'isActive']
            });

            if (!user || !user.isActive) {
              socket.emit('auth_error', { message: 'Invalid token or user inactive' });
              return;
            }

            userId = user.id;
            username = user.username;
          } else {
            // Direct user data for testing
            userId = data.userId || 1;
            username = data.username || `Player${userId}`;
            
            // Try to get real user from database
            try {
              const user = await User.findByPk(userId, {
                attributes: ['id', 'username', 'email', 'isActive']
              });
              if (user) {
                // Use email if available, otherwise username
                username = user.email || user.username;
              }
            } catch (error) {
              // Fallback to provided data if database lookup fails
              logInfo('Using fallback user data', { userId, username });
            }
          }

          socket.data.userId = userId;
          socket.data.username = username;
          
          const userData = { id: userId, username };
          socket.emit('authenticated', { user: userData });

          logInfo('User authenticated', { 
            userId, 
            username, 
            socketId: socket.id,
            authType: typeof data === 'string' ? 'JWT' : 'Direct'
          });
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
          
          // Update creator's socket info in the match and ensure proper mapping
          const match = this.matches.get(matchId);
          if (match && match.players.has(socket.data.userId)) {
            const creator = match.players.get(socket.data.userId)!;
            creator.username = socket.data.username || `Player${socket.data.userId}`;
            creator.socketId = socket.id;
            
            // Ensure the userToMatch mapping exists for the creator
            this.userToMatch.set(socket.data.userId, matchId);
            
            logInfo('Updated creator info', { 
              userId: socket.data.userId, 
              username: creator.username,
              socketId: socket.id,
              userToMatchMapped: this.userToMatch.has(socket.data.userId)
            });
          }
          
          socket.emit('friend_match_created', { matchId, joinCode });

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

          const matchId = this.joinCodeToMatch.get(data.joinCode.toUpperCase());
          if (!matchId) {
            socket.emit('error', { message: 'Match not found with code: ' + data.joinCode });
            return;
          }

          const success = await this.joinMatch(matchId, socket.data.userId, socket.id);
          if (success) {
            socket.join(matchId);
            const match = this.matches.get(matchId)!;
            
            // Send match joined confirmation to the joining player
            socket.emit('match_joined', { 
              matchId, 
              players: Array.from(match.players.values()).map(p => ({
                userId: p.userId,
                username: p.username,
                isReady: p.isReady
              }))
            });

            // Send updated player list to ALL players in the match (including the joiner)
            const playerList = Array.from(match.players.values()).map(p => ({
              userId: p.userId,
              username: p.username,
              isReady: p.isReady
            }));
            
            logInfo('Sending player list update', { 
              matchId, 
              playerCount: playerList.length,
              players: playerList 
            });
            
            this.io.to(matchId).emit('player_list_updated', {
              players: playerList
            });

            // Notify other players about the new joiner
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
          logInfo('Player ready request', { 
            userId: socket.data.userId, 
            username: socket.data.username,
            userToMatchSize: this.userToMatch.size,
            hasMapping: this.userToMatch.has(socket.data.userId)
          });
          
          const matchId = this.userToMatch.get(socket.data.userId);
          if (!matchId) {
            logError('Player ready failed - not in match', new Error(`User ${socket.data.userId} not found in userToMatch mapping`));
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
            
            logInfo('Checking match start conditions', { 
              matchId, 
              allReady, 
              playerCount: match.players.size, 
              minPlayers 
            });

            if (allReady && match.players.size >= minPlayers) {
              logInfo('All players ready, starting match', { 
                matchId, 
                playerCount: match.players.size, 
                minPlayers 
              });
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

          await this.submitAnswer(matchId, socket.data.userId, data);
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

  /**
   * Create a new match
   */
  public async createMatch(quizId: number, userId: number, maxPlayers: number = 10): Promise<{ matchId: string; joinCode: string }> {
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

    // Get user info with fallback for test users
    let username = `TestUser${userId}`;
    try {
      const user = await User.findByPk(userId, {
        attributes: ['username', 'email']
      });
      
      if (user) {
        username = user.email || user.username;
      }
    } catch (error) {
      logInfo('Using fallback username for user', { userId, username });
    }

    const player: MatchPlayer = {
      userId,
      username,
      socketId,
      score: 0,
      currentQuestionIndex: 0,
      isReady: false,
      isAI: false,
      answers: []
    };

    match.players.set(userId, player);
    this.userToMatch.set(userId, matchId);

    logInfo('Player joined match', { matchId, userId, username, playerCount: match.players.size });
    return true;
  }

  private async startMatch(matchId: string) {
    const match = this.matches.get(matchId);
    if (!match) {
      logError('Cannot start match - match not found', new Error(`Match ${matchId} not found`));
      return;
    }

    if (match.questions.length === 0) {
      logError('Cannot start match - no questions loaded', new Error(`Match ${matchId} has no questions`));
      this.io.to(matchId).emit('error', { message: 'No questions available for this quiz' });
      return;
    }

    logInfo('Starting match', { 
      matchId, 
      playerCount: match.players.size, 
      questionCount: match.questions.length,
      quizTitle: match.quiz.title 
    });

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

    logInfo('Sending match_started event', { 
      matchId, 
      questionId: currentQuestion.id, 
      questionText: currentQuestion.questionText,
      optionCount: currentQuestion.options.length,
      totalQuestions: match.questions.length 
    });

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

    logInfo('Match started successfully', { matchId, players: match.players.size });
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
    if (!currentQuestion || currentQuestion.id !== answerData.questionId) return;

    // Check if answer is correct
    const correctOptionIds = currentQuestion.options
      .filter((opt: any) => opt.isCorrect)
      .map((opt: any) => opt.id);

    const isCorrect = answerData.selectedOptions.length === correctOptionIds.length &&
      answerData.selectedOptions.every(id => correctOptionIds.includes(id));

    // Calculate points
    const basePoints = 100;
    const timeBonus = Math.max(0, Math.floor((match.timeLimit - answerData.timeSpent) * 2));
    const points = isCorrect ? basePoints + timeBonus : 0;

    // Update player score
    player.score += points;
    player.answers.push({
      questionId: answerData.questionId,
      selectedOptions: answerData.selectedOptions,
      isCorrect,
      timeSpent: answerData.timeSpent,
      points
    });

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

    // Calculate final results
    const results = Array.from(match.players.values()).map(player => ({
      userId: player.userId,
      username: player.username,
      score: player.score,
      answers: player.answers
    }));

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    // Send results to all players
    this.io.to(matchId).emit('match_completed', {
      results,
      winner: results[0],
      matchId
    });

    // Clean up
    match.players.forEach(player => {
      this.userToMatch.delete(player.userId);
    });
    
    if (match.joinCode) {
      this.joinCodeToMatch.delete(match.joinCode);
    }
    
    this.matches.delete(matchId);

    logInfo('Match completed', { matchId, results });
  }

  private startAIResponseTimer(match: MatchRoom, questionIndex: number) {
    // Placeholder for AI response logic
    // This would be implemented when AI players are added
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
    const availableMatches: Array<any> = [];
    
    this.matches.forEach((match, matchId) => {
      if (match.status === 'WAITING' && match.players.size < match.maxPlayers) {
        availableMatches.push({
          id: matchId,
          quizId: match.quizId,
          quiz: match.quiz,
          playerCount: match.players.size,
          maxPlayers: match.maxPlayers,
          status: match.status,
          createdAt: match.createdAt
        });
      }
    });

    return availableMatches;
  }
}

// Export singleton instance (will be initialized with socket server later)
export const matchService = new MatchService();
