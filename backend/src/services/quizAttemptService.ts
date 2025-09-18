import { QuizAttempt, Quiz, User, QuizAttemptAnswer, QuestionBankItem, QuestionBankOption, AttemptStatus } from '../models';
import { logInfo, logError } from '../utils/logger';
import { Op } from 'sequelize';

export interface StartQuizAttemptData {
  userId: number;
  quizId: number;
}

export interface SubmitAnswerData {
  attemptId: number;
  questionId: number;
  selectedOptions: number[];
  timeSpent?: number;
}

export interface CompleteQuizAttemptData {
  attemptId: number;
  userId: number;
}

export class QuizAttemptService {
  async startQuizAttempt(data: StartQuizAttemptData) {
    try {
      // Verify quiz exists and is active
      const quiz = await Quiz.findOne({
        where: { id: data.quizId, isActive: true }
      });

      if (!quiz) {
        throw new Error('Quiz not found or inactive');
      }

      // Create quiz attempt
      const attempt = await QuizAttempt.create({
        userId: data.userId,
        quizId: data.quizId,
        totalQuestions: 0, // Will be updated when questions are loaded
        status: AttemptStatus.IN_PROGRESS,
        startedAt: new Date()
      });

      logInfo('Quiz attempt started', { 
        attemptId: attempt.id, 
        userId: data.userId, 
        quizId: data.quizId 
      });

      return attempt;
    } catch (error) {
      logError('Failed to start quiz attempt', error as Error);
      throw error;
    }
  }

  async submitAnswer(data: SubmitAnswerData) {
    try {
      // Verify attempt exists and is in progress
      const attempt = await QuizAttempt.findByPk(data.attemptId, {
        include: [
          { model: Quiz, as: 'quiz' }
        ]
      });

      if (!attempt || attempt.status !== AttemptStatus.IN_PROGRESS) {
        throw new Error('Invalid attempt or attempt not in progress');
      }

      // Create answer record
      const answer = await QuizAttemptAnswer.create({
        attemptId: data.attemptId,
        questionId: data.questionId,
        selectedOptions: data.selectedOptions,
        isCorrect: false, // Will be calculated based on correct answers
        submittedAt: new Date()
      });

      logInfo('Answer submitted', { 
        attemptId: data.attemptId, 
        questionId: data.questionId 
      });

      return answer;
    } catch (error) {
      logError('Failed to submit answer', error as Error);
      throw error;
    }
  }

  async completeQuizAttempt(data: CompleteQuizAttemptData) {
    try {
      // Get attempt with answers
      const attempt = await QuizAttempt.findOne({
        where: { 
          id: data.attemptId, 
          userId: data.userId 
        },
        include: [
          { model: QuizAttemptAnswer, as: 'answers' }
        ]
      });

      if (!attempt) {
        throw new Error('Attempt not found');
      }

      // Calculate score (simplified)
      const totalQuestions = attempt.totalQuestions || 0;
      const correctAnswers = 0; // TODO: Calculate based on correct answers
      const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

      // Update attempt
      await QuizAttempt.update({
        status: AttemptStatus.COMPLETED,
        completedAt: new Date(),
        score,
        correctAnswers
      }, {
        where: { id: data.attemptId }
      });

      logInfo('Quiz attempt completed', { 
        attemptId: data.attemptId, 
        score 
      });

      return { score, correctAnswers, totalQuestions };
    } catch (error) {
      logError('Failed to complete quiz attempt', error as Error);
      throw error;
    }
  }

  async getAttemptById(id: number, userId: number) {
    try {
      const attempt = await QuizAttempt.findOne({
        where: { id, userId },
        include: [
          { model: Quiz, as: 'quiz' },
          { model: User, as: 'user', attributes: ['id', 'username'] },
          { model: QuizAttemptAnswer, as: 'answers' }
        ]
      });

      return attempt;
    } catch (error) {
      logError('Failed to get attempt by ID', error as Error);
      throw error;
    }
  }

  async getUserAttempts(userId: number, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      
      const [attempts, total] = await Promise.all([
        QuizAttempt.findAll({
          where: { userId },
          include: [
            { model: Quiz, as: 'quiz' }
          ],
          order: [['createdAt', 'DESC']],
          offset: skip,
          limit
        }),
        QuizAttempt.count({ where: { userId } })
      ]);

      return {
        attempts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logError('Failed to get user attempts', error as Error);
      throw error;
    }
  }

  async getLeaderboard(quizId?: number, limit = 10) {
    try {
      const where: any = { status: AttemptStatus.COMPLETED };
      
      if (quizId) {
        where.quizId = quizId;
      }

      const attempts = await QuizAttempt.findAll({
        where,
        include: [
          { model: User, as: 'user', attributes: ['id', 'username'] },
          { model: Quiz, as: 'quiz', attributes: ['id', 'title'] }
        ],
        order: [['score', 'DESC']],
        limit
      });

      return attempts;
    } catch (error) {
      logError('Failed to get leaderboard', error as Error);
      throw error;
    }
  }

  async getUserStats(userId: number) {
    try {
      const [totalAttempts, completedAttempts, avgScore] = await Promise.all([
        QuizAttempt.count({ where: { userId } }),
        QuizAttempt.count({ 
          where: { 
            userId, 
            status: AttemptStatus.COMPLETED 
          } 
        }),
        QuizAttempt.findOne({
          where: { 
            userId, 
            status: AttemptStatus.COMPLETED 
          },
          attributes: [
            [QuizAttempt.sequelize!.fn('AVG', QuizAttempt.sequelize!.col('score')), 'avgScore']
          ]
        })
      ]);

      return {
        totalAttempts,
        completedAttempts,
        averageScore: avgScore ? parseFloat((avgScore as any).dataValues.avgScore) || 0 : 0
      };
    } catch (error) {
      logError('Failed to get user stats', error as Error);
      throw error;
    }
  }
}

export const quizAttemptService = new QuizAttemptService();
