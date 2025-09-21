import { Router } from 'express';
import {
  getAIOpponents,
  createSoloMatch,
  createMultiplayerMatch,
  joinMatch,
  getMatch,
  getAvailableMatches,
  getMatchHistory
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

// All routes require authentication (commented out for testing)
// router.use(authenticateToken);

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

export default router;
