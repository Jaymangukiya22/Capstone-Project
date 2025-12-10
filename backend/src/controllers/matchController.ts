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
      error: 'Failed to fetch AI opponents'
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
        error: 'Quiz ID is required'
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
      error: 'Failed to create solo match'
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
        error: 'Quiz ID is required'
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
      error: 'Failed to create multiplayer match'
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
        error: 'Match ID is required'
      });
      return;
    }

    const success = await matchService.joinMatch(matchId, userId, '');

    if (!success) {
      res.status(400).json({
        success: false,
        error: 'Match not found, full, or already started'
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
      error: 'Failed to join match'
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
        error: 'Match ID is required'
      });
      return;
    }

    const match = await matchService.getMatchById(matchId);

    if (!match) {
      res.status(404).json({
        success: false,
        error: 'Match not found'
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
      error: 'Failed to fetch match details'
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
      error: 'Failed to fetch available matches'
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
      error: 'Failed to fetch match history'
    });
  }
};
