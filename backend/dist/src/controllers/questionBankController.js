"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchQuestions = exports.uploadExcel = exports.bulkImport = exports.deleteQuestion = exports.updateQuestion = exports.getQuestionById = exports.getAllQuestions = exports.getQuestionsByCategory = exports.createQuestion = exports.uploadMiddleware = void 0;
const questionBankService_1 = require("../services/questionBankService");
const logger_1 = require("../utils/logger");
const multer_1 = __importDefault(require("multer"));
const questionBankService = new questionBankService_1.QuestionBankService();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'application/vnd.ms-excel') {
            cb(null, true);
        }
        else {
            cb(new Error('Only Excel files are allowed'));
        }
    }
});
exports.uploadMiddleware = upload.single('file');
const createQuestion = async (req, res) => {
    try {
        const { questionText, categoryId, difficulty, options } = req.body;
        const createdById = req.user.id;
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
    }
    catch (error) {
        (0, logger_1.logError)('Error creating question', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create question',
            message: 'An error occurred while creating the question'
        });
    }
};
exports.createQuestion = createQuestion;
const getQuestionsByCategory = async (req, res) => {
    try {
        const categoryId = parseInt(req.params.categoryId);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await questionBankService.getQuestionsByCategory(categoryId, page, limit);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        (0, logger_1.logError)('Error fetching questions by category', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch questions',
            message: 'An error occurred while fetching questions'
        });
    }
};
exports.getQuestionsByCategory = getQuestionsByCategory;
const getAllQuestions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const difficulty = req.query.difficulty;
        const result = await questionBankService.getAllQuestions(page, limit, difficulty);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        (0, logger_1.logError)('Error fetching all questions', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch questions',
            message: 'An error occurred while fetching questions'
        });
    }
};
exports.getAllQuestions = getAllQuestions;
const getQuestionById = async (req, res) => {
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
    }
    catch (error) {
        (0, logger_1.logError)('Error fetching question by ID', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch question',
            message: 'An error occurred while fetching the question'
        });
    }
};
exports.getQuestionById = getQuestionById;
const updateQuestion = async (req, res) => {
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
    }
    catch (error) {
        (0, logger_1.logError)('Error updating question', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update question',
            message: 'An error occurred while updating the question'
        });
    }
};
exports.updateQuestion = updateQuestion;
const deleteQuestion = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await questionBankService.deleteQuestion(id);
        res.json({
            success: true,
            message: 'Question deleted successfully'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Error deleting question', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete question',
            message: 'An error occurred while deleting the question'
        });
    }
};
exports.deleteQuestion = deleteQuestion;
const bulkImport = async (req, res) => {
    try {
        const { categoryId, questions } = req.body;
        const createdById = req.user.id;
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
    }
    catch (error) {
        (0, logger_1.logError)('Error in bulk import', error);
        res.status(500).json({
            success: false,
            error: 'Failed to import questions',
            message: 'An error occurred during bulk import'
        });
    }
};
exports.bulkImport = bulkImport;
const uploadExcel = async (req, res) => {
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
        if (!categoryId) {
            res.status(400).json({
                success: false,
                error: 'Category ID required',
                message: 'Please provide a valid category ID'
            });
            return;
        }
        const createdById = req.user.id;
        const questions = await questionBankService.parseExcelFile(req.file.buffer);
        if (questions.length === 0) {
            res.status(400).json({
                success: false,
                error: 'No valid questions found',
                message: 'The Excel file does not contain any valid questions'
            });
            return;
        }
        const result = await questionBankService.bulkImport({
            categoryId,
            createdById,
            questions
        });
        res.status(201).json({
            success: true,
            message: `Successfully imported ${result.imported} questions from Excel file`,
            data: result
        });
    }
    catch (error) {
        (0, logger_1.logError)('Error uploading Excel file', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process Excel file',
            message: error instanceof Error ? error.message : 'An error occurred while processing the file'
        });
    }
};
exports.uploadExcel = uploadExcel;
const searchQuestions = async (req, res) => {
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
        const questions = await questionBankService.searchQuestions(query, categoryId ? parseInt(categoryId) : undefined, difficulty);
        res.json({
            success: true,
            data: { questions }
        });
    }
    catch (error) {
        (0, logger_1.logError)('Error searching questions', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search questions',
            message: 'An error occurred while searching questions'
        });
    }
};
exports.searchQuestions = searchQuestions;
//# sourceMappingURL=questionBankController.js.map