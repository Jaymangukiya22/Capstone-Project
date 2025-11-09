import { Router, Request, Response } from 'express';
import { logInfo, logError } from '../utils/logger';
import { getMatchResults } from '../controllers/matchResultsController';

// Simple HTTP client instead of axios
const httpClient = {
  async get(url: string): Promise<{ data: any }> {
    const response = await fetch(url);
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      (error as any).response = { status: response.status };
      throw error;
    }
    return { data: await response.json() };
  },
  
  async post(url: string, data: any): Promise<{ data: any }> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      (error as any).response = { status: response.status };
      throw error;
    }
    return { data: await response.json() };
  }
};

// Extend Request interface for user property
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
  };
}

const router = Router();

// Match service URL
const MATCH_SERVICE_URL = process.env.MATCH_SERVICE_URL || 'http://localhost:3001';

/**
 * Create a friend match (1v1 with join code)
 * POST /api/friend-matches
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { quizId, userId: bodyUserId, username: bodyUsername } = req.body;
    
    // Get userId from request body if provided (for testing), otherwise from auth
    const userId = bodyUserId || req.user?.id || 1;
    const username = bodyUsername || req.user?.username || `User${userId}`;

    if (!quizId) {
      return res.status(400).json({
        success: false,
        error: 'Quiz ID is required'
      });
    }

    // Call match service to create friend match
    const response = await httpClient.post(`${MATCH_SERVICE_URL}/matches/friend`, {
      quizId,
      userId,
      username
    });

    // Check if response has the expected structure
    const matchData = response.data?.data || response.data;
    
    if (!matchData?.matchId || !matchData?.joinCode) {
      throw new Error('Invalid response from match service');
    }

    logInfo('Friend match created via API', { 
      quizId, 
      userId, 
      matchId: matchData.matchId,
      joinCode: matchData.joinCode 
    });

    return res.json({
      success: true,
      data: {
        matchId: matchData.matchId,
        joinCode: matchData.joinCode,
        message: `Share this code with your friend: ${matchData.joinCode}`,
        websocketUrl: `ws://${process.env.NETWORK_IP || 'localhost'}:3001`
      }
    });

  } catch (error) {
    logError('Failed to create friend match', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create friend match'
    });
  }
});

/**
 * Find match by join code
 * GET /api/friend-matches/code/:joinCode
 */
router.get('/code/:joinCode', async (req, res) => {
  try {
    const { joinCode } = req.params;

    if (!joinCode || joinCode.length !== 6) {
      return res.status(400).json({
        success: false,
        error: 'Valid 6-character join code is required'
      });
    }

    // Call match service to find match by code
    const response = await httpClient.get(`${MATCH_SERVICE_URL}/matches/code/${joinCode}`);

    return res.json({
      success: true,
      data: {
        match: response.data.data.match,
        websocketUrl: `ws://localhost:3001`
      }
    });

  } catch (error: any) {
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'No match found with that join code'
      });
    }

    logError('Failed to find match by code', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to find match by code'
    });
  }
});

/**
 * Get all active matches (for monitoring)
 * GET /api/friend-matches
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Call match service to get active matches
    const response = await httpClient.get(`${MATCH_SERVICE_URL}/matches`);

    return res.json({
      success: true,
      data: response.data.data
    });

  } catch (error) {
    logError('Failed to get active matches', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get active matches'
    });
  }
});

/**
 * Get specific match details
 * GET /api/friend-matches/:matchId
 */
router.get('/:matchId', async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;

    // Call match service to get match details
    const response = await httpClient.get(`${MATCH_SERVICE_URL}/matches/${matchId}`);

    return res.json({
      success: true,
      data: response.data.data
    });

  } catch (error: any) {
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }

    logError('Failed to get match details', error as Error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get match details'
    });
  }
});

/**
 * Get match results from database
 * GET /api/friend-matches/:matchId/results
 */
router.get('/:matchId/results', getMatchResults);

export default router;
