import { Router } from 'express';
import { questionController } from '../controllers/questionController';

const router = Router();

// POST /api/questions - Create a new question (standalone)
router.post('/', questionController.createQuestion.bind(questionController));

// POST /api/questions/quiz/:quizId - Add question to specific quiz
router.post('/quiz/:quizId', questionController.addQuestionToQuiz.bind(questionController));

// GET /api/questions/quiz/:quizId - Get all questions for a quiz
router.get('/quiz/:quizId', questionController.getQuestionsByQuizId.bind(questionController));

// GET /api/questions/quiz/:quizId/stats - Get question statistics for a quiz
router.get('/quiz/:quizId/stats', questionController.getQuestionStats.bind(questionController));

// GET /api/questions/:id - Get question by ID
router.get('/:id', questionController.getQuestionById.bind(questionController));

// PUT /api/questions/:id - Update question
router.put('/:id', questionController.updateQuestion.bind(questionController));

// DELETE /api/questions/:id - Delete question
router.delete('/:id', questionController.deleteQuestion.bind(questionController));

export default router;
