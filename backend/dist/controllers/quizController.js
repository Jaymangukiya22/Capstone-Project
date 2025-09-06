"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quizController = exports.QuizController = void 0;
const quizService_1 = require("../services/quizService");
const validation_1 = require("../utils/validation");
class QuizController {
    async createQuiz(req, res, next) {
        try {
            const { error, value } = validation_1.createQuizSchema.validate(req.body);
            if (error) {
                res.status(400).json({
                    error: 'Validation error',
                    message: error.details[0].message
                });
                return;
            }
            const { title, description, categoryId, difficulty, timeLimit } = value;
            const quiz = await quizService_1.quizService.createQuiz(title, description, categoryId, difficulty, timeLimit);
            res.status(201).json({
                success: true,
                data: quiz,
                message: 'Quiz created successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getQuizById(req, res, next) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({
                    error: 'Invalid quiz ID',
                    message: 'Quiz ID must be a number'
                });
                return;
            }
            const quiz = await quizService_1.quizService.getQuizById(id);
            if (!quiz) {
                res.status(404).json({
                    error: 'Quiz not found',
                    message: `Quiz with ID ${id} does not exist`
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: quiz,
                message: 'Quiz retrieved successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getAllQuizzes(req, res, next) {
        try {
            const categoryId = req.query.categoryId ? parseInt(req.query.categoryId) : undefined;
            if (categoryId && isNaN(categoryId)) {
                res.status(400).json({
                    error: 'Invalid category ID',
                    message: 'Category ID must be a number'
                });
                return;
            }
            const quizzes = await quizService_1.quizService.getAllQuizzes(categoryId);
            res.status(200).json({
                success: true,
                data: quizzes,
                count: quizzes.length,
                message: 'Quizzes retrieved successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateQuiz(req, res, next) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({
                    error: 'Invalid quiz ID',
                    message: 'Quiz ID must be a number'
                });
                return;
            }
            const { title, description, categoryId, difficulty, timeLimit } = req.body;
            const quiz = await quizService_1.quizService.updateQuiz(id, title, description, categoryId, difficulty, timeLimit);
            res.status(200).json({
                success: true,
                data: quiz,
                message: 'Quiz updated successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteQuiz(req, res, next) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({
                    error: 'Invalid quiz ID',
                    message: 'Quiz ID must be a number'
                });
                return;
            }
            await quizService_1.quizService.deleteQuiz(id);
            res.status(200).json({
                success: true,
                message: 'Quiz deleted successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getQuizStats(req, res, next) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({
                    error: 'Invalid quiz ID',
                    message: 'Quiz ID must be a number'
                });
                return;
            }
            const stats = await quizService_1.quizService.getQuizStats(id);
            res.status(200).json({
                success: true,
                data: stats,
                message: 'Quiz statistics retrieved successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.QuizController = QuizController;
exports.quizController = new QuizController();
//# sourceMappingURL=quizController.js.map