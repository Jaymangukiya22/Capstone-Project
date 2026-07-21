import { Response } from 'express';
import { quizService } from '../services/quizService';
import { AuthenticatedRequest } from '../middleware/auth';
import { logError } from '../utils/logger';
import { QuizQuestion } from '../models/QuizQuestion';
import { QuestionBankItem } from '../models/QuestionBankItem';
import { QuestionBankOption } from '../models/QuestionBankOption';
import { Op } from 'sequelize';

export const createQuiz = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, description, tags, difficulty, timeLimit, maxQuestions, categoryId } = req.body;
    const createdById = req.user?.id || 1; // Default to user ID 1 for testing

    const quiz = await quizService.createQuiz({
      title,
      description,
      tags,
      difficulty,
      timeLimit,
      maxQuestions,
      categoryId,
      createdById
    });

    res.status(201).json({
      success: true,
      data: quiz,
      message: 'Quiz created successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Category with ID')) {
      res.status(404).json({
        success: false,
        error: 'CATEGORY_NOT_FOUND',
        message: 'Selected category was not found. Please choose a different category.'
      });
      return;
    }
    logError('Error creating quiz', error as Error);
    res.status(500).json({
      success: false,
      error: 'QUIZ_CREATE_FAILED',
      message: 'An error occurred while creating the quiz'
    });
  }
};

export const assignQuestionsToQuiz = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const quizId = parseInt(req.params.id);
    const { questionIds } = req.body;

    if (isNaN(quizId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid quiz ID',
        message: 'Quiz ID must be a number'
      });
      return;
    }

    const result = await quizService.assignQuestionsToQuiz({
      quizId,
      questionIds
    });

    res.json({
      success: true,
      data: result,
      message: 'Questions assigned to quiz successfully'
    });
  } catch (error) {
    logError('Error assigning questions to quiz', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign questions',
      message: 'An error occurred while assigning questions to quiz'
    });
  }
};

export const searchQuizzes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const q = req.query.q as string | undefined;
    const includeQuestions = req.query.includeQuestions === 'true';

    if (req.path === '/search' && (!q || q.trim().length === 0)) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Please enter a search term.'
      });
      return;
    }

    // Handle tags parameter - can be a single string or comma-separated string
    let tags: string | string[] | undefined;
    if (req.query.tags) {
      const tagsParam = req.query.tags as string;
      tags = tagsParam.includes(',') ? tagsParam.split(',').map(t => t.trim()) : tagsParam;
    }

    const filters = {
      difficulty: req.query.difficulty as any,
      categoryId: req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined,
      search: (q || (req.query.search as string)) as string,
      tags,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20
    };

    const result = await quizService.searchQuizzes(filters);

    if (includeQuestions && result.quizzes.length > 0) {
      const quizIds = result.quizzes.map((quiz: any) => quiz.id);
      const quizQuestions = await QuizQuestion.findAll({
        where: { quizId: { [Op.in]: quizIds } },
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
        order: [['orderIndex', 'ASC']]
      });

      const questionsByQuizId = new Map<number, any[]>();
      for (const qq of quizQuestions as any[]) {
        const existing = questionsByQuizId.get(qq.quizId) || [];
        existing.push({
          id: qq.question.id,
          questionId: qq.questionId,
          order: qq.orderIndex,
          questionText: qq.question.questionText,
          difficulty: qq.question.difficulty,
          categoryId: qq.question.categoryId,
          options: (qq.question.options || []).map((opt: any) => ({
            id: opt.id,
            optionText: opt.optionText,
            isCorrect: opt.isCorrect,
          })),
        });
        questionsByQuizId.set(qq.quizId, existing);
      }

      result.quizzes = result.quizzes.map((quiz: any) => ({
        ...quiz.toJSON(),
        questions: questionsByQuizId.get(quiz.id) || [],
      }));
    }

    if (req.path === '/search') {
      res.json({
        success: true,
        data: result.quizzes
      });
      return;
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logError('Error searching quizzes', error as Error);
    res.status(500).json({
      success: false,
      error: 'QUIZ_SEARCH_FAILED',
      message: 'An error occurred while searching quizzes'
    });
  }
};

export const getQuizById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid quiz ID',
        message: 'Quiz ID must be a number'
      });
      return;
    }

    const quiz = await quizService.getQuizById(id);

    res.json({
      success: true,
      data: quiz,
      message: 'Quiz retrieved successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Quiz not found') {
      const id = parseInt(req.params.id);
      res.status(404).json({
        success: false,
        error: 'Quiz not found',
        message: `Quiz with ID ${id} does not exist`
      });
      return;
    }
    logError('Error fetching quiz', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quiz',
      message: 'An error occurred while fetching the quiz'
    });
  }
};

export const getQuizForPlay = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user?.id || 1; // Default to user ID 1 for testing

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid quiz ID',
        message: 'Quiz ID must be a number'
      });
      return;
    }

    const quiz = await quizService.getQuizForPlay(id, userId);

    res.json({
      success: true,
      data: quiz,
      message: 'Quiz retrieved for play successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Quiz not found or not active') {
      const id = parseInt(req.params.id);
      res.status(404).json({
        success: false,
        error: 'QUIZ_NOT_FOUND',
        message: `Quiz with ID ${id} does not exist.`
      });
      return;
    }
    logError('Error fetching quiz for play', error as Error);
    res.status(500).json({
      success: false,
      error: 'QUIZ_FETCH_FAILED',
      message: 'Could not load this quiz right now. Please try again.'
    });
  }
};

export const updateQuiz = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Quiz ID must be a number.'
      });
      return;
    }

    const quiz = await quizService.updateQuiz(id, req.body);

    res.json({
      success: true,
      data: quiz,
      message: 'Quiz updated successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Quiz not found') {
      const id = parseInt(req.params.id);
      res.status(404).json({
        success: false,
        error: 'QUIZ_NOT_FOUND',
        message: `Quiz with ID ${id} does not exist.`
      });
      return;
    }
    logError('Error updating quiz', error as Error);
    res.status(500).json({
      success: false,
      error: 'QUIZ_UPDATE_FAILED',
      message: 'Could not update the quiz right now. Please try again.'
    });
  }
};

export const deleteQuiz = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Quiz ID must be a number.'
      });
      return;
    }

    await quizService.deleteQuiz(id);

    res.json({
      success: true,
      message: 'Quiz deleted successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Quiz not found') {
      const id = parseInt(req.params.id);
      res.status(404).json({
        success: false,
        error: 'QUIZ_NOT_FOUND',
        message: `Quiz with ID ${id} does not exist.`
      });
      return;
    }
    logError('Error deleting quiz', error as Error);
    res.status(500).json({
      success: false,
      error: 'QUIZ_DELETE_FAILED',
      message: 'Could not delete the quiz right now. Please try again.'
    });
  }
};

export const getQuizStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Quiz ID must be a number.'
      });
      return;
    }

    const stats = await quizService.getQuizStats(id);

    res.json({
      success: true,
      data: stats,
      message: 'Quiz statistics retrieved successfully'
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Quiz not found') {
      const id = parseInt(req.params.id);
      res.status(404).json({
        success: false,
        error: 'QUIZ_NOT_FOUND',
        message: `Quiz with ID ${id} does not exist.`
      });
      return;
    }
    logError('Error fetching quiz stats', error as Error);
    res.status(500).json({
      success: false,
      error: 'QUIZ_STATS_FETCH_FAILED',
      message: 'Could not load quiz statistics right now. Please try again.'
    });
  }
};

export const getPopularQuizzes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const quizzes = await quizService.getPopularQuizzes(limit);

    res.json({
      success: true,
      data: { quizzes },
      message: 'Popular quizzes retrieved successfully'
    });
  } catch (error) {
    logError('Error fetching popular quizzes', error as Error);
    res.status(500).json({
      success: false,
      error: 'POPULAR_QUIZZES_FETCH_FAILED',
      message: 'Could not load popular quizzes right now. Please try again.'
    });
  }
};
