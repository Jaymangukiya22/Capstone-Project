"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPopularQuizzes = exports.getQuizStats = exports.deleteQuiz = exports.updateQuiz = exports.getQuizForPlay = exports.getQuizById = exports.searchQuizzes = exports.assignQuestionsToQuiz = exports.createQuiz = void 0;
const quizService_1 = require("../services/quizService");
const logger_1 = require("../utils/logger");
const createQuiz = async (req, res) => {
    try {
        const { title, description, difficulty, timeLimit, maxQuestions, categoryId } = req.body;
        const createdById = req.user.id;
        const quiz = await quizService_1.quizService.createQuiz({
            title,
            description,
            difficulty,
            timeLimit,
            maxQuestions,
            categoryId,
            createdById
        });
        res.status(201).json({
            success: true,
            data: { quiz },
            message: 'Quiz created successfully'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Error creating quiz', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create quiz',
            message: 'An error occurred while creating the quiz'
        });
    }
};
exports.createQuiz = createQuiz;
const assignQuestionsToQuiz = async (req, res) => {
    try {
        const quizId = parseInt(req.params.id);
        const { questionIds } = req.body;
        if (isNaN(quizId)) {
            res.status(400).json({
                success: false,
                error: 'Invalid quiz ID',
                message: 'Quiz ID must be a number'
            });
            return;
        }
        const result = await quizService_1.quizService.assignQuestionsToQuiz({
            quizId,
            questionIds
        });
        res.json({
            success: true,
            data: result,
            message: 'Questions assigned to quiz successfully'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Error assigning questions to quiz', error);
        res.status(500).json({
            success: false,
            error: 'Failed to assign questions',
            message: 'An error occurred while assigning questions to quiz'
        });
    }
};
exports.assignQuestionsToQuiz = assignQuestionsToQuiz;
const searchQuizzes = async (req, res) => {
    try {
        const filters = {
            difficulty: req.query.difficulty,
            categoryId: req.query.categoryId ? parseInt(req.query.categoryId) : undefined,
            search: req.query.search,
            page: req.query.page ? parseInt(req.query.page) : 1,
            limit: req.query.limit ? parseInt(req.query.limit) : 20
        };
        const result = await quizService_1.quizService.searchQuizzes(filters);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        (0, logger_1.logError)('Error searching quizzes', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search quizzes',
            message: 'An error occurred while searching quizzes'
        });
    }
};
exports.searchQuizzes = searchQuizzes;
const getQuizById = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({
                success: false,
                error: 'Invalid quiz ID',
                message: 'Quiz ID must be a number'
            });
            return;
        }
        const quiz = await quizService_1.quizService.getQuizById(id);
        if (!quiz) {
            res.status(404).json({
                success: false,
                error: 'Quiz not found',
                message: `Quiz with ID ${id} does not exist`
            });
            return;
        }
        res.json({
            success: true,
            data: { quiz },
            message: 'Quiz retrieved successfully'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Error fetching quiz', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch quiz',
            message: 'An error occurred while fetching the quiz'
        });
    }
};
exports.getQuizById = getQuizById;
const getQuizForPlay = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const userId = req.user.id;
        if (isNaN(id)) {
            res.status(400).json({
                success: false,
                error: 'Invalid quiz ID',
                message: 'Quiz ID must be a number'
            });
            return;
        }
        const quiz = await quizService_1.quizService.getQuizForPlay(id, userId);
        if (!quiz) {
            res.status(404).json({
                success: false,
                error: 'Quiz not found',
                message: `Quiz with ID ${id} does not exist`
            });
            return;
        }
        res.json({
            success: true,
            data: { quiz },
            message: 'Quiz retrieved for play successfully'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Error fetching quiz for play', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch quiz',
            message: 'An error occurred while fetching the quiz'
        });
    }
};
exports.getQuizForPlay = getQuizForPlay;
const updateQuiz = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({
                success: false,
                error: 'Invalid quiz ID',
                message: 'Quiz ID must be a number'
            });
            return;
        }
        const quiz = await quizService_1.quizService.updateQuiz(id, req.body);
        res.json({
            success: true,
            data: { quiz },
            message: 'Quiz updated successfully'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Error updating quiz', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update quiz',
            message: 'An error occurred while updating the quiz'
        });
    }
};
exports.updateQuiz = updateQuiz;
const deleteQuiz = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({
                success: false,
                error: 'Invalid quiz ID',
                message: 'Quiz ID must be a number'
            });
            return;
        }
        await quizService_1.quizService.deleteQuiz(id);
        res.json({
            success: true,
            message: 'Quiz deleted successfully'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Error deleting quiz', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete quiz',
            message: 'An error occurred while deleting the quiz'
        });
    }
};
exports.deleteQuiz = deleteQuiz;
const getQuizStats = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({
                success: false,
                error: 'Invalid quiz ID',
                message: 'Quiz ID must be a number'
            });
            return;
        }
        const stats = await quizService_1.quizService.getQuizStats(id);
        if (!stats) {
            res.status(404).json({
                success: false,
                error: 'Quiz not found',
                message: `Quiz with ID ${id} does not exist`
            });
            return;
        }
        res.json({
            success: true,
            data: { stats },
            message: 'Quiz statistics retrieved successfully'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Error fetching quiz stats', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch quiz stats',
            message: 'An error occurred while fetching quiz statistics'
        });
    }
};
exports.getQuizStats = getQuizStats;
const getPopularQuizzes = async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;
        const quizzes = await quizService_1.quizService.getPopularQuizzes(limit);
        res.json({
            success: true,
            data: { quizzes },
            message: 'Popular quizzes retrieved successfully'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Error fetching popular quizzes', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch popular quizzes',
            message: 'An error occurred while fetching popular quizzes'
        });
    }
};
exports.getPopularQuizzes = getPopularQuizzes;
//# sourceMappingURL=quizController.js.map