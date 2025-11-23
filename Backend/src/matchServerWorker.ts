import cluster from 'cluster';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { User, Quiz, QuizQuestion, QuestionBankItem, QuestionBankOption, Match, MatchPlayer as MatchPlayerModel } from './models/index';
import { initializeRedis, getRedisPubSub, getRedisClient } from './config/redis';
import { logInfo, logError } from './utils/logger';
import { v4 as uuidv4 } from 'uuid';

if (!cluster.isWorker) {
  throw new Error('This file should only run as a worker process');
}

const workerId = cluster.worker!.id;
const MAX_MATCHES = parseInt(process.env.MAX_MATCHES || '5', 10);

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
  answers: Array<{
    questionId: number;
    selectedOptions: number[];
    isCorrect: boolean;
    timeSpent: number;
    points: number;
  }>;
  hasSubmittedCurrent?: boolean;
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
  questionTimeoutId?: NodeJS.Timeout;
}

class WorkerMatchService {
  private matches: Map<string, MatchRoom> = new Map();
  private userToMatch: Map<number, string> = new Map();
  private redis: any;
  private questionTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(redis: any) {
    this.redis = redis;
    this.startHeartbeat();
  }

  private startHeartbeat() {
    setInterval(() => {
      this.notifyMaster({ type: 'heartbeat' });
    }, 30000); // Every 30 seconds
  }

  private notifyMaster(message: any) {
    if (process.send) {
      process.send({ ...message, workerId });
    }
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
        order: [['orderIndex', 'ASC']]
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
      logError(`Worker ${workerId}: Failed to load quiz questions`, error as Error);
      return [];
    }
  }

  public async createMatch(data: any) {
    if (this.matches.size >= MAX_MATCHES) {
      throw new Error(`Worker ${workerId} at capacity (${MAX_MATCHES} matches)`);
    }

    const { matchId, joinCode, quizId, userId, username } = data;

    logInfo(`Worker ${workerId}: CREATE_MATCH started`, { matchId, joinCode, quizId, userId });

    // Load quiz and questions
    const quiz = await Quiz.findByPk(quizId);
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    const questions = await this.loadQuizQuestions(quizId);
    if (questions.length === 0) {
      throw new Error('No questions found for quiz');
    }

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
      maxPlayers: 2,
      timeLimit: quiz.timeLimit || 30,
      questions,
      createdAt: new Date(),
      joinCode
    };

    // Add creator
    const creator: MatchPlayer = {
      userId,
      username,
      socketId: data.socketId,
      score: 0,
      currentQuestionIndex: 0,
      isReady: false,
      answers: [],
      hasSubmittedCurrent: false
    };

    match.players.set(userId, creator);
    this.matches.set(matchId, match);
    this.userToMatch.set(userId, matchId);

    // Save to Redis
    await this.saveMatchState(matchId, match);

    // Notify master
    this.notifyMaster({
      type: 'match_created',
      matchId,
      userId
    });

    // Emit to creator
    this.emitToSocket(data.socketId, 'match_connected', {
      matchId,
      joinCode,
      players: [{ userId, username, isReady: false }]
    });

    logInfo(`Worker ${workerId}: ✅ MATCH CREATED AND STORED`, { 
      matchId, 
      joinCode, 
      creatorId: userId,
      matchesInThisWorker: this.matches.size,
      allMatchIds: Array.from(this.matches.keys())
    });
  }

  public async joinMatch(data: any) {
    const { matchId, userId, username, socketId } = data;

    logInfo(`Worker ${workerId}: JOIN_MATCH started`, {
      matchId,
      userId,
      matchExistsLocally: this.matches.has(matchId),
      allLocalMatches: Array.from(this.matches.keys())
    });

    let match = this.matches.get(matchId);

    // Load from Redis if not in memory
    if (!match) {
      logInfo(`Worker ${workerId}: Match not in local memory, loading from Redis`, { matchId });
      const matchData = await this.redis.get(`match:${matchId}`);
      if (!matchData) {
        logError(`Worker ${workerId}: Match not found in Redis either!`, new Error(`Match ${matchId}`));
        throw new Error('Match not found');
      }
      logInfo(`Worker ${workerId}: ✅ Match loaded from Redis`, { matchId });

      const storedMatch = JSON.parse(matchData);
      const questions = await this.loadQuizQuestions(storedMatch.quizId);

      match = {
        id: matchId,
        quizId: storedMatch.quizId,
        quiz: storedMatch.quiz,
        players: new Map(),
        status: storedMatch.status || 'WAITING',
        currentQuestionIndex: storedMatch.currentQuestionIndex || 0,
        questionStartTime: storedMatch.questionStartTime || 0,
        maxPlayers: 2,
        timeLimit: storedMatch.timeLimit || 30,
        questions,
        createdAt: new Date(storedMatch.createdAt),
        joinCode: storedMatch.joinCode
      };

      // Restore players
      if (storedMatch.players && Array.isArray(storedMatch.players)) {
        for (const p of storedMatch.players) {
          match.players.set(p.userId, {
            userId: p.userId,
            username: p.username,
            firstName: p.firstName,
            lastName: p.lastName,
            socketId: '',
            score: p.score || 0,
            currentQuestionIndex: p.currentQuestionIndex || 0,
            isReady: p.isReady || false,
            answers: p.answers || [],
            hasSubmittedCurrent: p.hasSubmittedCurrent || false
          });
        }
      }

      this.matches.set(matchId, match);
    }

    if (match.status !== 'WAITING' && !match.players.has(userId)) {
      throw new Error('Match already started');
    }

    if (match.players.size >= match.maxPlayers && !match.players.has(userId)) {
      throw new Error('Match is full');
    }

    // Check if reconnecting
    if (match.players.has(userId)) {
      const player = match.players.get(userId)!;
      player.socketId = socketId;
      this.userToMatch.set(userId, matchId);

      // Send reconnection state
      if (match.status === 'IN_PROGRESS') {
        const currentQuestion = match.questions[match.currentQuestionIndex];
        const timeElapsed = match.questionStartTime ? Date.now() - match.questionStartTime : 0;

        this.emitToSocket(socketId, 'match_reconnected', {
          question: this.sanitizeQuestion(currentQuestion),
          questionIndex: match.currentQuestionIndex,
          totalQuestions: match.questions.length,
          timeElapsed: Math.floor(timeElapsed / 1000),
          playerScore: player.score,
          playerAnswers: player.answers,
          hasSubmittedCurrent: player.hasSubmittedCurrent
        });
      } else {
        this.emitToSocket(socketId, 'match_joined', {
          matchId,
          players: this.getPlayerList(match)
        });
      }

      logInfo(`Worker ${workerId}: Player reconnected`, { matchId, userId });
      return;
    }

    // Add new player
    const player: MatchPlayer = {
      userId,
      username,
      socketId,
      score: 0,
      currentQuestionIndex: 0,
      isReady: false,
      answers: [],
      hasSubmittedCurrent: false
    };

    match.players.set(userId, player);
    this.userToMatch.set(userId, matchId);

    // Save to Redis immediately
    await this.saveMatchState(matchId, match);
    
    // Wait longer to ensure Redis is fully updated before next join
    // This prevents race conditions where second player gets assigned to different worker
    await new Promise(resolve => setTimeout(resolve, 500));

    // Notify master
    this.notifyMaster({
      type: 'player_joined',
      matchId,
      userId
    });

    // Emit to joiner with match data and first question
    const firstQuestion = match.questions && match.questions.length > 0 ? match.questions[0] : null;
    this.emitToSocket(socketId, 'match_joined', {
      matchId,
      players: this.getPlayerList(match),
      quiz: match.quiz,
      totalQuestions: match.questions.length,
      question: firstQuestion ? this.sanitizeQuestion(firstQuestion) : null,
      questionIndex: 0
    });

    // Broadcast to all players
    this.emitToMatch(matchId, 'player_list_updated', {
      players: this.getPlayerList(match)
    });

    logInfo(`Worker ${workerId}: ✅ PLAYER JOINED - MATCH NOW ON THIS WORKER`, { 
      matchId, 
      userId, 
      playerCount: match.players.size, 
      questionsLoaded: match.questions.length,
      matchesInThisWorker: this.matches.size,
      allMatchIds: Array.from(this.matches.keys())
    });

    // Auto-start match ONLY when ALL players are present (for 1v1 matches, that's exactly 2 players)
    if (match.players.size === match.maxPlayers && match.status === 'WAITING') {
      logInfo(`Worker ${workerId}: ✅ ALL PLAYERS PRESENT - AUTO-STARTING MATCH`, { matchId, playerCount: match.players.size, maxPlayers: match.maxPlayers });
      
      // Start the match after a 2 second delay to let both players see the "ready" state
      setTimeout(() => {
        const currentMatch = this.matches.get(matchId);
        // FIX A: CRITICAL - Never cancel a match that is already IN_PROGRESS
        // Only start if still WAITING and all players present
        if (currentMatch && currentMatch.status === 'IN_PROGRESS') {
          logInfo(`Worker ${workerId}: Match already started, ignoring sanity check`, { matchId });
          return;
        }
        
        if (currentMatch && currentMatch.players.size === currentMatch.maxPlayers && currentMatch.status === 'WAITING') {
          this.startMatch(matchId);
        } else {
          logInfo(`Worker ${workerId}: Match start cancelled - not all players present`, { matchId, playerCount: currentMatch?.players.size || 0, status: currentMatch?.status });
        }
      }, 2000);
    }
  }

  public async playerReady(data: any) {
    const { matchId, userId } = data;
    const match = this.matches.get(matchId);

    if (!match || !match.players.has(userId)) {
      throw new Error('Player not in match');
    }

    const player = match.players.get(userId)!;
    player.isReady = true;

    await this.saveMatchState(matchId, match);

    // Broadcast ready status
    this.emitToMatch(matchId, 'player_ready', {
      userId,
      username: player.username,
      isReady: true
    });

    this.emitToMatch(matchId, 'player_list_updated', {
      players: this.getPlayerList(match)
    });

    // Check if all ready
    const allReady = Array.from(match.players.values()).every(p => p.isReady);
    if (allReady && match.players.size === match.maxPlayers) {
      await this.startMatch(matchId);
    }
  }

  private async startMatch(matchId: string) {
    const match = this.matches.get(matchId);
    if (!match || match.questions.length === 0) {
      throw new Error('Cannot start match - no questions');
    }

    match.status = 'IN_PROGRESS';
    match.currentQuestionIndex = 0;
    match.questionStartTime = Date.now();

    // Reset submission flags
    Array.from(match.players.values()).forEach(p => {
      p.hasSubmittedCurrent = false;
    });

    await this.saveMatchState(matchId, match);

    const currentQuestion = match.questions[0];
    this.emitToMatch(matchId, 'match_started', {
      question: this.sanitizeQuestion(currentQuestion),
      questionIndex: 0,
      totalQuestions: match.questions.length
    });

    // Set 30-second timeout for first question
    const timerId = `${matchId}_q0`;
    const timer = setTimeout(async () => {
      logInfo(`Worker ${workerId}: 30-second timeout reached for first question`, { matchId });
      this.questionTimers.delete(timerId);
      
      const currentMatch = this.matches.get(matchId);
      if (currentMatch && currentMatch.status === 'IN_PROGRESS') {
        // Mark unanswered players as having submitted
        Array.from(currentMatch.players.values()).forEach(p => {
          if (!p.hasSubmittedCurrent) {
            p.hasSubmittedCurrent = true;
          }
        });

        await this.saveMatchState(matchId, currentMatch);

        // Notify players of timeout
        this.emitToMatch(matchId, 'question_timeout', {
          message: 'Time is up! Moving to next question...',
          questionIndex: currentMatch.currentQuestionIndex
        });

        if (currentMatch.currentQuestionIndex >= currentMatch.questions.length - 1) {
          await this.endMatch(matchId);
        } else {
          await this.nextQuestion(matchId);
        }
      }
    }, 30000);

    this.questionTimers.set(timerId, timer);

    logInfo(`Worker ${workerId}: Match started`, { matchId, playerCount: match.players.size });
  }

  public async submitAnswer(data: any) {
    // CRITICAL FIX: Master sends data nested in .data property
    // Extract matchId, userId, username from top level (sent by master)
    // Extract questionId, selectedOptions, timeSpent from data.data (client payload)
    const { matchId, userId, username, socketId } = data;
    const clientData = data.data || {};
    const { questionId, selectedOptions, timeSpent } = clientData;
    
    // DEBUG: Log which worker received the submission
    logInfo(`Worker ${workerId}: SUBMIT_ANSWER received`, {
      matchId,
      userId,
      questionId,
      selectedOptions,
      timeSpent,
      matchExistsInThisWorker: this.matches.has(matchId),
      allMatchesInThisWorker: Array.from(this.matches.keys()),
      totalMatchesInWorker: this.matches.size,
      dataStructure: Object.keys(data),
      clientDataStructure: Object.keys(clientData)
    });

    let match = this.matches.get(matchId);

    // FIX B: Re-hydrate from Redis if not found locally
    if (!match) {
      logInfo(`Worker ${workerId}: Match not in local memory, attempting to load from Redis...`, { matchId });
      try {
        const matchData = await this.redis.get(`match:${matchId}`);
        if (matchData) {
          const storedMatch = JSON.parse(matchData);
          const questions = await this.loadQuizQuestions(storedMatch.quizId);
          
          match = {
            id: matchId,
            quizId: storedMatch.quizId,
            quiz: storedMatch.quiz,
            players: new Map(),
            status: storedMatch.status || 'WAITING',
            currentQuestionIndex: storedMatch.currentQuestionIndex || 0,
            questionStartTime: storedMatch.questionStartTime || 0,
            maxPlayers: 2,
            timeLimit: storedMatch.timeLimit || 30,
            questions,
            createdAt: new Date(storedMatch.createdAt),
            joinCode: storedMatch.joinCode
          };

          // Restore players
          if (storedMatch.players && Array.isArray(storedMatch.players)) {
            for (const p of storedMatch.players) {
              match.players.set(p.userId, {
                userId: p.userId,
                username: p.username,
                firstName: p.firstName,
                lastName: p.lastName,
                socketId: '',
                score: p.score || 0,
                currentQuestionIndex: p.currentQuestionIndex || 0,
                isReady: p.isReady || false,
                answers: p.answers || [],
                hasSubmittedCurrent: p.hasSubmittedCurrent || false
              });
            }
          }

          this.matches.set(matchId, match);
          logInfo(`Worker ${workerId}: ✅ Match re-hydrated from Redis`, { matchId, playerCount: match.players.size });
        } else {
          logError(`Worker ${workerId}: CRITICAL - Match not found in Redis either!`, new Error(`Match ${matchId}`));
          throw new Error(`Match ${matchId} not found in Redis`);
        }
      } catch (error) {
        logError(`Worker ${workerId}: Failed to re-hydrate match from Redis`, error as Error);
        throw new Error(`Match ${matchId} not found`);
      }
    }

    if (match.status !== 'IN_PROGRESS') {
      logError(`Worker ${workerId}: Match not in progress`, new Error(`Status: ${match.status}`));
      throw new Error('Match not in progress');
    }

    const player = match.players.get(userId);
    if (!player) {
      throw new Error('Player not in match');
    }

    const currentQuestion = match.questions[match.currentQuestionIndex];
    
    // Log question details for debugging
    logInfo(`Worker ${workerId}: Question validation`, {
      matchId,
      currentQuestionIndex: match.currentQuestionIndex,
      currentQuestionId: currentQuestion?.id,
      submittedQuestionId: questionId,
      totalQuestions: match.questions.length,
      currentQuestionExists: !!currentQuestion
    });
    
    // Allow submission if question exists (don't validate questionId match - it might differ)
    if (!currentQuestion) {
      throw new Error('No current question available');
    }

    // Check for duplicate submission
    if (player.hasSubmittedCurrent) {
      logInfo(`Worker ${workerId}: Duplicate answer rejected`, { matchId, userId, questionId });
      return;
    }

    // Validate inputs
    if (!Array.isArray(selectedOptions) || selectedOptions.length === 0) {
      throw new Error('Invalid selected options');
    }

    if (typeof timeSpent !== 'number' || timeSpent < 0 || timeSpent > match.timeLimit + 5) {
      throw new Error('Invalid time spent');
    }

    // FIX C: Wrap in try/catch to prevent worker crashes
    let isCorrect = false;
    let points = 0;
    let correctOptionIds: number[] = [];
    
    try {
      // Check if answer is correct
      correctOptionIds = currentQuestion.options
        .filter((opt: any) => opt.isCorrect)
        .map((opt: any) => opt.id);

      isCorrect = 
        selectedOptions.length === correctOptionIds.length &&
        selectedOptions.every(id => correctOptionIds.includes(id));

      // Calculate points (with validation)
      const basePoints = 100;
      const validTimeSpent = Math.min(Math.max(timeSpent, 0), match.timeLimit);
      const timeBonus = Math.max(0, Math.floor((match.timeLimit - validTimeSpent) * 2));
      points = isCorrect ? basePoints + timeBonus : 0;

      // Update player
      player.score += points;
      player.answers.push({
        questionId,
        selectedOptions,
        isCorrect,
        timeSpent: validTimeSpent,
        points
      });
      player.hasSubmittedCurrent = true;
    } catch (error) {
      logError(`Worker ${workerId}: Error processing answer`, error as Error);
      // Don't throw - allow the submission to be recorded even if scoring fails
      player.hasSubmittedCurrent = true;
    }

    await this.saveMatchState(matchId, match);

    // Send result to player
    this.emitToSocket(player.socketId, 'answer_result', {
      isCorrect,
      points,
      correctOptions: correctOptionIds,
      totalScore: player.score
    });

    // Notify other players
    this.emitToMatch(matchId, 'opponent_submitted', {
      userId,
      username: player.username
    }, [player.socketId]);

    // Check if all submitted
    const allSubmitted = Array.from(match.players.values()).every(p => p.hasSubmittedCurrent);

    if (allSubmitted) {
      // Clear timeout if all players submitted early
      const timerId = `${matchId}_q${match.currentQuestionIndex}`;
      const existingTimer = this.questionTimers.get(timerId);
      if (existingTimer) {
        clearTimeout(existingTimer);
        this.questionTimers.delete(timerId);
      }

      // SAVE STATE IMMEDIATELY before advancing
      await this.saveMatchState(matchId, match);

      if (match.currentQuestionIndex >= match.questions.length - 1) {
        // Match completed
        await this.endMatch(matchId);
      } else {
        // Next question - IMMEDIATELY, don't wait
        await this.nextQuestion(matchId);
      }
    } else {
      // Notify waiting
      const waitingFor = Array.from(match.players.values())
        .filter(p => !p.hasSubmittedCurrent)
        .map(p => p.username);

      this.emitToSocket(player.socketId, 'waiting_for_opponent', {
        message: `Waiting for ${waitingFor.join(', ')}...`,
        waitingFor
      });

      // Set 30-second timeout if not already set
      const timerId = `${matchId}_q${match.currentQuestionIndex}`;
      if (!this.questionTimers.has(timerId)) {
        const timer = setTimeout(async () => {
          logInfo(`Worker ${workerId}: 30-second timeout reached for question`, { matchId, questionIndex: match.currentQuestionIndex });
          this.questionTimers.delete(timerId);
          
          // Auto-advance to next question
          const currentMatch = this.matches.get(matchId);
          if (currentMatch && currentMatch.status === 'IN_PROGRESS') {
            // Mark unanswered players as having submitted (skip their answer)
            Array.from(currentMatch.players.values()).forEach(p => {
              if (!p.hasSubmittedCurrent) {
                p.hasSubmittedCurrent = true;
              }
            });

            await this.saveMatchState(matchId, currentMatch);

            // Notify players of timeout
            this.emitToMatch(matchId, 'question_timeout', {
              message: 'Time is up! Moving to next question...',
              questionIndex: currentMatch.currentQuestionIndex
            });

            if (currentMatch.currentQuestionIndex >= currentMatch.questions.length - 1) {
              // Match completed
              await this.endMatch(matchId);
            } else {
              // Next question - ONLY called from timeout, not from submitAnswer
              await this.nextQuestion(matchId);
            }
          }
        }, 30000); // 30 seconds

        this.questionTimers.set(timerId, timer);
      }
    }

    logInfo(`Worker ${workerId}: Answer submitted`, {
      matchId,
      userId,
      isCorrect,
      points,
      allSubmitted
    });
  }

  private async nextQuestion(matchId: string) {
    const match = this.matches.get(matchId);
    if (!match) return;

    match.currentQuestionIndex++;

    if (match.currentQuestionIndex >= match.questions.length) {
      await this.endMatch(matchId);
      return;
    }

    // Reset submission flags BEFORE saving
    Array.from(match.players.values()).forEach(p => {
      p.hasSubmittedCurrent = false;
    });

    match.questionStartTime = Date.now();
    
    // SAVE STATE TO REDIS FIRST before emitting
    await this.saveMatchState(matchId, match);

    const currentQuestion = match.questions[match.currentQuestionIndex];
    
    // EMIT IMMEDIATELY after saving
    this.emitToMatch(matchId, 'next_question', {
      question: this.sanitizeQuestion(currentQuestion),
      questionIndex: match.currentQuestionIndex,
      totalQuestions: match.questions.length
    });
    
    logInfo(`Worker ${workerId}: Next question emitted immediately`, {
      matchId,
      questionIndex: match.currentQuestionIndex,
      totalQuestions: match.questions.length
    });

    // Set 30-second timeout for this question (only if not already set)
    const timerId = `${matchId}_q${match.currentQuestionIndex}`;
    if (!this.questionTimers.has(timerId)) {
      const timer = setTimeout(async () => {
        logInfo(`Worker ${workerId}: 30-second timeout reached for question`, { matchId, questionIndex: match.currentQuestionIndex });
        this.questionTimers.delete(timerId);
        
        const currentMatch = this.matches.get(matchId);
        if (currentMatch && currentMatch.status === 'IN_PROGRESS') {
          // Mark unanswered players as having submitted
          Array.from(currentMatch.players.values()).forEach(p => {
            if (!p.hasSubmittedCurrent) {
              p.hasSubmittedCurrent = true;
            }
          });

          await this.saveMatchState(matchId, currentMatch);

          // Notify players of timeout
          this.emitToMatch(matchId, 'question_timeout', {
            message: 'Time is up! Moving to next question...',
            questionIndex: currentMatch.currentQuestionIndex
          });

          if (currentMatch.currentQuestionIndex >= currentMatch.questions.length - 1) {
            await this.endMatch(matchId);
          } else {
            await this.nextQuestion(matchId);
          }
        }
      }, 30000);

      this.questionTimers.set(timerId, timer);
    }

    logInfo(`Worker ${workerId}: Next question`, {
      matchId,
      questionIndex: match.currentQuestionIndex
    });
  }

  private async endMatch(matchId: string) {
    const match = this.matches.get(matchId);
    if (!match) return;

    match.status = 'COMPLETED';

    // Calculate results
    const results = Array.from(match.players.values()).map(player => {
      const correctAnswers = player.answers.filter(a => a.isCorrect).length;
      const totalTimeSpent = player.answers.reduce((sum, a) => sum + a.timeSpent, 0);

      return {
        userId: player.userId,
        username: player.username,
        firstName: player.firstName,
        lastName: player.lastName,
        score: player.score,
        answers: player.answers,
        correctAnswers,
        totalAnswers: player.answers.length,
        accuracy: player.answers.length > 0 ? Math.round((correctAnswers / player.answers.length) * 100) : 0,
        timeSpent: totalTimeSpent
      };
    });

    results.sort((a, b) => b.score - a.score);
    const winnerId = results.length > 0 ? results[0].userId : null;

    // SAVE STATE TO REDIS FIRST
    await this.saveMatchState(matchId, match);

    logInfo(`Worker ${workerId}: Match completed - results calculated`, {
      matchId,
      results: results.map(r => ({ userId: r.userId, score: r.score, correctAnswers: r.correctAnswers }))
    });

    // Save to database
    try {
      let dbMatch = await Match.findOne({ where: { matchId } });

      if (!dbMatch) {
        dbMatch = await Match.create({
          matchId,
          quizId: match.quizId,
          type: 'FRIEND_MATCH' as any,
          status: 'COMPLETED',
          maxPlayers: 2,
          startedAt: match.createdAt,
          endedAt: new Date(),
          winnerId
        });
      } else {
        await dbMatch.update({
          status: 'COMPLETED',
          endedAt: new Date(),
          winnerId
        });
      }

      // Save players
      for (const result of results) {
        let playerRecord = await MatchPlayerModel.findOne({
          where: {
            matchId: dbMatch.id,
            userId: result.userId
          }
        });

        if (!playerRecord) {
          await MatchPlayerModel.create({
            matchId: dbMatch.id,
            userId: result.userId,
            status: 'FINISHED',
            score: result.score,
            correctAnswers: result.correctAnswers,
            timeSpent: result.timeSpent,
            joinedAt: new Date(Date.now() - result.timeSpent * 1000),
            finishedAt: new Date()
          });
        } else {
          await playerRecord.update({
            status: 'FINISHED',
            score: result.score,
            correctAnswers: result.correctAnswers,
            timeSpent: result.timeSpent,
            finishedAt: new Date()
          });
        }
      }

      logInfo(`Worker ${workerId}: Match saved to database`, { matchId });
    } catch (error) {
      logError(`Worker ${workerId}: Failed to save match to database`, error as Error);
    }

    // Broadcast completion
    this.emitToMatch(matchId, 'match_completed', {
      results,
      winner: results[0] || null,
      matchId,
      completedAt: new Date().toISOString(),
      isFriendMatch: true
    });

    // Cleanup
    setTimeout(async () => {
      match.players.forEach(player => {
        this.userToMatch.delete(player.userId);
      });

      this.matches.delete(matchId);
      await this.redis.del(`match:${matchId}`);

      // Notify master
      this.notifyMaster({
        type: 'match_completed',
        matchId
      });

      logInfo(`Worker ${workerId}: Match cleanup complete`, { matchId, remainingMatches: this.matches.size });
    }, 2000);
  }

  private async saveMatchState(matchId: string, match: MatchRoom) {
    try {
      const matchState = {
        id: matchId,
        quizId: match.quizId,
        quiz: match.quiz,
        joinCode: match.joinCode,
        status: match.status,
        currentQuestionIndex: match.currentQuestionIndex,
        questionStartTime: match.questionStartTime,
        timeLimit: match.timeLimit,
        createdAt: match.createdAt.toISOString(),
        questions: match.questions,
        workerId,
        players: Array.from(match.players.values()).map(p => ({
          userId: p.userId,
          username: p.username,
          firstName: p.firstName,
          lastName: p.lastName,
          score: p.score,
          currentQuestionIndex: p.currentQuestionIndex,
          isReady: p.isReady,
          hasSubmittedCurrent: p.hasSubmittedCurrent,
          answers: p.answers
        }))
      };

      await this.redis.setex(`match:${matchId}`, 3600, JSON.stringify(matchState));
    } catch (error) {
      logError(`Worker ${workerId}: Failed to save match state`, error as Error);
    }
  }

  private sanitizeQuestion(question: any) {
    return {
      id: question.id,
      questionText: question.questionText,
      options: question.options.map((opt: any) => ({
        id: opt.id,
        optionText: opt.optionText
        // Don't send isCorrect
      })),
      timeLimit: question.timeLimit
    };
  }

  private getPlayerList(match: MatchRoom) {
    return Array.from(match.players.values()).map(p => ({
      userId: p.userId,
      username: p.username,
      firstName: p.firstName,
      lastName: p.lastName,
      isReady: p.isReady
    }));
  }

  private emitToMatch(matchId: string, event: string, data: any, except?: string[]) {
    this.notifyMaster({
      type: 'emit_to_match',
      matchId,
      event,
      data,
      except
    });
  }

  private emitToSocket(socketId: string, event: string, data: any) {
    this.notifyMaster({
      type: 'emit_to_socket',
      socketId,
      event,
      data
    });
  }

  public getStats() {
    return {
      workerId,
      pid: process.pid,
      matchCount: this.matches.size,
      maxMatches: MAX_MATCHES,
      activeMatches: Array.from(this.matches.keys())
    };
  }
}

// Initialize worker
let workerService: WorkerMatchService;

async function startWorker() {
  try {
    logInfo(`Worker ${workerId}: Starting`, { pid: process.pid });

    // Initialize Redis
    await initializeRedis();
    const redis = getRedisClient();

    // Initialize match service
    workerService = new WorkerMatchService(redis);

    logInfo(`Worker ${workerId}: Ready`, { maxMatches: MAX_MATCHES });

    // Handle messages from master
    process.on('message', async (message: any) => {
      try {
        switch (message.type) {
          case 'create_match':
            await workerService.createMatch(message);
            break;

          case 'join_match':
            await workerService.joinMatch(message);
            break;

          case 'connect_to_match':
            await workerService.joinMatch(message); // Same logic as join
            break;

          case 'player_ready':
            await workerService.playerReady(message);
            break;

          case 'submit_answer':
            await workerService.submitAnswer(message);
            break;

          case 'disconnect':
            // Player disconnected - handled by socket.io adapter
            logInfo(`Worker ${workerId}: Player disconnect event`, { userId: message.userId, matchId: message.matchId });
            break;

          case 'shutdown':
            logInfo(`Worker ${workerId}: Shutdown requested`);
            process.exit(0);
            break;

          default:
            logInfo(`Worker ${workerId}: Unknown message type`, { type: message.type });
        }
      } catch (error) {
        logError(`Worker ${workerId}: Error handling message`, error as Error);
      }
    });

  } catch (error) {
    logError(`Worker ${workerId}: Failed to start`, error as Error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logInfo(`Worker ${workerId}: SIGTERM received`);
  process.exit(0);
});

process.on('SIGINT', () => {
  logInfo(`Worker ${workerId}: SIGINT received`);
  process.exit(0);
});

startWorker();