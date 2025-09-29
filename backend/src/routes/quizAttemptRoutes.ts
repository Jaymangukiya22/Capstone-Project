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
// router.use(authenticateToken);

// Player routes for quiz attempts (Auth temporarily disabled for testing)
router.post('/', validateRequest(startQuizSchema), startQuizAttempt);
router.post('/start', validateRequest(startQuizSchema), startQuizAttempt);
router.post('/:attemptId/answer', validateRequest(submitAnswerSchema), submitAnswer);
router.post('/:attemptId/complete', validateRequest(completeQuizSchema), completeQuizAttempt);

// Get all attempts (for debugging)
router.get('/', getUserAttempts);

// Get specific attempt
router.get('/:id', getAttemptById);

// Get user's attempts history
router.get('/user/history', getUserAttempts);

// Get user statistics
router.get('/user/stats', getUserStats);

// Get leaderboard (global or quiz-specific)
router.get('/leaderboard', getLeaderboard);

export default router;
