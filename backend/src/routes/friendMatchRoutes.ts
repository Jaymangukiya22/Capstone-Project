import { Router, Request, Response } from 'express';
import { logInfo, logError } from '../utils/logger';
import { getMatchService } from '../services/matchService';
import { getRedisClient } from '../config/redis';

// Simple HTTP client instead of axios
const httpClient = {
  async get(url: string): Promise<{ data: any }> {
    try {
      logInfo('HTTP GET request', { url });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`);
        (error as any).response = { status: response.status };
        throw error;
      }
      const data = await response.json();
      logInfo('HTTP GET success', { url, status: response.status });
      return { data };
    } catch (error: any) {
      logError('HTTP GET failed', new Error(`URL: ${url}, Error: ${error.message}`));
      throw error;
    }
  },
  
  async post(url: string, data: any): Promise<{ data: any }> {
    try {
      logInfo('HTTP POST request', { url, data });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const text = await response.text();
        logError('HTTP POST failed', new Error(`Status: ${response.status}, Response: ${text}`));
        const error = new Error(`HTTP ${response.status}`);
        (error as any).response = { status: response.status };
        throw error;
      }
      const responseData = await response.json();
      logInfo('HTTP POST success', { url, status: response.status });
      return { data: responseData };
    } catch (error: any) {
      logError('HTTP POST failed', new Error(`URL: ${url}, Error: ${error.message}`));
      throw error;
    }
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

// Match service URL - use container name in Docker, localhost for development
const MATCH_SERVICE_URL = process.env.MATCH_SERVICE_URL || 'http://quizup_matchserver:3001';

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

    logInfo('Friend match request received', { quizId, userId, username, MATCH_SERVICE_URL });

    if (!quizId) {
      return res.status(400).json({
        success: false,
        error: 'Quiz ID is required'
      });
    }

    // Create friend match using backend's MatchService
    logInfo('Creating friend match using MatchService');
    
    const matchService = getMatchService();
    const matchData = await matchService.createFriendMatch(quizId, userId);

    logInfo('Friend match created successfully', { matchData });

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

  } catch (error: any) {
    logError('Failed to create friend match', error as Error);
    logError('Error details', new Error(`Status: ${error.response?.status}, Message: ${error.message}`));
    return res.status(500).json({
      success: false,
      error: 'Failed to create friend match',
      details: error.message
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

    // Look up match ID from join code in Redis
    const redis = getRedisClient();
    const matchId = await redis.get(`joincode:${joinCode.toUpperCase()}`);

    if (!matchId) {
      logInfo('Match not found for join code', { joinCode });
      return res.status(404).json({
        success: false,
        error: 'No match found with that join code'
      });
    }

    // Get match details from Redis
    const matchData = await redis.get(`match:${matchId}`);
    if (!matchData) {
      logInfo('Match data not found in Redis', { matchId, joinCode });
      return res.status(404).json({
        success: false,
        error: 'Match data not found'
      });
    }

    const match = JSON.parse(matchData);

    logInfo('Match found by join code', { joinCode, matchId });
    return res.json({
      success: true,
      data: {
        match: {
          id: match.id,
          quizId: match.quizId,
          joinCode: match.joinCode,
          status: match.status,
          matchType: match.matchType
        },
        websocketUrl: `ws://${process.env.NETWORK_IP || 'localhost'}:3001`
      }
    });

  } catch (error: any) {
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

export default router;
