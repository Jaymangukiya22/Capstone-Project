import { Response } from 'express';
import { QuestionBankService } from '../services/questionBankService';
import { excelUploadService } from '../services/excelUploadService';
import { AuthenticatedRequest } from '../middleware/auth';
import { logError, logInfo } from '../utils/logger';
import multer from 'multer';

const questionBankService = new QuestionBankService();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

export const uploadMiddleware = upload.single('file');

export const createQuestion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { questionText, categoryId, difficulty, options } = req.body;
    const createdById = req.user!.id;

    const question = await questionBankService.createQuestion({
      questionText,
      categoryId,
      difficulty,
      createdById,
      options
    });

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      data: { question }
    });
  } catch (error) {
    logError('Error creating question', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to create question',
      message: 'An error occurred while creating the question'
    });
  }
};

export const getQuestionsByCategory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const categoryId = parseInt(req.params.categoryId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await questionBankService.getQuestionsByCategory(categoryId, page, limit);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logError('Error fetching questions by category', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch questions',
      message: 'An error occurred while fetching questions'
    });
  }
};

export const getAllQuestions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const difficulty = req.query.difficulty as any;

    const result = await questionBankService.getAllQuestions(page, limit, difficulty);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logError('Error fetching all questions', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch questions',
      message: 'An error occurred while fetching questions'
    });
  }
};

export const getQuestionById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const question = await questionBankService.getQuestionById(id);

    if (!question) {
      res.status(404).json({
        success: false,
        error: 'Question not found',
        message: 'The requested question does not exist'
      });
      return;
    }

    res.json({
      success: true,
      data: { question }
    });
  } catch (error) {
    logError('Error fetching question by ID', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch question',
      message: 'An error occurred while fetching the question'
    });
  }
};

export const updateQuestion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { questionText, categoryId, difficulty, options } = req.body;

    const question = await questionBankService.updateQuestion(id, {
      questionText,
      categoryId,
      difficulty,
      options
    });

    res.json({
      success: true,
      message: 'Question updated successfully',
      data: { question }
    });
  } catch (error) {
    logError('Error updating question', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to update question',
      message: 'An error occurred while updating the question'
    });
  }
};

export const deleteQuestion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    await questionBankService.deleteQuestion(id);

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    logError('Error deleting question', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete question',
      message: 'An error occurred while deleting the question'
    });
  }
};

export const bulkImport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { categoryId, questions } = req.body;
    const createdById = req.user!.id;

    const result = await questionBankService.bulkImport({
      categoryId,
      createdById,
      questions
    });

    res.status(201).json({
      success: true,
      message: `Successfully imported ${result.imported} questions`,
      data: result
    });
  } catch (error) {
    logError('Error in bulk import', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to import questions',
      message: 'An error occurred during bulk import'
    });
  }
};

export const uploadExcel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please upload an Excel file'
      });
      return;
    }

    const categoryId = parseInt(req.body.categoryId);
    const includeSubcategories = req.body.includeSubcategories === 'true';
    const subcategoryDepth = req.body.subcategoryDepth ? parseInt(req.body.subcategoryDepth) : 10;

    if (!categoryId) {
      res.status(400).json({
        success: false,
        error: 'Category ID required',
        message: 'Please provide a valid category ID'
      });
      return;
    }

    const createdById = req.user!.id;

    logInfo('Starting Excel upload', {
      categoryId,
      includeSubcategories,
      subcategoryDepth,
      fileSize: req.file.size,
      fileName: req.file.originalname
    });

    // Import questions using enhanced Excel service
    const result = await excelUploadService.importQuestionsFromExcel(req.file.buffer, {
      categoryId,
      includeSubcategories,
      subcategoryDepth,
      createdById
    });

    res.status(201).json({
      success: true,
      message: `Successfully imported ${result.successfulImports} out of ${result.totalRows} questions`,
      data: {
        summary: {
          totalRows: result.totalRows,
          successfulImports: result.successfulImports,
          failedImports: result.failedImports,
          categoryDistribution: result.categoryDistribution
        },
        errors: result.errors,
        importedQuestions: result.importedQuestions.map(q => ({
          id: q.id,
          questionText: q.questionText,
          difficulty: q.difficulty,
          categoryId: q.categoryId
        }))
      }
    });
  } catch (error) {
    logError('Error uploading Excel file', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to process Excel file',
      message: error instanceof Error ? error.message : 'An error occurred while processing the file'
    });
  }
};

export const downloadTemplate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const templateBuffer = excelUploadService.generateTemplate();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=question-import-template.xlsx');
    res.send(templateBuffer);
  } catch (error) {
    logError('Error generating template', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate template',
      message: 'An error occurred while generating the template'
    });
  }
};

export const searchQuestions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { q: query, categoryId, difficulty } = req.query;

    if (!query || typeof query !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Search query required',
        message: 'Please provide a search query'
      });
      return;
    }

    const questions = await questionBankService.searchQuestions(
      query,
      categoryId ? parseInt(categoryId as string) : undefined,
      difficulty as any
    );

    res.json({
      success: true,
      data: { questions }
    });
  } catch (error) {
    logError('Error searching questions', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to search questions',
      message: 'An error occurred while searching questions'
    });
  }
};
