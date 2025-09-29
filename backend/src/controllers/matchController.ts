import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { matchService } from '../services/matchService';
import { aiOpponentService } from '../services/aiOpponentService';
import { logError, logInfo } from '../utils/logger';

/**
 * Get available AI opponents
 */
export const getAIOpponents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const aiOpponents = aiOpponentService.getAIOpponents();
    
    res.json({
      success: true,
      data: aiOpponents,
      message: 'AI opponents retrieved successfully'
    });
  } catch (error) {
    logError('Error fetching AI opponents', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI opponents',
      message: 'An error occurred while fetching AI opponents'
    });
  }
};

/**
 * Create a solo match with AI opponent
 */
export const createSoloMatch = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { quizId, aiOpponentId } = req.body;
    const userId = req.user?.id || 1; // Default to user ID 1 for testing

    if (!quizId) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Quiz ID is required'
      });
      return;
    }

    const matchId = await matchService.createSoloMatch(userId, parseInt(quizId), aiOpponentId);
    
    res.status(201).json({
      success: true,
      data: { matchId },
      message: 'Solo match created successfully'
    });
  } catch (error) {
    logError('Error creating solo match', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to create solo match',
      message: error instanceof Error ? error.message : 'An error occurred while creating the match'
    });
  }
};

/**
 * Create a multiplayer match
 */
export const createMultiplayerMatch = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { quizId, maxPlayers = 10 } = req.body;
    const userId = req.user?.id || 1; // Default to user ID 1 for testing

    if (!quizId) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Quiz ID is required'
      });
      return;
    }

    const matchId = await matchService.createMatch(userId, parseInt(quizId), maxPlayers);
    
    res.status(201).json({
      success: true,
      data: { matchId },
      message: 'Multiplayer match created successfully'
    });
  } catch (error) {
    logError('Error creating multiplayer match', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to create multiplayer match',
      message: error instanceof Error ? error.message : 'An error occurred while creating the match'
    });
  }
};

/**
 * Join an existing match
 */
export const joinMatch = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { matchId } = req.params;
    const userId = req.user?.id || 1; // Default to user ID 1 for testing

    if (!matchId) {
      res.status(400).json({
        success: false,
        error: 'Missing match ID',
        message: 'Match ID is required'
      });
      return;
    }

    const success = await matchService.joinMatch(matchId, userId, '');
    
    if (success) {
      res.json({
        success: true,
        data: { matchId },
        message: 'Successfully joined match'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to join match',
        message: 'Match not found, full, or already started'
      });
    }
  } catch (error) {
    logError('Error joining match', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to join match',
      message: error instanceof Error ? error.message : 'An error occurred while joining the match'
    });
  }
};

/**
 * Get match details
 */
export const getMatch = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { matchId } = req.params;

    if (!matchId) {
      res.status(400).json({
        success: false,
        error: 'Missing match ID',
        message: 'Match ID is required'
      });
      return;
    }

    const match = matchService.getMatchById(matchId);
    
    if (!match) {
      res.status(404).json({
        success: false,
        error: 'Match not found',
        message: 'The specified match does not exist'
      });
      return;
    }

    // Convert Map to Array for JSON serialization
    const playersArray = Array.from(match.players.values()).map(player => ({
      userId: player.userId,
      username: player.username,
      score: player.score,
      isReady: player.isReady,
      isAI: player.isAI,
      aiOpponent: player.isAI ? {
        id: player.aiOpponent?.id,
        name: player.aiOpponent?.name,
        difficulty: player.aiOpponent?.difficulty,
        avatar: player.aiOpponent?.avatar
      } : undefined
    }));

    res.json({
      success: true,
      data: {
        id: match.id,
        quizId: match.quizId,
        quiz: {
          id: match.quiz.id,
          title: match.quiz.title,
          description: match.quiz.description,
          difficulty: match.quiz.difficulty,
          timeLimit: match.quiz.timeLimit
        },
        players: playersArray,
        status: match.status,
        currentQuestionIndex: match.currentQuestionIndex,
        maxPlayers: match.maxPlayers,
        timeLimit: match.timeLimit,
        createdAt: match.createdAt
      },
      message: 'Match details retrieved successfully'
    });
  } catch (error) {
    logError('Error fetching match details', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch match details',
      message: 'An error occurred while fetching match details'
    });
  }
};

/**
 * Get available matches (for joining)
 */
export const getAvailableMatches = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const matches = matchService.getAvailableMatches();
    
    res.json({
      success: true,
      data: matches,
      message: 'Available matches retrieved successfully'
    });
  } catch (error) {
    logError('Error fetching available matches', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available matches',
      message: 'An error occurred while fetching available matches'
    });
  }
};

/**
 * Get match history for a user
 */
export const getMatchHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || 1; // Default to user ID 1 for testing
    const { page = 1, limit = 20 } = req.query;

    // This would typically fetch from database
    // For now, return empty array as placeholder
    res.json({
      success: true,
      data: {
        matches: [],
        pagination: {
          currentPage: parseInt(page as string),
          totalPages: 0,
          totalMatches: 0,
          hasNext: false,
          hasPrev: false
        }
      },
      message: 'Match history retrieved successfully'
    });
  } catch (error) {
    logError('Error fetching match history', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch match history',
      message: 'An error occurred while fetching match history'
    });
  }
};
