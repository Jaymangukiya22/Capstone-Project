import { Router } from 'express';
import { QuizController } from '@/controllers/quiz.controller';
import { 
  authenticate, 
  requireFaculty, 
  requireQuizAccess,
  requireCourseAccess 
} from '@/middleware/auth.middleware';
import { 
  validate, 
  validateQuery,
  quizSchemas,
  questionSchemas,
  querySchemas 
} from '@/middleware/validation.middleware';

const router = Router();
const quizController = new QuizController();

// Protected routes
router.use(authenticate); // All routes require authentication

// Quiz CRUD operations
router.post('/', requireFaculty, validate(quizSchemas.create), quizController.createQuiz);
router.get('/upcoming', quizController.getUpcomingQuizzes);
router.get('/:quizId', requireQuizAccess, quizController.getQuizById);
router.put('/:quizId', requireQuizAccess, validate(quizSchemas.update), quizController.updateQuiz);
router.delete('/:quizId', requireQuizAccess, quizController.deleteQuiz);

// Quiz scheduling
router.post('/:quizId/schedule', requireQuizAccess, quizController.scheduleQuiz);

// Question management
router.post('/:quizId/questions', requireQuizAccess, validate(questionSchemas.create), quizController.addQuestion);
router.put('/questions/:questionId', validate(questionSchemas.update), quizController.updateQuestion);
router.delete('/questions/:questionId', quizController.deleteQuestion);

// Course quizzes
router.get('/course/:courseId', requireCourseAccess, validateQuery(querySchemas.pagination), quizController.getCourseQuizzes);

export default router;
