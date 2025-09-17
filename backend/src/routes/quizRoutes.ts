import { Router } from 'express';
import {
  createQuiz,
  assignQuestionsToQuiz,
  searchQuizzes,
  getQuizById,
  getQuizForPlay,
  updateQuiz,
  deleteQuiz,
  getQuizStats,
  getPopularQuizzes
} from '../controllers/quizController';
import { authenticateToken, requireAdmin, requirePlayer } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import {
  createQuizSchema,
  assignQuestionsSchema
} from '../utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Public routes (for all authenticated users)
router.get('/search', searchQuizzes);
router.get('/popular', getPopularQuizzes);
router.get('/:id', getQuizById);
router.get('/:id/play', requirePlayer, getQuizForPlay);
router.get('/:id/stats', getQuizStats);

// Admin-only routes
router.post('/', requireAdmin, validateRequest(createQuizSchema), createQuiz);
router.put('/:id', requireAdmin, validateRequest(createQuizSchema), updateQuiz);
router.delete('/:id', requireAdmin, deleteQuiz);
router.post('/:id/questions', requireAdmin, validateRequest(assignQuestionsSchema), assignQuestionsToQuiz);

export default router;
