import { Response } from 'express';
import { quizAttemptService } from '../services/quizAttemptService';
import { AuthenticatedRequest } from '../middleware/auth';
import { logError } from '../utils/logger';

export const startQuizAttempt = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { quizId } = req.body;
    const userId = req.user?.id || 1; // Default to user ID 1 for testing

    const attempt = await quizAttemptService.startQuizAttempt({
      userId,
      quizId
    });

    res.status(201).json({
      success: true,
      data: { attempt },
      message: 'Quiz attempt started successfully'
    });
  } catch (error) {
    logError('Error starting quiz attempt', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to start quiz attempt',
      message: error instanceof Error ? error.message : 'An error occurred while starting the quiz'
    });
  }
};

export const submitAnswer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const attemptId = parseInt(req.params.attemptId);
    const { questionId, selectedOptions, timeSpent } = req.body;

    if (isNaN(attemptId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid attempt ID',
        message: 'Attempt ID must be a number'
      });
      return;
    }

    const result = await quizAttemptService.submitAnswer({
      attemptId,
      questionId,
      selectedOptions,
      timeSpent
    });

    res.json({
      success: true,
      data: result,
      message: 'Answer submitted successfully'
    });
  } catch (error) {
    logError('Error submitting answer', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit answer',
      message: error instanceof Error ? error.message : 'An error occurred while submitting the answer'
    });
  }
};

export const completeQuizAttempt = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const attemptId = parseInt(req.params.attemptId);
    const userId = req.user?.id || 1; // Default to user ID 1 for testing

    if (isNaN(attemptId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid attempt ID',
        message: 'Attempt ID must be a number'
      });
      return;
    }

    const result = await quizAttemptService.completeQuizAttempt({
      attemptId,
      userId
    });

    res.json({
      success: true,
      data: result,
      message: 'Quiz completed successfully'
    });
  } catch (error) {
    logError('Error completing quiz attempt', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete quiz',
      message: error instanceof Error ? error.message : 'An error occurred while completing the quiz'
    });
  }
};

export const getAttemptById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user?.id || 1; // Default to user ID 1 for testing

    if (isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid attempt ID',
        message: 'Attempt ID must be a number'
      });
      return;
    }

    const attempt = await quizAttemptService.getAttemptById(id, userId);
    if (!attempt) {
      res.status(404).json({
        success: false,
        error: 'Attempt not found',
        message: 'Quiz attempt not found or access denied'
      });
      return;
    }

    res.json({
      success: true,
      data: { attempt },
      message: 'Quiz attempt retrieved successfully'
    });
  } catch (error) {
    logError('Error fetching quiz attempt', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quiz attempt',
      message: 'An error occurred while fetching the quiz attempt'
    });
  }
};

export const getUserAttempts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || 1; // Default to user ID 1 for testing
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await quizAttemptService.getUserAttempts(userId, page, limit);

    res.json({
      success: true,
      data: result,
      message: 'User attempts retrieved successfully'
    });
  } catch (error) {
    logError('Error fetching user attempts', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attempts',
      message: 'An error occurred while fetching user attempts'
    });
  }
};

export const getLeaderboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const quizId = req.query.quizId ? parseInt(req.query.quizId as string) : undefined;
    const limit = parseInt(req.query.limit as string) || 10;

    const leaderboard = await quizAttemptService.getLeaderboard(quizId, limit);

    res.json({
      success: true,
      data: { leaderboard },
      message: 'Leaderboard retrieved successfully'
    });
  } catch (error) {
    logError('Error fetching leaderboard', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard',
      message: 'An error occurred while fetching the leaderboard'
    });
  }
};

export const getUserStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || 1; // Default to user ID 1 for testing
    const stats = await quizAttemptService.getUserStats(userId);

    res.json({
      success: true,
      data: stats,
      message: 'User statistics retrieved successfully'
    });
  } catch (error) {
    logError('Error fetching user stats', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user stats',
      message: 'An error occurred while fetching user statistics'
    });
  }
};
