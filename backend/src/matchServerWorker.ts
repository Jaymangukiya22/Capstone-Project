import cluster from 'cluster';
import { monitorEventLoopDelay } from 'perf_hooks';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { User, Quiz, QuizQuestion, QuestionBankItem, QuestionBankOption, Match, MatchPlayer as MatchPlayerModel, MatchAnswer } from './models/index';
import { initializeRedis, getRedisPubSub, getRedisClient } from './config/redis';
import { logInfo, logError } from './utils/logger';
import { computeEloUpdate } from './utils/elo';
import { v4 as uuidv4 } from 'uuid';

if (!cluster.isWorker) {
  throw new Error('This file should only run as a worker process');
}

const workerId = cluster.worker!.id;
const MAX_MATCHES = parseInt(process.env.MAX_MATCHES || '5', 10);
// Extra time (on top of the quiz's per-question timeLimit) before the server
// force-advances a question nobody has finished submitting. Covers network
// latency on the client's own timeout firing and its submit round-trip.
const QUESTION_TIMEOUT_GRACE_SECONDS = parseInt(process.env.QUESTION_TIMEOUT_GRACE_SECONDS || '5', 10);

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
  mode?: 'FRIEND' | 'AUTO';
  questionTimeoutId?: NodeJS.Timeout;
  dbId?: number; // Postgres Match.id, cached after first ensureDbMatch() resolution
  dbIdPromise?: Promise<number | null>; // in-flight ensureDbMatch(), shared so concurrent first-answers don't each create a row ([M10])
  lastActivityAt: number; // updated on answer submission, question advance, player join/reconnect
  traceId?: string; // correlation id threaded through this match's structured logs
  startedAtMs?: number; // wall-clock ms when the match started (for duration metric)
  // Owner replica for cross-replica event routing (master's routeMatchEvent /
  // mm_match_event - see matchServerMaster.ts). Unset for FRIEND matches.
  // Must be preserved on every Redis round-trip (hydrate -> saveMatchState) or
  // the master loses track of ownership and every replica starts treating
  // itself as local, splitting match state across replicas.
  serverId?: string;
}

class WorkerMatchService {
  private matches: Map<string, MatchRoom> = new Map();
  private userToMatch: Map<number, string> = new Map();
  // Guards concurrent joinMatch() hydration for the SAME brand-new matchId.
  // AUTO matches forward join_match IPC for both players back-to-back with
  // neither having created the room locally first (unlike FRIEND, where the
  // creator's synchronous create_friend_match already puts the match in
  // `matches` before the joiner's join_match_by_code ever reaches a worker).
  // Without this, two concurrent joinMatch() calls for the same new matchId
  // both pass `if (!match)`, each build a SEPARATE match object with its own
  // player-restore + socketId assignment, and the second this.matches.set()
  // silently clobbers the first - the first player's socketId is lost,
  // connectedCount can never reach maxPlayers, and LOAD_GAME_SCENE never
  // fires (the match hangs at WAITING forever).
  private hydratingMatches: Map<string, Promise<MatchRoom>> = new Map();
  private redis: any;
  private questionTimers: Map<string, NodeJS.Timeout> = new Map();
  private staleMatchReaperInterval: NodeJS.Timeout | null = null;

  // Per-worker cache of a quiz's questions. loadQuizQuestions runs a heavy
  // 3-level nested-include query and was previously re-run on every match
  // hydration (create/join/playerReady/submitAnswer) - at scale, many matches
  // share the same quiz and re-issued the identical query. Questions are
  // static during runtime; cache them with a short TTL so a quiz edit still
  // propagates within QUIZ_CACHE_TTL_MS.
  private questionsCache: Map<number, { questions: any[]; expiresAt: number }> = new Map();
  private readonly questionsCacheTtlMs: number = parseInt(process.env.QUIZ_CACHE_TTL_MS || '300000', 10);

  // Stale-match reaper: force-terminate matches with no activity for 5 minutes,
  // checked every 60 seconds.
  private readonly staleMatchTimeoutMs: number = parseInt(process.env.STALE_MATCH_TIMEOUT_MS || '300000', 10);
  private readonly staleMatchCheckIntervalMs: number = parseInt(process.env.STALE_MATCH_CHECK_INTERVAL_MS || '60000', 10);

  constructor(redis: any) {
    this.redis = redis;
    this.startHeartbeat();
    this.startStaleMatchReaper();
    // Notify master that this worker is fully initialized and ready to accept matches
    this.notifyMaster({
      type: 'worker_ready',
      maxMatches: MAX_MATCHES
    });
  }

  private startHeartbeat() {
    // Sample this worker's event-loop delay so the master can expose it as a
    // per-worker gauge (a worker with high lag is overloaded and its matches
    // will feel stuck).
    const lagMonitor = monitorEventLoopDelay({ resolution: 20 });
    lagMonitor.enable();

    setInterval(() => {
      const eventLoopLagSeconds = lagMonitor.mean / 1e9; // ns -> s
      lagMonitor.reset();
      this.notifyMaster({ type: 'heartbeat', eventLoopLagSeconds });
    }, 30000); // Every 30 seconds
  }

  private startStaleMatchReaper() {
    this.staleMatchReaperInterval = setInterval(() => {
      this.reapStaleMatches();
    }, this.staleMatchCheckIntervalMs);
  }

  private reapStaleMatches() {
    const now = Date.now();
    this.matches.forEach((match, matchId) => {
      if (match.status === 'COMPLETED') return;

      const lastActivity = match.lastActivityAt || match.createdAt.getTime();
      if (now - lastActivity > this.staleMatchTimeoutMs) {
        this.terminateStaleMatch(matchId, match);
      }
    });
  }

  private async terminateStaleMatch(matchId: string, match: MatchRoom) {
    const idleMs = Date.now() - (match.lastActivityAt || match.createdAt.getTime());
    logInfo(`Worker ${workerId}: Terminating stale match due to inactivity`, { matchId, idleMs });

    this.clearQuestionTimer(matchId);

    this.emitToMatch(matchId, 'match_terminated', {
      matchId,
      reason: 'inactivity',
      message: 'Match ended due to inactivity.'
    });

    // Same cleanup used when a match ends normally (see endMatch): drop every
    // player -> match mapping, the match itself, its Redis snapshot, and tell
    // the master so worker-pool bookkeeping (matchCount/activeMatches) stays correct.
    match.players.forEach((player) => {
      this.userToMatch.delete(player.userId);
    });
    this.matches.delete(matchId);

    // [M11]: reconcile the Postgres row to a terminal status. Without this an
    // abandoned match stays IN_PROGRESS/WAITING in the DB forever even though it
    // is gone from memory and Redis - the historical source of the stale-row
    // pileup. Only touch a row that actually persisted (a match reaped before
    // anyone answered never created one); off the critical path, .catch-logged.
    if (match.dbId !== undefined) {
      Match.update(
        { status: 'CANCELLED' as any, endedAt: new Date() },
        { where: { id: match.dbId, status: ['WAITING', 'IN_PROGRESS'] as any } }
      ).catch((error) => logError(`Worker ${workerId}: Failed to mark stale match CANCELLED`, error as Error));
    }

    try {
      await this.redis.del(`match:${matchId}`);
    } catch (error) {
      logError(`Worker ${workerId}: Failed to delete stale match from Redis`, error as Error);
    }

    this.notifyMaster({ type: 'match_completed', matchId });
  }

  public shutdown() {
    if (this.staleMatchReaperInterval) {
      clearInterval(this.staleMatchReaperInterval);
      this.staleMatchReaperInterval = null;
    }
    this.questionTimers.forEach((timer) => clearTimeout(timer));
    this.questionTimers.clear();
  }

  private clearQuestionTimer(matchId: string) {
    const timer = this.questionTimers.get(matchId);
    if (timer) {
      clearTimeout(timer);
      this.questionTimers.delete(matchId);
    }
  }

  // Server-owned deadline for the current question so a disconnected/stalled
  // opponent can't wedge the match forever waiting on a submission that will
  // never come (the only prior escape hatch was the 5-minute stale-match
  // reaper, which kills the whole match instead of just the one question).
  private scheduleQuestionTimer(matchId: string, questionIndex: number) {
    this.clearQuestionTimer(matchId);
    const match = this.matches.get(matchId);
    if (!match) return;

    const timeoutMs = (match.timeLimit + QUESTION_TIMEOUT_GRACE_SECONDS) * 1000;
    const timer = setTimeout(() => {
      this.handleQuestionTimeout(matchId, questionIndex).catch((error) =>
        logError(`Worker ${workerId}: Failed to handle question timeout`, error as Error)
      );
    }, timeoutMs);

    this.questionTimers.set(matchId, timer);
  }

  // If a match is IN_PROGRESS but was just hydrated from Redis (e.g. this
  // worker didn't originate it, or replaced a dead worker holding it), this
  // process has no question timer running for it yet. Schedule one for
  // whatever time remains on the current question instead of leaving the
  // match with no server-side deadline until the next answer/hydration.
  private ensureQuestionTimerForHydratedMatch(matchId: string, match: MatchRoom) {
    if (match.status !== 'IN_PROGRESS' || this.questionTimers.has(matchId)) return;

    const elapsedMs = match.questionStartTime ? Date.now() - match.questionStartTime : 0;
    const remainingMs = match.timeLimit * 1000 + QUESTION_TIMEOUT_GRACE_SECONDS * 1000 - elapsedMs;
    const questionIndex = match.currentQuestionIndex;

    if (remainingMs <= 0) {
      // Already overdue - handle it right away rather than scheduling a
      // negative/zero timeout.
      this.handleQuestionTimeout(matchId, questionIndex).catch((error) =>
        logError(`Worker ${workerId}: Failed to handle overdue question timeout`, error as Error)
      );
      return;
    }

    const timer = setTimeout(() => {
      this.handleQuestionTimeout(matchId, questionIndex).catch((error) =>
        logError(`Worker ${workerId}: Failed to handle question timeout`, error as Error)
      );
    }, remainingMs);

    this.questionTimers.set(matchId, timer);
  }

  private async handleQuestionTimeout(matchId: string, questionIndex: number) {
    const match = this.matches.get(matchId);
    if (!match) return;

    // The question already advanced (both players submitted in time) or the
    // match ended by the time this fired - nothing to do.
    if (match.status !== 'IN_PROGRESS' || match.currentQuestionIndex !== questionIndex) {
      return;
    }

    const currentQuestion = match.questions[match.currentQuestionIndex];
    if (!currentQuestion) return;

    const correctOptionIds = currentQuestion.options
      .filter((opt: any) => opt.isCorrect)
      .map((opt: any) => opt.id);

    let anyForced = false;
    for (const player of match.players.values()) {
      if (player.hasSubmittedCurrent) continue;
      anyForced = true;

      player.answers.push({
        questionId: currentQuestion.id,
        selectedOptions: [],
        isCorrect: false,
        timeSpent: match.timeLimit,
        points: 0
      });
      player.hasSubmittedCurrent = true;

      // Timed-out non-answer still counts as time spent (the full question
      // window) for this user's records + the aggregate answer-time metric.
      logInfo('answer_submitted', {
        event: 'answer_submitted',
        userId: player.userId,
        username: player.username,
        matchId,
        traceId: match.traceId,
        questionIndex: match.currentQuestionIndex,
        questionId: currentQuestion.id,
        isCorrect: false,
        timeSpent: match.timeLimit,
        points: 0,
        timedOut: true,
      });
      this.notifyMaster({ type: 'metric_answer', result: 'timeout', timeSpentSeconds: match.timeLimit });

      if (player.socketId) {
        this.emitToSocket(player.socketId, 'answer_result', {
          isCorrect: false,
          points: 0,
          correctOptions: correctOptionIds,
          totalScore: player.score,
          timedOut: true
        });
      }
    }

    if (!anyForced) return;

    this.notifyMaster({ type: 'metric_question_advanced', reason: 'timeout' });

    logInfo(`Worker ${workerId}: Question timed out, force-advancing`, {
      matchId,
      questionIndex: match.currentQuestionIndex
    });

    match.lastActivityAt = Date.now();
    await this.saveMatchState(matchId, match);

    this.emitToMatch(matchId, 'question_timed_out', {
      matchId,
      questionIndex: match.currentQuestionIndex
    });

    this.emitToMatch(matchId, 'score_update', {
      matchId,
      players: this.getPlayerList(match)
    });

    if (match.currentQuestionIndex >= match.questions.length - 1) {
      await this.endMatch(matchId);
      return;
    }

    await this.nextQuestion(matchId);
  }

  private notifyMaster(message: any) {
    if (process.send) {
      process.send({ ...message, workerId });
    }
  }

  private async loadQuizQuestions(quizId: number): Promise<any[]> {
    // Serve from the per-worker cache when fresh - avoids the heavy nested
    // include on every match hydration for a quiz already loaded on this worker.
    const cached = this.questionsCache.get(quizId);
    if (cached && cached.expiresAt > Date.now()) {
      // Return the SHARED cached array (not a per-match deep copy). Questions are
      // read-only for the life of a match - only indexed for reads and sanitized
      // into fresh objects before every emit (sanitizeQuestion), never mutated
      // (verified: no writes to match.questions[*], no in-place sort/splice). So
      // thousands of matches on one worker share a single frozen copy per quiz
      // instead of each holding its own - big cut to per-match memory and to the
      // allocation churn of copying 10 questions on every create/hydrate at ramp.
      return cached.questions;
    }

    const loaded = await this.loadQuizQuestionsFromDb(quizId);
    if (loaded.length > 0) {
      // Freeze once so the sharing above stays safe even if a future edit tries
      // to mutate a shared question (it would throw instead of corrupting every
      // match on the worker).
      this.deepFreezeQuestions(loaded);
      this.questionsCache.set(quizId, { questions: loaded, expiresAt: Date.now() + this.questionsCacheTtlMs });
    }
    return loaded;
  }

  private deepFreezeQuestions(questions: any[]): void {
    for (const q of questions) {
      if (q && Array.isArray(q.options)) {
        for (const o of q.options) Object.freeze(o);
        Object.freeze(q.options);
      }
      Object.freeze(q);
    }
    Object.freeze(questions);
  }

  private async loadQuizQuestionsFromDb(quizId: number): Promise<any[]> {
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

      logInfo(`Worker ${workerId}: Loaded quiz questions`, {
        quizId,
        totalQuestionsLoaded: quizQuestions.length,
        questionIds: quizQuestions.map((qq: any) => qq.question.id)
      });

      const mappedQuestions = quizQuestions.map((qq: any) => ({
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

      logInfo(`Worker ${workerId}: Mapped questions`, {
        quizId,
        totalQuestionsMapped: mappedQuestions.length
      });

      return mappedQuestions;
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
      joinCode,
      mode: 'FRIEND',
      lastActivityAt: Date.now(),
      traceId: uuidv4()
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

  private async hydrateMatchFromRedis(matchId: string, callerUserId: number): Promise<MatchRoom> {
    const inFlight = this.hydratingMatches.get(matchId);
    if (inFlight) return inFlight;

    const promise = (async (): Promise<MatchRoom> => {
      // Re-check in case a prior hydration already landed while this call
      // was queued behind the lock.
      const already = this.matches.get(matchId);
      if (already) return already;

      logInfo(`Worker ${workerId}: Match not in local memory, loading from Redis`, { matchId });
      const matchData = await this.redis.get(`match:${matchId}`);
      if (!matchData) {
        logError(`Worker ${workerId}: Match not found in Redis either!`, new Error(`Match ${matchId}`));
        throw new Error('Match not found');
      }
      logInfo(`Worker ${workerId}: ✅ Match loaded from Redis`, { matchId });

      const storedMatch = JSON.parse(matchData);
      const questions = await this.loadQuizQuestions(storedMatch.quizId);

      const match: MatchRoom = {
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
        joinCode: storedMatch.joinCode,
        mode: storedMatch.mode || (storedMatch.joinCode ? 'FRIEND' : 'AUTO'),
        lastActivityAt: Date.now(),
        traceId: storedMatch.traceId || uuidv4(),
        serverId: storedMatch.serverId
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

      // Inform master that this match now exists on this worker so it can
      // correctly track active matches and utilization, even for matches that
      // originated via HTTP/Redis instead of a direct create_match message.
      // Fires exactly once per match now that hydration is deduplicated (it
      // used to fire once per concurrent caller, double-incrementing the
      // worker's matchCount for every AUTO match).
      this.notifyMaster({
        type: 'match_created',
        matchId,
        userId: callerUserId
      });

      logInfo(`Worker ${workerId}: MATCH INITIALIZED FROM REDIS`, {
        matchId,
        quizId: storedMatch.quizId,
        playersInRedis: Array.isArray(storedMatch.players) ? storedMatch.players.length : 0,
        matchesInThisWorker: this.matches.size
      });

      this.ensureQuestionTimerForHydratedMatch(matchId, match);
      return match;
    })();

    this.hydratingMatches.set(matchId, promise);
    try {
      return await promise;
    } finally {
      this.hydratingMatches.delete(matchId);
    }
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

    // Load from Redis if not in memory. Concurrent calls for the SAME new
    // matchId (both AUTO players' join_match IPC land back-to-back with
    // neither having created the room locally first) share one in-flight
    // hydration instead of each building + clobbering their own MatchRoom.
    if (!match) {
      match = await this.hydrateMatchFromRedis(matchId, userId);
    }

    if (match.status !== 'WAITING' && !match.players.has(userId)) {
      throw new Error('Match already started');
    }

    if (match.players.size >= match.maxPlayers && !match.players.has(userId)) {
      throw new Error('Match is full');
    }

    const isReconnect = match.players.has(userId);

    if (isReconnect) {
      const player = match.players.get(userId)!;
      player.socketId = socketId;
      this.userToMatch.set(userId, matchId);
      match.lastActivityAt = Date.now();

      // The MASTER's userId->matchId map (used by getUserMatch, which
      // cross-replica event routing depends on) is only populated from the
      // 'match_created'/'player_joined' IPC messages. 'match_created' now
      // fires once total per match (see hydrateMatchFromRedis), carrying only
      // whichever caller happened to trigger hydration - so every reconnect
      // path must independently register ITS OWN userId, or the other AUTO
      // player (who took this branch and never hit 'match_created') is never
      // tracked on the master at all.
      this.notifyMaster({ type: 'player_joined', matchId, userId });

      // Send reconnection state
      if (match.status === 'IN_PROGRESS') {
        const currentQuestion = match.questions[match.currentQuestionIndex];
        const timeElapsed = match.questionStartTime ? Date.now() - match.questionStartTime : 0;

        // The reconnecting client can't tell "opponent is still thinking" from
        // "opponent disconnected and this match is dead" without this - it was
        // previously only getting its own state back.
        const opponent = Array.from(match.players.values()).find(p => p.userId !== userId);

        this.emitToSocket(socketId, 'match_reconnected', {
          question: this.sanitizeQuestion(currentQuestion, match.timeLimit),
          questionIndex: match.currentQuestionIndex,
          totalQuestions: match.questions.length,
          timeElapsed: Math.floor(timeElapsed / 1000),
          playerScore: player.score,
          playerAnswers: player.answers,
          hasSubmittedCurrent: player.hasSubmittedCurrent,
          opponent: opponent ? {
            userId: opponent.userId,
            username: opponent.username,
            connected: !!opponent.socketId,
            score: opponent.score,
            hasSubmittedCurrent: opponent.hasSubmittedCurrent
          } : null
        });
      } else {
        // Pre-game reconnect: just send current lobby state
        this.emitToSocket(socketId, 'match_joined', {
          matchId,
          players: this.getPlayerList(match),
          quiz: match.quiz,
          totalQuestions: match.questions.length
        });
      }

      logInfo('player_reconnected', {
        event: 'player_reconnected',
        userId,
        username: player.username,
        matchId,
        traceId: match.traceId,
        matchStatus: match.status,
        questionIndex: match.currentQuestionIndex,
      });
      // Only count reconnections into a live game (the recovery path that
      // matters for the "refresh always recovers" requirement).
      if (match.status === 'IN_PROGRESS') {
        this.notifyMaster({ type: 'metric_reconnect' });
      }
    } else {
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
      match.lastActivityAt = Date.now();

      // Save to Redis immediately. This await is the actual consistency
      // guarantee - the Redis write is durable before we proceed. The old
      // blind 500ms sleep here was redundant (it "waited for Redis" after
      // already awaiting the write) and added 500ms to every second-player
      // join; the worker-assignment race it claimed to prevent is handled by
      // the master (it writes match.workerId synchronously before forwarding),
      // and any residual join/ready ordering race is covered by the retry
      // loop in playerReady().
      await this.saveMatchState(matchId, match);

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
        question: firstQuestion ? this.sanitizeQuestion(firstQuestion, match.timeLimit) : null,
        questionIndex: 0
      });

      // Send acknowledgment to allow client to emit player_ready
      this.emitToSocket(socketId, 'match_ready_acknowledged', {
        matchId,
        userId
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
    }

    // Wait for CLIENT_READY signal instead of auto-starting.
    // ALL PLAYERS PRESENT now means "all maxPlayers have active socket connections",
    // not just that they exist in Redis/DB.
    const connectedCount = Array.from(match.players.values()).filter(p => p.socketId && p.socketId.length > 0).length;

    if (connectedCount === match.maxPlayers && match.status === 'WAITING') {
      logInfo(`Worker ${workerId}: ✅ ALL PLAYERS PRESENT - WAITING FOR CLIENT_READY`, {
        matchId,
        connectedCount,
        maxPlayers: match.maxPlayers
      });

      // Tell clients to load the game scene
      this.emitToMatch(matchId, 'LOAD_GAME_SCENE', {
        matchId,
        players: this.getPlayerList(match),
        quiz: match.quiz,
        totalQuestions: match.questions.length
      });
    } else if (!isReconnect && connectedCount === match.maxPlayers && match.status !== 'WAITING') {
      // LATE JOINER FIX (preserved): If match is already full and this player
      // just joined as a new socket, send LOAD_GAME_SCENE directly so they don't get stuck.
      logInfo(`Worker ${workerId}: ⚠️ LATE JOINER/RECONNECT - Sending LOAD_GAME_SCENE to user ${userId}`, { 
        matchId, 
        connectedCount,
        matchStatus: match.status
      });
      
      this.emitToSocket(socketId, 'LOAD_GAME_SCENE', {
        matchId,
        players: this.getPlayerList(match),
        quiz: match.quiz,
        totalQuestions: match.questions.length
      });
    }
  }

  public async playerReady(data: any) {
    const { matchId, userId } = data;
    let match = this.matches.get(matchId);

    // If match not in memory, try to load from Redis
    if (!match) {
      logInfo(`Worker ${workerId}: Match not in local memory for playerReady, loading from Redis`, { matchId });
      const matchData = await this.redis.get(`match:${matchId}`);
      if (!matchData) {
        logError(`Worker ${workerId}: Match not found in Redis for playerReady`, new Error(`Match ${matchId}`));
        throw new Error('Match not found');
      }

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
        joinCode: storedMatch.joinCode,
        mode: storedMatch.mode || (storedMatch.joinCode ? 'FRIEND' : 'AUTO'),
        lastActivityAt: Date.now(),
        traceId: storedMatch.traceId || uuidv4(),
        serverId: storedMatch.serverId
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
      this.ensureQuestionTimerForHydratedMatch(matchId, match);
    }

    // Wait for the player to be in the match (guards CLIENT_READY arriving
    // before this worker finished processing the join). Early-exits the
    // instant the player appears, so the happy path costs zero iterations;
    // finer 50ms granularity (same ~1s max window) recovers faster than the
    // old 100ms steps when a real race does occur.
    let retries = 0;
    const maxRetries = 20;
    while (!match.players.has(userId) && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 50));
      retries++;
      
      // Reload match from Redis in case it was updated
      const updatedData = await this.redis.get(`match:${matchId}`);
      if (updatedData) {
        const updated = JSON.parse(updatedData);
        if (updated.players && Array.isArray(updated.players)) {
          for (const p of updated.players) {
            if (!match.players.has(p.userId)) {
              match.players.set(p.userId, {
                userId: p.userId,
                username: p.username,
                firstName: p.firstName,
                lastName: p.lastName,
                socketId: '',
                score: p.score || 0,
                currentQuestionIndex: p.currentQuestionIndex || 0,
                isReady: p.isReady || false,
                hasSubmittedCurrent: p.hasSubmittedCurrent || false,
                answers: p.answers || []
              });
            }
          }
        }
      }
    }

    if (!match.players.has(userId)) {
      logError(`Worker ${workerId}: Player still not in match after retries`, new Error(`User ${userId} not in match ${matchId}`));
      return;
    }

    if (match.players.size < match.maxPlayers) {
      try {
        const latestData = await this.redis.get(`match:${matchId}`);
        if (latestData) {
          const latest = JSON.parse(latestData);
          if (latest.players && Array.isArray(latest.players)) {
            for (const p of latest.players) {
              if (!match.players.has(p.userId)) {
                match.players.set(p.userId, {
                  userId: p.userId,
                  username: p.username,
                  firstName: p.firstName,
                  lastName: p.lastName,
                  socketId: '',
                  score: p.score || 0,
                  currentQuestionIndex: p.currentQuestionIndex || 0,
                  isReady: p.isReady || false,
                  hasSubmittedCurrent: p.hasSubmittedCurrent || false,
                  answers: p.answers || []
                });
              }
            }
          }
        }
      } catch (error) {
        logError(`Worker ${workerId}: Failed to merge latest players from Redis for playerReady`, error as Error);
      }
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
      logInfo(`Worker ${workerId}: All players ready, starting match`, { matchId });
      await this.startMatch(matchId);
    }
  }

  public async clientReady(data: any) {
    const { matchId, userId } = data;
    logInfo(`Worker ${workerId}: CLIENT_READY received`, { matchId, userId });
    await this.playerReady({ matchId, userId });
  }

  private async startMatch(matchId: string) {
    const match = this.matches.get(matchId);
    if (!match || match.questions.length === 0) {
      throw new Error('Cannot start match - no questions');
    }

    if (match.status !== 'WAITING') {
      logInfo(
        `Worker ${workerId}: Match already started or in progress - skipping duplicate start`,
        { matchId, currentStatus: match.status }
      );
      return;
    }

    match.status = 'IN_PROGRESS';
    match.currentQuestionIndex = 0;
    match.questionStartTime = Date.now();
    match.startedAtMs = Date.now();
    match.lastActivityAt = Date.now();

    Array.from(match.players.values()).forEach(p => {
      p.hasSubmittedCurrent = false;
    });

    await this.saveMatchState(matchId, match);

    const currentQuestion = match.questions[0];
    this.emitToMatch(matchId, 'match_started', {
      question: this.sanitizeQuestion(currentQuestion, match.timeLimit),
      questionIndex: 0,
      totalQuestions: match.questions.length
    });

    this.scheduleQuestionTimer(matchId, 0);

    logInfo(`Worker ${workerId}: Match started - waiting for player answers`, {
      matchId,
      playerCount: match.players.size
    });
  }

  public async submitAnswer(data: any) {
    const { matchId, userId } = data;
    const clientData = data.data || {};
    const { questionId, selectedOptions, timeSpent } = clientData;

    let match = this.matches.get(matchId);
    if (!match) {
      const matchData = await this.redis.get(`match:${matchId}`);
      if (!matchData) throw new Error('Match not found');
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
        joinCode: storedMatch.joinCode,
        mode: storedMatch.mode || (storedMatch.joinCode ? 'FRIEND' : 'AUTO'),
        lastActivityAt: Date.now(),
        traceId: storedMatch.traceId || uuidv4(),
        serverId: storedMatch.serverId
      };

      if (storedMatch.players && Array.isArray(storedMatch.players)) {
        for (const p of storedMatch.players) {
          match.players.set(p.userId, {
            userId: p.userId,
            username: p.username,
            firstName: p.firstName,
            lastName: p.lastName,
            socketId: p.socketId || '',
            score: p.score || 0,
            currentQuestionIndex: p.currentQuestionIndex || 0,
            isReady: p.isReady || false,
            answers: p.answers || [],
            hasSubmittedCurrent: p.hasSubmittedCurrent || false
          });
        }
      }

      this.matches.set(matchId, match);
      this.ensureQuestionTimerForHydratedMatch(matchId, match);
    }

    if (match.status !== 'IN_PROGRESS') {
      throw new Error('Match not in progress');
    }

    const player = match.players.get(userId);
    if (!player) {
      throw new Error('Player not in match');
    }

    const currentQuestion = match.questions[match.currentQuestionIndex];
    if (!currentQuestion) {
      throw new Error('No current question available');
    }

    if (typeof questionId === 'number' && currentQuestion.id !== questionId) {
      logInfo(`Worker ${workerId}: Ignoring stale submission for non-current question`, {
        matchId,
        userId,
        submittedQuestionId: questionId,
        currentQuestionId: currentQuestion.id,
        currentQuestionIndex: match.currentQuestionIndex
      });
      return;
    }

    if (player.hasSubmittedCurrent) {
      return;
    }

    if (!Array.isArray(selectedOptions)) {
      throw new Error('Invalid selected options payload');
    }

    if (typeof timeSpent !== 'number' || timeSpent < 0 || timeSpent > match.timeLimit + 5) {
      throw new Error('Invalid time spent');
    }

    const sanitizedSelectedOptions = selectedOptions.filter(
      (id: any) => typeof id === 'number'
    );
    const correctOptionIds = currentQuestion.options
      .filter((opt: any) => opt.isCorrect)
      .map((opt: any) => opt.id);

    const isCorrect =
      sanitizedSelectedOptions.length === correctOptionIds.length &&
      sanitizedSelectedOptions.every((id: number) => correctOptionIds.includes(id));

    const validTimeSpent = Math.min(Math.max(timeSpent, 0), match.timeLimit);
    const basePoints = 100;
    const timeBonus = Math.max(0, Math.floor((match.timeLimit - validTimeSpent) * 2));
    const points = isCorrect ? basePoints + timeBonus : 0;

    player.score += points;
    player.answers.push({
      questionId: currentQuestion.id,
      selectedOptions: sanitizedSelectedOptions,
      isCorrect,
      timeSpent: validTimeSpent,
      points
    });
    player.hasSubmittedCurrent = true;
    match.lastActivityAt = Date.now();

    // Structured per-user event (queryable in Loki) + aggregate metric to the
    // master. This is the "time spent by each user" record the product wants.
    logInfo('answer_submitted', {
      event: 'answer_submitted',
      userId,
      username: player.username,
      matchId,
      traceId: match.traceId,
      questionIndex: match.currentQuestionIndex,
      questionId: currentQuestion.id,
      isCorrect,
      timeSpent: validTimeSpent,
      points,
    });
    this.notifyMaster({
      type: 'metric_answer',
      result: isCorrect ? 'correct' : 'incorrect',
      timeSpentSeconds: validTimeSpent,
    });

    // Redis is the reconnection source of truth during a live match — a single
    // op, kept awaited and ahead of the emits below.
    await this.saveMatchState(matchId, match);

    this.emitToSocket(player.socketId, 'answer_result', {
      isCorrect,
      points,
      correctOptions: correctOptionIds,
      totalScore: player.score
    });

    this.emitToMatch(matchId, 'opponent_submitted', {
      userId,
      username: player.username
    }, [player.socketId]);

    this.emitToMatch(matchId, 'score_update', {
      matchId,
      players: this.getPlayerList(match),
      updatedUserId: userId
    });

    // Postgres write is the audit/history record, NOT the live source of
    // truth — fire it off the critical path so it never delays the
    // player-facing emits above. In-memory state is already updated
    // synchronously (score/answers, above), so a failed or slow DB write
    // here cannot desync live gameplay or crash the match; only .catch-logged.
    const questionIndexAtSubmission = match.currentQuestionIndex;
    this.ensureDbMatchId(match)
      .then((matchDbId) => {
        if (matchDbId === null) return;
        return this.insertDbAnswer({
          matchDbId,
          userId,
          questionId: currentQuestion.id,
          questionIndex: questionIndexAtSubmission,
          selectedOptions: sanitizedSelectedOptions,
          correctOptions: correctOptionIds,
          isCorrect,
          timeSpent: validTimeSpent,
          points
        }).then(() => this.upsertDbPlayer(matchDbId, match, userId));
      })
      .catch((error) => logError(`Worker ${workerId}: Failed to persist answer to database`, error as Error));

    const allSubmitted = Array.from(match.players.values()).every(
      p => p.hasSubmittedCurrent
    );
    if (!allSubmitted) {
      const waitingFor = Array.from(match.players.values())
        .filter(p => !p.hasSubmittedCurrent)
        .map(p => p.username);

      this.emitToSocket(player.socketId, 'waiting_for_opponent', {
        matchId,
        message: 'Waiting for opponent to answer…',
        waitingFor,
      });
      return;
    }

    this.notifyMaster({ type: 'metric_question_advanced', reason: 'all_answered' });

    if (match.currentQuestionIndex >= match.questions.length - 1) {
      await this.endMatch(matchId);
      return;
    }

    await this.nextQuestion(matchId);
  }

  private async nextQuestion(matchId: string) {
    const match = this.matches.get(matchId);
    if (!match) return;

    match.currentQuestionIndex += 1;
    if (match.currentQuestionIndex >= match.questions.length) {
      await this.endMatch(matchId);
      return;
    }

    Array.from(match.players.values()).forEach(p => {
      p.hasSubmittedCurrent = false;
    });

    match.questionStartTime = Date.now();
    match.lastActivityAt = Date.now();
    await this.saveMatchState(matchId, match);

    const currentQuestion = match.questions[match.currentQuestionIndex];
    this.emitToMatch(matchId, 'next_question', {
      question: this.sanitizeQuestion(currentQuestion, match.timeLimit),
      questionIndex: match.currentQuestionIndex,
      totalQuestions: match.questions.length
    });

    this.scheduleQuestionTimer(matchId, match.currentQuestionIndex);
  }

  private async endMatch(matchId: string) {
    const match = this.matches.get(matchId);
    if (!match) return;

    // Re-entrancy guard. Both players submitting the final question can each
    // observe allSubmitted=true after their own `await saveMatchState`, so
    // both reach endMatch; a stalled question timer firing concurrently is a
    // second path in. Without this, the match completes twice - double DB
    // write, double match_completed emit, double metrics. The status flip
    // below is synchronous before the first await, so the first caller wins
    // and any concurrent caller returns here.
    if (match.status === 'COMPLETED') return;

    this.clearQuestionTimer(matchId);
    match.status = 'COMPLETED';
    await this.saveMatchState(matchId, match);

    const results = Array.from(match.players.values()).map(player => {
      const correctAnswers = player.answers.filter(a => a.isCorrect).length;
      const totalTimeSpent = player.answers.reduce(
        (sum, a) => sum + a.timeSpent,
        0
      );

      return {
        userId: player.userId,
        username: player.username,
        firstName: player.firstName,
        lastName: player.lastName,
        score: player.score,
        answers: player.answers,
        correctAnswers,
        totalAnswers: player.answers.length,
        accuracy:
          player.answers.length > 0
            ? Math.round((correctAnswers / player.answers.length) * 100)
            : 0,
        timeSpent: totalTimeSpent
      };
    });

    results.sort((a, b) => b.score - a.score);
    const winnerId = results.length > 0 ? results[0].userId : null;

    // Per-user completion record (total time spent, score, accuracy) for Loki,
    // plus the aggregate match-duration metric to the master.
    const durationSeconds = match.startedAtMs ? (Date.now() - match.startedAtMs) / 1000 : 0;
    for (const r of results) {
      logInfo('match_completed', {
        event: 'match_completed',
        userId: r.userId,
        username: r.username,
        matchId,
        traceId: match.traceId,
        score: r.score,
        correctAnswers: r.correctAnswers,
        totalAnswers: r.totalAnswers,
        accuracy: r.accuracy,
        totalTimeSpent: r.timeSpent,
        won: r.userId === winnerId,
        matchDurationSeconds: Math.round(durationSeconds),
      });
    }
    this.notifyMaster({ type: 'metric_match_completed', durationSeconds });

    // Tell both clients the match is over immediately - Postgres is the
    // audit/history record, not the live source of truth (mirrors the same
    // fire-and-forget pattern submitAnswer already uses), so persistence
    // shouldn't add DB round-trip latency to a player-facing emit.
    this.emitToMatch(matchId, 'match_completed', {
      results,
      winner: results[0] || null,
      matchId,
      completedAt: new Date().toISOString(),
      isFriendMatch: (match.mode || (match.joinCode ? 'FRIEND' : 'AUTO')) === 'FRIEND'
    });

    this.ensureDbMatch(match)
      .then(async (matchDb) => {
        if (!matchDb) return;
        await matchDb.update({
          status: 'COMPLETED',
          endedAt: new Date(),
          winnerId
        } as any);

        await Promise.all(results.map(async (result) => {
          // Race-safe against match_players_matchid_userid_uq ([M10]): this can
          // race the per-answer upsertDbPlayer for the same (matchId,userId), so
          // findOrCreate rather than findOne-then-create - the loser updates the
          // existing row to FINISHED instead of inserting a duplicate.
          const [existing, created] = await MatchPlayerModel.findOrCreate({
            where: { matchId: matchDb.id, userId: result.userId },
            defaults: {
              matchId: matchDb.id,
              userId: result.userId,
              status: 'FINISHED',
              score: result.score,
              correctAnswers: result.correctAnswers,
              timeSpent: result.timeSpent,
              joinedAt: new Date(),
              finishedAt: new Date()
            } as any
          });
          if (!created) {
            await existing.update({
              status: 'FINISHED',
              score: result.score,
              correctAnswers: result.correctAnswers,
              timeSpent: result.timeSpent,
              finishedAt: new Date()
            } as any);
          }
        }));

        // Ranked Elo + win/loss/total-match updates for AUTO (ranked) matches
        // only - FRIEND matches are unranked and must not move ratings.
        // Only handles the 1v1 case for now; N>2 players would need pairwise
        // round-robin Elo (each player vs every other), which this guard
        // intentionally skips as a safe no-op rather than guessing.
        if (match.mode === 'AUTO' && results.length === 2) {
          const [pa, pb] = results;
          const users = await User.findAll({ where: { id: [pa.userId, pb.userId] } });
          const ua = users.find(u => u.id === pa.userId);
          const ub = users.find(u => u.id === pb.userId);
          if (ua && ub) {
            const upd = computeEloUpdate(ua.eloRating, ub.eloRating, pa.score, pb.score);
            const draw = pa.score === pb.score;
            await Promise.all([
              User.update({ eloRating: upd.ratingA }, { where: { id: ua.id } }),
              User.update({ eloRating: upd.ratingB }, { where: { id: ub.id } }),
              User.increment(
                { totalMatches: 1, wins: draw ? 0 : (upd.outcomeA === 1 ? 1 : 0), losses: draw ? 0 : (upd.outcomeA === 0 ? 1 : 0) },
                { where: { id: ua.id } }
              ),
              User.increment(
                { totalMatches: 1, wins: draw ? 0 : (upd.outcomeB === 1 ? 1 : 0), losses: draw ? 0 : (upd.outcomeB === 0 ? 1 : 0) },
                { where: { id: ub.id } }
              ),
            ]);
          }
        }
      })
      .catch((error) => logError(`Worker ${workerId}: Failed to save match to database`, error as Error));

    setTimeout(async () => {
      match.players.forEach(p => {
        this.userToMatch.delete(p.userId);
      });

      this.matches.delete(matchId);
      await this.redis.del(`match:${matchId}`);

      this.notifyMaster({ type: 'match_completed', matchId });
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
        // Store only the COUNT, not the full questions array. Hydration always
        // reloads questions fresh via loadQuizQuestions(quizId) (see the
        // JSON.parse sites) and never reads snapshot.questions - the array was
        // dead weight rewritten into Redis on every question advance. The master
        // only needs the count (for the disconnect-state totalQuestions).
        totalQuestions: match.questions.length,
        workerId,
        serverId: match.serverId,
        traceId: match.traceId,
        players: Array.from(match.players.values()).map(p => ({
          userId: p.userId,
          username: p.username,
          firstName: p.firstName,
          lastName: p.lastName,
          socketId: p.socketId,
          score: p.score,
          currentQuestionIndex: p.currentQuestionIndex,
          isReady: p.isReady,
          hasSubmittedCurrent: p.hasSubmittedCurrent,
          answers: p.answers
        })),
        mode: match.mode
      };

      await this.redis.setex(`match:${matchId}`, 3600, JSON.stringify(matchState));
    } catch (error) {
      logError(`Worker ${workerId}: Failed to save match state`, error as Error);
    }
  }

  private sanitizeQuestion(question: any, timeLimit: number) {
    return {
      id: question.id,
      questionText: question.questionText,
      options: question.options.map((opt: any) => ({
        id: opt.id,
        optionText: opt.optionText
      })),
      timeLimit
    };
  }

  private getPlayerList(match: MatchRoom) {
    return Array.from(match.players.values()).map(p => ({
      userId: p.userId,
      username: p.username,
      firstName: p.firstName,
      lastName: p.lastName,
      isReady: p.isReady,
      score: p.score
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

  private async ensureDbMatch(match: MatchRoom): Promise<Match | null> {
    try {
      if (match.dbId !== undefined) {
        const cached = await Match.findByPk(match.dbId);
        if (cached) return cached;
      }

      // Race-safe: findOrCreate is atomic against the matches_matchid_uq unique
      // index ([M10]) - if a concurrent write inserts the row first, the losing
      // caller gets the existing row instead of a duplicate. Previously this was
      // findOne-then-create with no constraint, so both players' first answers
      // could each INSERT a row for the same matchId.
      const [row] = await Match.findOrCreate({
        where: { matchId: match.id },
        defaults: {
          matchId: match.id,
          quizId: match.quizId,
          type: 'FRIEND_MATCH' as any,
          status: match.status as any,
          maxPlayers: match.maxPlayers,
          startedAt: match.createdAt,
          mode: match.mode || (match.joinCode ? 'FRIEND' : 'AUTO')
        } as any
      });
      match.dbId = row.id;
      return row;
    } catch (error) {
      logError(`Worker ${workerId}: Failed to ensure Match row`, error as Error);
      return null;
    }
  }

  // Hot-path variant for the per-answer flow: once match.dbId is cached, this
  // resolves with ZERO database round trips. Before dbId is known, concurrent
  // callers (both players' first answers) share ONE in-flight ensureDbMatch via
  // match.dbIdPromise so exactly one create is issued, not one per caller ([M10]).
  private async ensureDbMatchId(match: MatchRoom): Promise<number | null> {
    if (match.dbId !== undefined) return match.dbId;
    if (!match.dbIdPromise) {
      match.dbIdPromise = this.ensureDbMatch(match)
        .then(m => (m ? m.id : null))
        .finally(() => { match.dbIdPromise = undefined; });
    }
    return match.dbIdPromise;
  }

  private async upsertDbPlayer(matchDbId: number, match: MatchRoom, userId: number) {
    const player = match.players.get(userId);
    if (!player) return;
    const correctAnswers = player.answers.filter(a => a.isCorrect).length;
    const totalTimeSpent = player.answers.reduce((sum, a) => sum + a.timeSpent, 0);
    // Race-safe against match_players_matchid_userid_uq ([M10]): findOrCreate
    // won't insert a second row for the same (matchId,userId); a losing racer
    // falls through to the update below.
    const [existing, created] = await MatchPlayerModel.findOrCreate({
      where: { matchId: matchDbId, userId },
      defaults: {
        matchId: matchDbId,
        userId,
        status: 'PLAYING',
        score: player.score,
        correctAnswers,
        timeSpent: totalTimeSpent,
        joinedAt: new Date()
      } as any
    });
    if (created) return;
    await existing.update({
      score: player.score,
      correctAnswers,
      timeSpent: totalTimeSpent
    } as any);
  }

  private async insertDbAnswer(params: {
    matchDbId: number;
    userId: number;
    questionId: number;
    questionIndex: number;
    selectedOptions: number[];
    correctOptions: number[];
    isCorrect: boolean;
    timeSpent: number;
    points: number;
  }) {
    try {
      await MatchAnswer.create({
        matchId: params.matchDbId,
        userId: params.userId,
        questionId: params.questionId,
        questionIndex: params.questionIndex,
        selectedOptions: params.selectedOptions,
        correctOptions: params.correctOptions,
        isCorrect: params.isCorrect,
        timeSpent: params.timeSpent,
        points: params.points,
        submittedAt: new Date()
      } as any);
    } catch (error) {
      logError(`Worker ${workerId}: Failed to insert MatchAnswer`, error as Error);
    }
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

  // Invoked when the master's own idle-match sweep (enhancedWorkerPool's
  // cleanupStaleMatches) decides a match is stale, so this worker's actual
  // match state gets torn down on the same signal instead of running an
  // independent, uncoordinated 5-minute timer against the same data.
  public async forceTerminateMatch(matchId: string) {
    const match = this.matches.get(matchId);
    if (!match) return;
    await this.terminateStaleMatch(matchId, match);
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

          case 'CLIENT_READY':
            await workerService.clientReady(message);
            break;

          case 'terminate_match':
            await workerService.forceTerminateMatch(message.matchId);
            break;

          case 'disconnect':
            // Player disconnected - handled by socket.io adapter
            logInfo(`Worker ${workerId}: Player disconnect event`, { userId: message.userId, matchId: message.matchId });
            break;

          case 'shutdown':
            logInfo(`Worker ${workerId}: Shutdown requested`);
            workerService.shutdown();
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
  workerService?.shutdown();
  process.exit(0);
});

process.on('SIGINT', () => {
  logInfo(`Worker ${workerId}: SIGINT received`);
  workerService?.shutdown();
  process.exit(0);
});

startWorker();