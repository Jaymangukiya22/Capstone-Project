"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.questionController = exports.QuestionController = void 0;
const questionService_1 = require("../services/questionService");
const validation_1 = require("../utils/validation");
class QuestionController {
    async createQuestion(req, res, next) {
        try {
            const { error, value } = validation_1.createQuestionSchema.validate(req.body);
            if (error) {
                res.status(400).json({
                    error: 'Validation error',
                    message: error.details[0].message
                });
                return;
            }
            const question = await questionService_1.questionService.createQuestion(value);
            res.status(201).json({
                success: true,
                data: question,
                message: 'Question created successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async addQuestionToQuiz(req, res, next) {
        try {
            const quizId = parseInt(req.params.quizId);
            if (isNaN(quizId)) {
                res.status(400).json({
                    error: 'Invalid quiz ID',
                    message: 'Quiz ID must be a number'
                });
                return;
            }
            const { error, value } = validation_1.addQuestionSchema.validate(req.body);
            if (error) {
                res.status(400).json({
                    error: 'Validation error',
                    message: error.details[0].message
                });
                return;
            }
            const { questionText, options } = value;
            const question = await questionService_1.questionService.addQuestionToQuiz(quizId, questionText, options);
            res.status(201).json({
                success: true,
                data: question,
                message: 'Question added to quiz successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getQuestionsByQuizId(req, res, next) {
        try {
            const quizId = parseInt(req.params.quizId);
            if (isNaN(quizId)) {
                res.status(400).json({
                    error: 'Invalid quiz ID',
                    message: 'Quiz ID must be a number'
                });
                return;
            }
            const questions = await questionService_1.questionService.getQuestionsByQuizId(quizId);
            res.status(200).json({
                success: true,
                data: questions,
                count: questions.length,
                message: 'Questions retrieved successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getQuestionById(req, res, next) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({
                    error: 'Invalid question ID',
                    message: 'Question ID must be a number'
                });
                return;
            }
            const question = await questionService_1.questionService.getQuestionById(id);
            if (!question) {
                res.status(404).json({
                    error: 'Question not found',
                    message: `Question with ID ${id} does not exist`
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: question,
                message: 'Question retrieved successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateQuestion(req, res, next) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({
                    error: 'Invalid question ID',
                    message: 'Question ID must be a number'
                });
                return;
            }
            const { questionText, options } = req.body;
            if (options) {
                const { error } = validation_1.addQuestionSchema.validate({ questionText: questionText || 'temp', options });
                if (error) {
                    res.status(400).json({
                        error: 'Validation error',
                        message: error.details[0].message
                    });
                    return;
                }
            }
            const question = await questionService_1.questionService.updateQuestion(id, questionText, options);
            res.status(200).json({
                success: true,
                data: question,
                message: 'Question updated successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteQuestion(req, res, next) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({
                    error: 'Invalid question ID',
                    message: 'Question ID must be a number'
                });
                return;
            }
            await questionService_1.questionService.deleteQuestion(id);
            res.status(200).json({
                success: true,
                message: 'Question deleted successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getQuestionStats(req, res, next) {
        try {
            const quizId = parseInt(req.params.quizId);
            if (isNaN(quizId)) {
                res.status(400).json({
                    error: 'Invalid quiz ID',
                    message: 'Quiz ID must be a number'
                });
                return;
            }
            const stats = await questionService_1.questionService.getQuestionStats(quizId);
            res.status(200).json({
                success: true,
                data: stats,
                message: 'Question statistics retrieved successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.QuestionController = QuestionController;
exports.questionController = new QuestionController();
//# sourceMappingURL=questionController.js.map