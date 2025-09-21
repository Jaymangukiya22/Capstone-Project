import { Router } from 'express';
import {
  createQuestion,
  getQuestionsByCategory,
  getAllQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  bulkImport,
  uploadExcel,
  downloadTemplate,
  searchQuestions,
  uploadMiddleware
} from '../controllers/questionBankController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { validateRequest, validateQuery } from '../middleware/validation';
import {
  createQuestionBankSchema,
  bulkImportSchema,
  searchQuestionsSchema
} from '../utils/validation';

const router = Router();

// All routes require authentication
// router.use(authenticateToken);

// Search questions (available to all authenticated users)
router.get('/search', validateQuery(searchQuestionsSchema), searchQuestions);

// Get all questions with pagination and filtering
router.get('/', getAllQuestions);

// Get questions by category
router.get('/category/:categoryId', getQuestionsByCategory);

// Get specific question by ID
router.get('/:id', getQuestionById);

// Admin-only routes for managing question bank (Auth temporarily disabled)
router.post('/', validateRequest(createQuestionBankSchema), createQuestion);
router.put('/:id', validateRequest(createQuestionBankSchema), updateQuestion);
router.delete('/:id', deleteQuestion);

// Template download (Auth temporarily disabled)
router.get('/template', downloadTemplate);

// Bulk operations (Auth temporarily disabled)
router.post('/bulk', validateRequest(bulkImportSchema), bulkImport);
router.post('/bulk-import', validateRequest(bulkImportSchema), bulkImport);
router.post('/upload-excel', uploadMiddleware, uploadExcel);

export default router;
