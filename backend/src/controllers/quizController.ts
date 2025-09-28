import { Response } from 'express';
import { quizService } from '../services/quizService';
import { AuthenticatedRequest } from '../middleware/auth';
import { logError } from '../utils/logger';

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
      data: { quiz },
      message: 'Quiz created successfully'
    });
  } catch (error) {
    logError('Error creating quiz', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to create quiz',
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
    // Handle tags parameter - can be a single string or comma-separated string
    let tags: string | string[] | undefined;
    if (req.query.tags) {
      const tagsParam = req.query.tags as string;
      tags = tagsParam.includes(',') ? tagsParam.split(',').map(t => t.trim()) : tagsParam;
    }

    const filters = {
      difficulty: req.query.difficulty as any,
      categoryId: req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined,
      search: req.query.search as string,
      tags,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20
    };

    const result = await quizService.searchQuizzes(filters);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logError('Error searching quizzes', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to search quizzes',
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
    if (!quiz) {
      res.status(404).json({
        success: false,
        error: 'Quiz not found',
        message: `Quiz with ID ${id} does not exist`
      });
      return;
    }

    res.json({
      success: true,
      data: { quiz },
      message: 'Quiz retrieved successfully'
    });
  } catch (error) {
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
    if (!quiz) {
      res.status(404).json({
        success: false,
        error: 'Quiz not found',
        message: `Quiz with ID ${id} does not exist`
      });
      return;
    }

    res.json({
      success: true,
      data: { quiz },
      message: 'Quiz retrieved for play successfully'
    });
  } catch (error) {
    logError('Error fetching quiz for play', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quiz',
      message: 'An error occurred while fetching the quiz'
    });
  }
};

export const updateQuiz = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const quiz = await quizService.updateQuiz(id, req.body);

    res.json({
      success: true,
      data: { quiz },
      message: 'Quiz updated successfully'
    });
  } catch (error) {
    logError('Error updating quiz', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to update quiz',
      message: 'An error occurred while updating the quiz'
    });
  }
};

export const deleteQuiz = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    await quizService.deleteQuiz(id);

    res.json({
      success: true,
      message: 'Quiz deleted successfully'
    });
  } catch (error) {
    logError('Error deleting quiz', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete quiz',
      message: 'An error occurred while deleting the quiz'
    });
  }
};

export const getQuizStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const stats = await quizService.getQuizStats(id);
    if (!stats) {
      res.status(404).json({
        success: false,
        error: 'Quiz not found',
        message: `Quiz with ID ${id} does not exist`
      });
      return;
    }

    res.json({
      success: true,
      data: { stats },
      message: 'Quiz statistics retrieved successfully'
    });
  } catch (error) {
    logError('Error fetching quiz stats', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quiz stats',
      message: 'An error occurred while fetching quiz statistics'
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
      error: 'Failed to fetch popular quizzes',
      message: 'An error occurred while fetching popular quizzes'
    });
  }
};
