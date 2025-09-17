import { Router } from 'express';
import {
  startQuizAttempt,
  submitAnswer,
  completeQuizAttempt,
  getAttemptById,
  getUserAttempts,
  getLeaderboard,
  getUserStats
} from '../controllers/quizAttemptController';
import { authenticateToken, requirePlayer } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import {
  startQuizSchema,
  submitAnswerSchema,
  completeQuizSchema
} from '../utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Player routes for quiz attempts
router.post('/start', requirePlayer, validateRequest(startQuizSchema), startQuizAttempt);
router.post('/:attemptId/answer', requirePlayer, validateRequest(submitAnswerSchema), submitAnswer);
router.post('/:attemptId/complete', requirePlayer, validateRequest(completeQuizSchema), completeQuizAttempt);

// Get specific attempt
router.get('/:id', requirePlayer, getAttemptById);

// Get user's attempts history
router.get('/user/history', requirePlayer, getUserAttempts);

// Get user statistics
router.get('/user/stats', requirePlayer, getUserStats);

// Get leaderboard (global or quiz-specific)
router.get('/leaderboard', getLeaderboard);

export default router;
