import { createClient } from 'redis';
import { v4 as uuidv4 } from 'uuid';
import { 
  Match, 
  Player, 
  Quiz, 
  Question,
  MatchStatus, 
  PlayerAnswer 
} from '@/types/match.types';

export class MatchService {
  private matches: Map<string, Match> = new Map();
  private redisClient: any;

  constructor() {
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    this.redisClient.connect();
  }

  /**
   * Create a new match
   */
  async createMatch(quiz: Quiz, player1Id: string, player2Id: string): Promise<string> {
    const matchId = uuidv4();
    
    const match: Match = {
      id: matchId,
      quizId: quiz.id,
      quiz,
      players: new Map(),
      status: MatchStatus.WAITING,
      currentQuestionIndex: 0,
      createdAt: new Date(),
    };

    // Initialize players
    const player1: Player = {
      id: player1Id,
      username: '', // Will be set when player joins
      rating: 1200,
      isReady: false,
      isConnected: false,
      score: 0,
      answers: new Map(),
    };

    const player2: Player = {
      id: player2Id,
      username: '', // Will be set when player joins
      rating: 1200,
      isReady: false,
      isConnected: false,
      score: 0,
      answers: new Map(),
    };

    match.players.set(player1Id, player1);
    match.players.set(player2Id, player2);

    this.matches.set(matchId, match);

    // Store in Redis for persistence
    await this.redisClient.setEx(
      `match:${matchId}`, 
      3600, // 1 hour TTL
      JSON.stringify(this.serializeMatch(match))
    );

    return matchId;
  }

  /**
   * Get match by ID
   */
  getMatch(matchId: string): Match | undefined {
    return this.matches.get(matchId);
  }

  /**
   * Add player to match
   */
  async joinMatch(matchId: string, playerId: string, playerData: Partial<Player>): Promise<boolean> {
    const match = this.matches.get(matchId);
    if (!match) return false;

    const player = match.players.get(playerId);
    if (!player) return false;

    // Update player data
    Object.assign(player, playerData, { isConnected: true });
    
    await this.updateMatchInRedis(match);
    return true;
  }

  /**
   * Remove player from match
   */
  async leaveMatch(matchId: string, playerId: string): Promise<boolean> {
    const match = this.matches.get(matchId);
    if (!match) return false;

    const player = match.players.get(playerId);
    if (!player) return false;

    player.isConnected = false;

    // If match hasn't started and player leaves, cancel match
    if (match.status === MatchStatus.WAITING) {
      match.status = MatchStatus.CANCELLED;
    }

    await this.updateMatchInRedis(match);
    return true;
  }

  /**
   * Set player ready status
   */
  async setPlayerReady(matchId: string, playerId: string, isReady: boolean): Promise<boolean> {
    const match = this.matches.get(matchId);
    if (!match) return false;

    const player = match.players.get(playerId);
    if (!player) return false;

    player.isReady = isReady;

    // Check if all players are ready to start match
    const allReady = Array.from(match.players.values()).every(p => p.isReady && p.isConnected);
    
    if (allReady && match.status === MatchStatus.WAITING) {
      match.status = MatchStatus.STARTING;
      // Start countdown will be handled by the WebSocket server
    }

    await this.updateMatchInRedis(match);
    return true;
  }

  /**
   * Start match
   */
  async startMatch(matchId: string): Promise<boolean> {
    const match = this.matches.get(matchId);
    if (!match || match.status !== MatchStatus.STARTING) return false;

    match.status = MatchStatus.IN_PROGRESS;
    match.startedAt = new Date();
    
    await this.startNextQuestion(matchId);
    return true;
  }

  /**
   * Start next question
   */
  async startNextQuestion(matchId: string): Promise<Question | null> {
    const match = this.matches.get(matchId);
    if (!match) return null;

    if (match.currentQuestionIndex >= match.quiz.questions.length) {
      // No more questions, end match
      await this.endMatch(matchId);
      return null;
    }

    const question = match.quiz.questions[match.currentQuestionIndex];
    match.status = MatchStatus.QUESTION_ACTIVE;
    match.currentQuestionStartTime = new Date();

    await this.updateMatchInRedis(match);
    return question;
  }

  /**
   * Submit answer for a question
   */
  async submitAnswer(
    matchId: string, 
    playerId: string, 
    questionId: string, 
    optionId: string | undefined, 
    timeSpent: number
  ): Promise<boolean> {
    const match = this.matches.get(matchId);
    if (!match || match.status !== MatchStatus.QUESTION_ACTIVE) return false;

    const player = match.players.get(playerId);
    if (!player) return false;

    const question = match.quiz.questions[match.currentQuestionIndex];
    if (question.id !== questionId) return false;

    // Check if player already answered this question
    if (player.answers.has(questionId)) return false;

    // Find correct option
    const correctOption = question.options.find(opt => opt.isCorrect);
    const isCorrect = optionId === correctOption?.id;

    // Calculate points based on correctness and speed
    let points = 0;
    if (isCorrect) {
      const maxTime = question.timeLimit * 1000; // Convert to milliseconds
      const timeBonus = Math.max(0, (maxTime - timeSpent) / maxTime);
      points = Math.round(question.points * (0.5 + 0.5 * timeBonus)); // 50% base + 50% time bonus
    }

    const answer: PlayerAnswer = {
      questionId,
      optionId,
      timeSpent,
      points,
      isCorrect,
      answeredAt: new Date(),
    };

    player.answers.set(questionId, answer);
    player.score += points;

    await this.updateMatchInRedis(match);
    return true;
  }

  /**
   * End current question and show results
   */
  async endQuestion(matchId: string): Promise<boolean> {
    const match = this.matches.get(matchId);
    if (!match || match.status !== MatchStatus.QUESTION_ACTIVE) return false;

    match.status = MatchStatus.QUESTION_RESULTS;
    match.currentQuestionIndex++;

    await this.updateMatchInRedis(match);
    return true;
  }

  /**
   * End match and calculate final results
   */
  async endMatch(matchId: string): Promise<boolean> {
    const match = this.matches.get(matchId);
    if (!match) return false;

    match.status = MatchStatus.COMPLETED;
    match.completedAt = new Date();

    await this.updateMatchInRedis(match);
    
    // Clean up match from memory after some time
    setTimeout(() => {
      this.matches.delete(matchId);
    }, 300000); // 5 minutes

    return true;
  }

  /**
   * Get match results
   */
  getMatchResults(matchId: string) {
    const match = this.matches.get(matchId);
    if (!match) return null;

    const results = Array.from(match.players.values()).map(player => {
      const correctAnswers = Array.from(player.answers.values()).filter(a => a.isCorrect).length;
      const totalAnswers = player.answers.size;
      const totalTime = Array.from(player.answers.values()).reduce((sum, a) => sum + a.timeSpent, 0);
      const averageTime = totalAnswers > 0 ? totalTime / totalAnswers : 0;

      return {
        playerId: player.id,
        username: player.username,
        score: player.score,
        correctAnswers,
        totalAnswers,
        averageTime: Math.round(averageTime),
      };
    });

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    return {
      matchId,
      results,
      winner: results.length > 0 ? results[0].playerId : undefined,
    };
  }

  /**
   * Get current question results
   */
  getCurrentQuestionResults(matchId: string) {
    const match = this.matches.get(matchId);
    if (!match) return null;

    const currentQuestion = match.quiz.questions[match.currentQuestionIndex - 1];
    if (!currentQuestion) return null;

    const correctOption = currentQuestion.options.find(opt => opt.isCorrect);
    
    const results = Array.from(match.players.values()).map(player => {
      const answer = player.answers.get(currentQuestion.id);
      return {
        playerId: player.id,
        optionId: answer?.optionId,
        timeSpent: answer?.timeSpent || 0,
        points: answer?.points || 0,
        isCorrect: answer?.isCorrect || false,
      };
    });

    const scores = Array.from(match.players.values()).map(player => ({
      playerId: player.id,
      score: player.score,
    }));

    return {
      questionId: currentQuestion.id,
      correctOptionId: correctOption?.id,
      results,
      scores,
    };
  }

  /**
   * Check if all players have answered current question
   */
  allPlayersAnswered(matchId: string): boolean {
    const match = this.matches.get(matchId);
    if (!match) return false;

    const currentQuestion = match.quiz.questions[match.currentQuestionIndex];
    if (!currentQuestion) return false;

    return Array.from(match.players.values())
      .filter(p => p.isConnected)
      .every(p => p.answers.has(currentQuestion.id));
  }

  /**
   * Get connected players count
   */
  getConnectedPlayersCount(matchId: string): number {
    const match = this.matches.get(matchId);
    if (!match) return 0;

    return Array.from(match.players.values()).filter(p => p.isConnected).length;
  }

  /**
   * Serialize match for Redis storage
   */
  private serializeMatch(match: Match): any {
    return {
      ...match,
      players: Array.from(match.players.entries()).map(([id, player]) => [
        id,
        {
          ...player,
          answers: Array.from(player.answers.entries()),
        },
      ]),
    };
  }

  /**
   * Update match in Redis
   */
  private async updateMatchInRedis(match: Match): Promise<void> {
    await this.redisClient.setEx(
      `match:${match.id}`,
      3600,
      JSON.stringify(this.serializeMatch(match))
    );
  }

  /**
   * Load match from Redis
   */
  async loadMatchFromRedis(matchId: string): Promise<Match | null> {
    try {
      const data = await this.redisClient.get(`match:${matchId}`);
      if (!data) return null;

      const matchData = JSON.parse(data);
      
      // Reconstruct Map objects
      const players = new Map();
      matchData.players.forEach(([id, playerData]: [string, any]) => {
        const answers = new Map(playerData.answers);
        players.set(id, { ...playerData, answers });
      });

      const match: Match = {
        ...matchData,
        players,
        createdAt: new Date(matchData.createdAt),
        startedAt: matchData.startedAt ? new Date(matchData.startedAt) : undefined,
        completedAt: matchData.completedAt ? new Date(matchData.completedAt) : undefined,
        currentQuestionStartTime: matchData.currentQuestionStartTime 
          ? new Date(matchData.currentQuestionStartTime) 
          : undefined,
      };

      this.matches.set(matchId, match);
      return match;
    } catch (error) {
      console.error('Error loading match from Redis:', error);
      return null;
    }
  }
}
