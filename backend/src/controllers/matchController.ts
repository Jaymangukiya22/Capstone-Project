import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { matchService } from '../services/matchService';
import { aiOpponentService } from '../services/aiOpponentService';
import { logError, logInfo } from '../utils/logger';

/* ===============================
   GET AI Opponents
================================ */
export const getAIOpponents = async (req: AuthenticatedRequest, res: Response) => {
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
      error: 'AI_OPPONENTS_FETCH_FAILED',
      message: 'Could not load AI opponents right now. Please try again.'
    });
  }
};

/* ===============================
   CREATE SOLO MATCH (AI)
================================ */
export const createSoloMatch = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { quizId, aiOpponentId } = req.body;
    const userId = req.user?.id || 1;

    if (!quizId) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Please select a quiz to start a match.'
      });
      return;
    }

    const matchId = await matchService.createSoloMatch(
      userId,
      parseInt(quizId),
      aiOpponentId
    );

    res.status(201).json({
      success: true,
      data: { matchId },
      message: 'Solo match created successfully'
    });
  } catch (error) {
    logError('Error creating solo match', error as Error);
    res.status(500).json({
      success: false,
      error: 'SOLO_MATCH_CREATE_FAILED',
      message: 'Could not start a solo match right now. Please try again.'
    });
  }
};

/* ===============================
   CREATE MULTIPLAYER MATCH
================================ */
export const createMultiplayerMatch = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { quizId, maxPlayers = 10 } = req.body;
    const userId = req.user?.id || 1;

    if (!quizId) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Please select a quiz to start a match.'
      });
      return;
    }

    const matchId = await matchService.createMatch(
      userId,
      parseInt(quizId),
      maxPlayers
    );

    res.status(201).json({
      success: true,
      data: { matchId },
      message: 'Multiplayer match created successfully'
    });
  } catch (error) {
    logError('Error creating multiplayer match', error as Error);
    res.status(500).json({
      success: false,
      error: 'MULTIPLAYER_MATCH_CREATE_FAILED',
      message: 'Could not start a multiplayer match right now. Please try again.'
    });
  }
};

/* ===============================
   JOIN MATCH
================================ */
export const joinMatch = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { matchId } = req.params;
    const userId = req.user?.id || 1;

    if (!matchId) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Match ID is required.'
      });
      return;
    }

    const success = await matchService.joinMatch(matchId, userId, '');

    if (!success) {
      res.status(400).json({
        success: false,
        error: 'MATCH_JOIN_FAILED',
        message: 'Could not join match. It may be full, started, or no longer available.'
      });
      return;
    }

    res.json({
      success: true,
      data: { matchId },
      message: 'Successfully joined match'
    });
  } catch (error) {
    logError('Error joining match', error as Error);
    res.status(500).json({
      success: false,
      error: 'MATCH_JOIN_FAILED',
      message: 'Could not join match right now. Please try again.'
    });
  }
};

/* ===============================
   GET MATCH DETAILS
================================ */
export const getMatch = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { matchId } = req.params;

    if (!matchId) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Match ID is required.'
      });
      return;
    }

    const match = await matchService.getMatchById(matchId);

    if (!match) {
      res.status(404).json({
        success: false,
        error: 'MATCH_NOT_FOUND',
        message: 'Match not found.'
      });
      return;
    }

    res.json({
      success: true,
      data: match,
      message: 'Match details retrieved successfully'
    });
  } catch (error) {
    logError('Error fetching match details', error as Error);
    res.status(500).json({
      success: false,
      error: 'MATCH_DETAILS_FETCH_FAILED',
      message: 'Could not load match details right now. Please try again.'
    });
  }
};

/* ===============================
   AVAILABLE MATCHES
================================ */
export const getAvailableMatches = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const matches = await matchService.getAvailableMatches();

    res.json({
      success: true,
      data: matches,
      message: 'Available matches retrieved successfully'
    });
  } catch (error) {
    logError('Error fetching available matches', error as Error);
    res.status(500).json({
      success: false,
      error: 'AVAILABLE_MATCHES_FETCH_FAILED',
      message: 'Could not load available matches right now. Please try again.'
    });
  }
};

/* ===============================
   MATCH HISTORY
================================ */
export const getMatchHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || 1;

    res.json({
      success: true,
      data: {
        matches: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalMatches: 0,
          hasNext: false,
          hasPrev: false
        }
      }
    });
  } catch (error) {
    logError('Error fetching match history', error as Error);
    res.status(500).json({
      success: false,
      error: 'MATCH_HISTORY_FETCH_FAILED',
      message: 'Could not load match history right now. Please try again.'
    });
  }
};

/* ===============================
   PENDING MATCH CHECK (Cross-tab Reconnection)
================================ */
export const checkPendingMatch = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Ownership from the verified JWT, NOT the path param - previously
    // /pending/:userId let anyone read any user's pending-match state (IDOR).
    // A user may only check their own.
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'AUTH_REQUIRED',
        message: 'Please log in to continue.'
      });
      return;
    }

    if (String(req.params.userId) !== String(userId)) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You can only check your own pending match.'
      });
      return;
    }

    // Check Redis for pending match
    const store = req.app.get('store');
    if (!store) {
      res.status(500).json({
        success: false,
        error: 'STORE_NOT_AVAILABLE',
        message: 'Redis store not available.'
      });
      return;
    }

    const pendingMatchKey = `user:${userId}:pending_match`;
    const pendingMatchData = await store.get(pendingMatchKey);

    if (!pendingMatchData) {
      res.json({
        success: true,
        data: { hasPendingMatch: false },
        message: 'No pending match found.'
      });
      return;
    }

    const disconnectState = JSON.parse(pendingMatchData);
    const timeRemaining = Math.max(0, Math.floor((disconnectState.deadline - Date.now()) / 1000));

    if (timeRemaining <= 0) {
      // TTL expired, match is no longer pending
      await store.del(pendingMatchKey);
      res.json({
        success: true,
        data: { hasPendingMatch: false },
        message: 'Pending match expired.'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        hasPendingMatch: true,
        matchId: disconnectState.matchId,
        joinCode: disconnectState.joinCode || '',
        timeRemaining,
        disconnectedAt: disconnectState.disconnectedAt,
        currentQuestionIndex: disconnectState.currentQuestionIndex || 1,
        totalQuestions: disconnectState.totalQuestions || 0
      },
      message: 'Pending match found.'
    });
  } catch (error) {
    logError('Error checking pending match', error as Error);
    res.status(500).json({
      success: false,
      error: 'PENDING_MATCH_CHECK_FAILED',
      message: 'Could not check pending match.'
    });
  }
};

/* ===============================
   CLEAR PENDING MATCH
================================ */
export const clearPendingMatch = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Ownership from the verified JWT, NOT the path param - previously
    // DELETE /pending/:userId let anyone wipe any user's pending-match state
    // (IDOR), denying that user's reconnection. A user may only clear their own.
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'AUTH_REQUIRED',
        message: 'Please log in to continue.'
      });
      return;
    }

    if (String(req.params.userId) !== String(userId)) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You can only clear your own pending match.'
      });
      return;
    }

    const store = req.app.get('store');
    if (!store) {
      res.status(500).json({
        success: false,
        error: 'STORE_NOT_AVAILABLE',
        message: 'Redis store not available.'
      });
      return;
    }

    // Delete the pending match key
    const pendingMatchKey = `user:${userId}:pending_match`;
    await store.del(pendingMatchKey);

    logInfo('Pending match cleared', { userId, pendingMatchKey });

    res.json({
      success: true,
      data: { cleared: true },
      message: 'Pending match cleared.'
    });
  } catch (error) {
    logError('Error clearing pending match', error as Error);
    res.status(500).json({
      success: false,
      error: 'CLEAR_PENDING_MATCH_FAILED',
      message: 'Could not clear pending match.'
    });
  }
};
