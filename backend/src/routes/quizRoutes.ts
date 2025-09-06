import { Router } from 'express';
import { quizController } from '../controllers/quizController';

const router = Router();

// POST /api/quizzes - Create a new quiz
router.post('/', quizController.createQuiz.bind(quizController));

// GET /api/quizzes - Get all quizzes (with optional categoryId query param)
router.get('/', quizController.getAllQuizzes.bind(quizController));

// GET /api/quizzes/:id - Get quiz by ID with full details
router.get('/:id', quizController.getQuizById.bind(quizController));

// PUT /api/quizzes/:id - Update quiz
router.put('/:id', quizController.updateQuiz.bind(quizController));

// DELETE /api/quizzes/:id - Delete quiz
router.delete('/:id', quizController.deleteQuiz.bind(quizController));

// GET /api/quizzes/:id/stats - Get quiz statistics
router.get('/:id/stats', quizController.getQuizStats.bind(quizController));

export default router;
