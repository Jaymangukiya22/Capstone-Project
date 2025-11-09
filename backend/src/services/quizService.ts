import { Quiz, Category, User, Difficulty, QuestionBankItem, QuizQuestion, QuestionBankOption } from '../models';
import { logInfo, logError } from '../utils/logger';
import { Op } from 'sequelize';

export interface CreateQuizData {
  title: string;
  description?: string;
  tags?: string[];
  difficulty?: Difficulty;
  timeLimit?: number;
  maxQuestions?: number;
  categoryId: number;
  createdById: number;
}

export interface AssignQuestionsData {
  quizId: number;
  questionIds: number[];
}

export interface QuizSearchFilters {
  difficulty?: Difficulty;
  categoryId?: number;
  search?: string;
  tags?: string | string[];
  page?: number;
  limit?: number;
}

export class QuizService {
  async createQuiz(quizData: CreateQuizData) {
    try {
      // Verify category exists
      const category = await Category.findByPk(quizData.categoryId);

      if (!category) {
        throw new Error(`Category with ID ${quizData.categoryId} not found`);
      }

      const quiz = await Quiz.create({
        title: quizData.title,
        description: quizData.description,
        tags: quizData.tags || [],
        difficulty: quizData.difficulty || 'MEDIUM',
        timeLimit: quizData.timeLimit,
        maxQuestions: quizData.maxQuestions,
        categoryId: quizData.categoryId,
        createdById: quizData.createdById
      });

      // Fetch the created quiz with associations
      const createdQuiz = await Quiz.findByPk(quiz.id, {
        include: [
          { model: Category, as: 'category' },
          { 
            model: User, 
            as: 'createdBy',
            attributes: ['id', 'username']
          }
        ]
      });

      logInfo('Quiz created', { quizId: quiz.id, title: quiz.title });
      return createdQuiz;
    } catch (error) {
      logError('Failed to create quiz', error as Error, { title: quizData.title });
      throw error;
    }
  }

  async assignQuestionsToQuiz(data: AssignQuestionsData) {
    try {
      // Verify quiz exists and get its category
      const quiz = await Quiz.findByPk(data.quizId, {
        include: [{ model: Category, as: 'category' }]
      });

      if (!quiz) {
        throw new Error('Quiz not found');
      }

      // Verify all questions exist
      const questions = await QuestionBankItem.findAll({
        where: {
          id: { [Op.in]: data.questionIds },
          isActive: true
        }
      });

      if (questions.length !== data.questionIds.length) {
        throw new Error('Some questions not found or inactive');
      }

      // Remove existing question assignments
      await QuizQuestion.destroy({
        where: { quizId: data.quizId }
      });

      // Create new assignments
      const assignments = await QuizQuestion.bulkCreate(
        data.questionIds.map((questionId, index) => ({
          quizId: data.quizId,
          questionId,
          order: index + 1
        }))
      );

      // Also update questions to belong to the quiz's category (if not already assigned)
      const questionsToUpdate = questions.filter(q => !q.categoryId);
      if (questionsToUpdate.length > 0 && quiz.categoryId) {
        await QuestionBankItem.update(
          { categoryId: quiz.categoryId },
          { 
            where: { 
              id: { [Op.in]: questionsToUpdate.map(q => q.id) },
              categoryId: null // Only update questions without category
            }
          }
        );
        
        logInfo('Questions also assigned to quiz category', { 
          quizId: data.quizId, 
          categoryId: quiz.categoryId,
          questionsUpdated: questionsToUpdate.length 
        });
      }

      logInfo('Questions assigned to quiz', { 
        quizId: data.quizId, 
        questionsAssigned: assignments.length 
      });

      return assignments;
    } catch (error) {
      logError('Failed to assign questions to quiz', error as Error);
      throw error;
    }
  }

  async searchQuizzes(filters: QuizSearchFilters) {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;
      
      const where: any = { isActive: true };

      if (filters.difficulty) {
        where.difficulty = filters.difficulty;
      }

      if (filters.categoryId) {
        where.categoryId = filters.categoryId;
      }

      if (filters.search) {
        where[Op.or] = [
          { title: { [Op.iLike]: `%${filters.search}%` } },
          { description: { [Op.iLike]: `%${filters.search}%` } }
        ];
      }

      // Tag-based filtering with optimized JSON queries
      if (filters.tags) {
        const tagArray = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
        // PostgreSQL JSON array contains any of the specified tags
        where[Op.and] = tagArray.map(tag => ({
          tags: { [Op.contains]: [tag] }
        }));
      }

      const [quizzes, total] = await Promise.all([
        Quiz.findAll({
          where,
          include: [
            { model: Category, as: 'category' },
            { 
              model: User, 
              as: 'createdBy',
              attributes: ['id', 'username']
            }
          ],
          order: [['createdAt', 'DESC']],
          offset: skip,
          limit
        }),
        Quiz.count({ where })
      ]);

      return {
        quizzes,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logError('Failed to search quizzes', error as Error);
      throw error;
    }
  }

  async getQuizById(id: number) {
    try {
      const quiz = await Quiz.findOne({
        where: { id, isActive: true },
        include: [
          { model: Category, as: 'category' },
          { 
            model: User, 
            as: 'createdBy',
            attributes: ['id', 'username']
          }
        ]
      });

      if (!quiz) {
        logInfo('Quiz not found', { quizId: id });
        return null;
      }

      // Get questions assigned to this quiz
      const quizQuestions = await QuizQuestion.findAll({
        where: { quizId: id },
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
        ],
        order: [['order', 'ASC']]
      });

      // Transform questions to include in the response
      const questions = quizQuestions.map(qq => ({
        id: qq.question.id,
        questionId: qq.questionId,
        order: qq.order,
        questionText: qq.question.questionText,
        difficulty: qq.question.difficulty,
        categoryId: qq.question.categoryId,
        options: qq.question.options.map(opt => ({
          id: opt.id,
          optionText: opt.optionText,
          isCorrect: opt.isCorrect
        }))
      }));

      logInfo('Retrieved quiz by ID with questions', { quizId: id, questionCount: questions.length });

      return {
        ...quiz.toJSON(),
        questions
      };
    } catch (error) {
      logError('Failed to retrieve quiz', error as Error, { quizId: id });
      throw error;
    }
  }

  async getQuizForPlay(id: number, userId: number) {
    try {
      const quiz = await Quiz.findOne({
        where: { id, isActive: true },
        include: [
          { model: Category, as: 'category' }
        ]
      });

      if (!quiz) {
        throw new Error('Quiz not found');
      }

      // Get questions assigned to this quiz
      const quizQuestions = await QuizQuestion.findAll({
        where: { quizId: id },
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
        ],
        order: [['order', 'ASC']]
      });

      // Transform questions to the expected format
      const questions = quizQuestions.map(qq => {
        // Ensure exactly 4 options
        const options = qq.question.options.slice(0, 4);
        
        if (options.length !== 4) {
          logError('Question does not have exactly 4 options', new Error('Invalid question format'), { 
            questionId: qq.question.id, 
            optionCount: options.length 
          });
        }

        return {
          id: qq.question.id,
          questionText: qq.question.questionText,
          difficulty: qq.question.difficulty,
          options: options.map(opt => ({
            id: opt.id,
            optionText: opt.optionText,
            isCorrect: opt.isCorrect
          }))
        };
      });

      // Record quiz access for analytics
      logInfo('Quiz accessed for play', { quizId: id, userId, questionCount: questions.length });

      return {
        ...quiz.toJSON(),
        questions
      };
    } catch (error) {
      logError('Failed to get quiz for play', error as Error, { quizId: id, userId });
      throw error;
    }
  }

  async updateQuiz(id: number, data: Partial<CreateQuizData>) {
    try {
      // Check if quiz exists
      const existingQuiz = await Quiz.findByPk(id);

      if (!existingQuiz) {
        throw new Error('Quiz not found');
      }

      // Update the quiz
      await Quiz.update({
        title: data.title,
        description: data.description,
        tags: data.tags,
        difficulty: data.difficulty,
        timeLimit: data.timeLimit,
        maxQuestions: data.maxQuestions,
        categoryId: data.categoryId
      }, {
        where: { id }
      });

      // Fetch updated quiz with associations
      const updatedQuiz = await Quiz.findByPk(id, {
        include: [
          { model: Category, as: 'category' },
          { 
            model: User, 
            as: 'createdBy',
            attributes: ['id', 'username']
          }
        ]
      });

      logInfo('Quiz updated', { quizId: id });
      return updatedQuiz;
    } catch (error) {
      logError('Failed to update quiz', error as Error, { quizId: id });
      throw error;
    }
  }

  async deleteQuiz(id: number): Promise<boolean> {
    try {
      await Quiz.update(
        { isActive: false },
        { where: { id } }
      );

      logInfo('Quiz deleted (soft delete)', { quizId: id });
      return true;
    } catch (error) {
      logError('Failed to delete quiz', error as Error, { quizId: id });
      throw error;
    }
  }

  async getQuizStats(id: number) {
    try {
      const quiz = await Quiz.findByPk(id, {
        include: [
          { model: Category, as: 'category' }
        ]
      });

      if (!quiz) {
        throw new Error('Quiz not found');
      }

      // TODO: Add actual statistics calculation
      const stats = {
        totalAttempts: 0,
        averageScore: 0,
        completionRate: 0,
        popularityRank: 0
      };

      logInfo('Retrieved quiz stats', { quizId: id });
      return {
        quiz,
        stats
      };
    } catch (error) {
      logError('Failed to get quiz stats', error as Error, { quizId: id });
      throw error;
    }
  }

  async getPopularQuizzes(limit = 10) {
    try {
      const quizzes = await Quiz.findAll({
        where: { isActive: true },
        include: [
          { model: Category, as: 'category' },
          { 
            model: User, 
            as: 'createdBy',
            attributes: ['id', 'username']
          }
        ],
        order: [['createdAt', 'DESC']], // TODO: Order by popularity when we have that data
        limit
      });

      return quizzes;
    } catch (error) {
      logError('Failed to get popular quizzes', error as Error);
      throw error;
    }
  }
}

export const quizService = new QuizService();
