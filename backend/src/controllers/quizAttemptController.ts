import { Response } from 'express';
import { quizAttemptService } from '../services/quizAttemptService';
import { AuthenticatedRequest } from '../middleware/auth';
import { logError } from '../utils/logger';

export const startQuizAttempt = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { quizId } = req.body;
    let userId = req.user?.id;
    
    // If no authenticated user, find the first available user for testing
    if (!userId) {
      const { User } = await import('../models');
      const firstUser = await User.findOne();
      if (!firstUser) {
        res.status(400).json({
          success: false,
          error: 'USER_NOT_AVAILABLE',
          message: 'No user account is available to start a quiz. Please log in.'
        });
        return;
      }
      userId = firstUser.id;
    }

    if (!quizId) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Please select a quiz to start.'
      });
      return;
    }

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
      error: 'QUIZ_ATTEMPT_START_FAILED',
      message: 'Could not start the quiz right now. Please try again.'
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
        error: 'VALIDATION_ERROR',
        message: 'Attempt ID must be a number.'
      });
      return;
    }

    if (!questionId || !Array.isArray(selectedOptions)) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Please select an answer before submitting.'
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
      error: 'ANSWER_SUBMIT_FAILED',
      message: 'Could not submit your answer right now. Please try again.'
    });
  }
};

export const completeQuizAttempt = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const attemptId = parseInt(req.params.attemptId);
    let userId = req.user?.id;
    
    // If no authenticated user, find the first available user for testing
    if (!userId) {
      const { User } = await import('../models');
      const firstUser = await User.findOne();
      if (!firstUser) {
        res.status(400).json({
          success: false,
          error: 'USER_NOT_AVAILABLE',
          message: 'No user account is available to complete the quiz. Please log in.'
        });
        return;
      }
      userId = firstUser.id;
    }

    if (isNaN(attemptId)) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Attempt ID must be a number.'
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
      error: 'QUIZ_ATTEMPT_COMPLETE_FAILED',
      message: 'Could not complete the quiz right now. Please try again.'
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
        error: 'VALIDATION_ERROR',
        message: 'Attempt ID must be a number.'
      });
      return;
    }

    const attempt = await quizAttemptService.getAttemptById(id, userId);
    if (!attempt) {
      res.status(404).json({
        success: false,
        error: 'ATTEMPT_NOT_FOUND',
        message: 'Quiz attempt not found or access denied.'
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
      error: 'QUIZ_ATTEMPT_FETCH_FAILED',
      message: 'Could not load this quiz attempt right now. Please try again.'
    });
  }
};

export const getUserAttempts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'AUTH_REQUIRED',
        message: 'Please log in to view your attempts.'
      });
      return;
    }
    
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
      error: 'USER_ATTEMPTS_FETCH_FAILED',
      message: 'Could not load your attempts right now. Please try again.'
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
      error: 'LEADERBOARD_FETCH_FAILED',
      message: 'Could not load the leaderboard right now. Please try again.'
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
      error: 'USER_STATS_FETCH_FAILED',
      message: 'Could not load your statistics right now. Please try again.'
    });
  }
};
