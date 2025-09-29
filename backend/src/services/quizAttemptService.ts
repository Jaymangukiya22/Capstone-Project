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
        timeSpent: data.timeSpent || 0,
        isCorrect: false, // Will be calculated when quiz is completed
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
      // Get attempt with answers and quiz questions
      const attempt = await QuizAttempt.findOne({
        where: { 
          id: data.attemptId, 
          userId: data.userId 
        },
        include: [
          { 
            model: QuizAttemptAnswer, 
            as: 'answers',
            include: [
              {
                model: QuestionBankItem,
                as: 'question',
                include: [
                  {
                    model: QuestionBankOption,
                    as: 'options'
                  }
                ]
              }
            ]
          },
          { model: Quiz, as: 'quiz' }
        ]
      });

      if (!attempt) {
        throw new Error('Attempt not found');
      }

      // Calculate correct answers
      let correctAnswers = 0;
      let totalQuestions = 0;
      let totalTimeSpent = 0;

      for (const answer of attempt.answers) {
        totalQuestions++;
        
        // Get correct option IDs for this question
        const correctOptionIds = answer.question.options
          .filter(opt => opt.isCorrect)
          .map(opt => opt.id);

        // Check if user's selected options match correct options
        const userSelectedIds = answer.selectedOptions || [];
        const isCorrect = correctOptionIds.length === userSelectedIds.length &&
          correctOptionIds.every(id => userSelectedIds.includes(id));

        if (isCorrect) {
          correctAnswers++;
        }

        // Update the answer record with correct/incorrect flag
        await QuizAttemptAnswer.update({
          isCorrect
        }, {
          where: { id: answer.id }
        });

        // Add time spent (if available)
        totalTimeSpent += answer.timeSpent || 0;
      }

      const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

      // Update attempt with final results
      await QuizAttempt.update({
        status: AttemptStatus.COMPLETED,
        completedAt: new Date(),
        score,
        correctAnswers,
        totalQuestions,
        timeSpent: totalTimeSpent
      }, {
        where: { id: data.attemptId }
      });

      logInfo('Quiz attempt completed', { 
        attemptId: data.attemptId, 
        score,
        correctAnswers,
        totalQuestions,
        timeSpent: totalTimeSpent
      });

      // Return the updated attempt data
      const completedAttempt = await QuizAttempt.findByPk(data.attemptId, {
        include: [
          { model: Quiz, as: 'quiz' },
          { model: QuizAttemptAnswer, as: 'answers' }
        ]
      });

      return completedAttempt;
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
