import { Router } from 'express';
import { questionController } from '../controllers/questionController';

const router = Router();

// POST /api/questions - Create a new question (standalone)
router.post('/', questionController.createQuestion.bind(questionController));

// POST /api/questions/quiz/:quizId - Add question to specific quiz
router.post('/quiz/:quizId', questionController.addQuestionToQuiz.bind(questionController));

// GET /api/questions/:quizId - Get all questions for a quiz
router.get('/:quizId', questionController.getQuestionsByQuizId.bind(questionController));

// GET /api/questions/single/:id - Get question by ID
router.get('/single/:id', questionController.getQuestionById.bind(questionController));

// PUT /api/questions/single/:id - Update question
router.put('/single/:id', questionController.updateQuestion.bind(questionController));

// DELETE /api/questions/single/:id - Delete question
router.delete('/single/:id', questionController.deleteQuestion.bind(questionController));

// GET /api/questions/:quizId/stats - Get question statistics for a quiz
router.get('/:quizId/stats', questionController.getQuestionStats.bind(questionController));

export default router;
