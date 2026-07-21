import { Router } from 'express';
import {
  getAIOpponents,
  createSoloMatch,
  createMultiplayerMatch,
  joinMatch,
  getMatch,
  getAvailableMatches,
  getMatchHistory,
  checkPendingMatch,
  clearPendingMatch
} from '../controllers/matchController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// Validation schemas
const createSoloMatchSchema = Joi.object({
  quizId: Joi.number().integer().positive().required(),
  aiOpponentId: Joi.string().optional()
});

const createMultiplayerMatchSchema = Joi.object({
  quizId: Joi.number().integer().positive().required(),
  maxPlayers: Joi.number().integer().min(2).max(10).default(10)
});

// All routes require authentication. This was commented out "for testing"
// and left disabled, which made the entire /api/matches surface
// unauthenticated - including GET/DELETE /pending/:userId, which took the
// userId straight from the path with no ownership check (any party could
// read, or DELETE, any user's pending-match reconnection state). The
// frontend's apiClient already sends the Bearer token on every /matches
// call, so enabling this does not change the real flow.
router.use(authenticateToken);

// AI Opponents
router.get('/ai-opponents', getAIOpponents);

// Solo Matches
router.post('/solo', validateRequest(createSoloMatchSchema), createSoloMatch);

// Multiplayer Matches
router.post('/multiplayer', validateRequest(createMultiplayerMatchSchema), createMultiplayerMatch);
router.get('/available', getAvailableMatches);
router.post('/:matchId/join', joinMatch);

// Match Details
router.get('/:matchId', getMatch);

// Match History
router.get('/history/user', getMatchHistory);

// Pending Match Check (for cross-tab reconnection)
router.get('/pending/:userId', checkPendingMatch);
router.delete('/pending/:userId', clearPendingMatch);

export default router;
