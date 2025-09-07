"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.questionService = exports.QuestionService = void 0;
const logger_1 = require("../utils/logger");
const server_1 = require("../server");
class QuestionService {
    async createQuestion(data) {
        try {
            (0, logger_1.logInfo)('Creating new question', { quizId: data.quizId, questionText: data.questionText });
            const quiz = await server_1.prisma.quiz.findUnique({
                where: { id: data.quizId }
            });
            if (!quiz) {
                throw new Error('Quiz not found');
            }
            const hasCorrectAnswer = data.options.some(option => option.isCorrect);
            if (!hasCorrectAnswer) {
                throw new Error('At least one option must be marked as correct');
            }
            if (data.options.length < 2 || data.options.length > 4) {
                throw new Error('Question must have between 2 and 4 options');
            }
            const question = await server_1.prisma.question.create({
                data: {
                    quizId: data.quizId,
                    questionText: data.questionText,
                    options: {
                        create: data.options.map(option => ({
                            optionText: option.optionText,
                            isCorrect: option.isCorrect
                        }))
                    }
                },
                include: {
                    options: true,
                    quiz: {
                        select: {
                            id: true,
                            title: true
                        }
                    }
                }
            });
            (0, logger_1.logInfo)('Question created successfully', { questionId: question.id, quizId: data.quizId });
            return question;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to create question', error, { quizId: data.quizId });
            throw error;
        }
    }
    async addQuestionToQuiz(quizId, questionText, options) {
        return this.createQuestion({
            quizId,
            questionText,
            options
        });
    }
    async getQuestionsByQuizId(quizId) {
        try {
            const quiz = await server_1.prisma.quiz.findUnique({
                where: { id: quizId }
            });
            if (!quiz) {
                const error = new Error('Quiz not found');
                error.statusCode = 400;
                throw error;
            }
            const questions = await server_1.prisma.question.findMany({
                where: { quizId },
                include: {
                    options: true
                },
                orderBy: {
                    id: 'asc'
                }
            });
            (0, logger_1.logInfo)('Retrieved questions for quiz', { quizId, count: questions.length });
            return questions;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to retrieve questions', error, { quizId });
            throw error;
        }
    }
    async getQuestionById(id) {
        try {
            const question = await server_1.prisma.question.findUnique({
                where: { id },
                include: {
                    options: true,
                    quiz: {
                        select: {
                            id: true,
                            title: true
                        }
                    }
                }
            });
            if (question) {
                (0, logger_1.logInfo)('Question retrieved', { questionId: id });
            }
            else {
                (0, logger_1.logInfo)('Question not found', { questionId: id });
            }
            return question;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to retrieve question', error, { questionId: id });
            throw error;
        }
    }
    async updateQuestion(id, questionText, options) {
        try {
            const existingQuestion = await server_1.prisma.question.findUnique({
                where: { id },
                include: { options: true }
            });
            if (!existingQuestion) {
                throw new Error('Question not found');
            }
            if (options) {
                const hasCorrectAnswer = options.some(option => option.isCorrect);
                if (!hasCorrectAnswer) {
                    throw new Error('At least one option must be marked as correct');
                }
                if (options.length < 2 || options.length > 4) {
                    throw new Error('Question must have between 2 and 4 options');
                }
            }
            const updateData = {};
            if (questionText !== undefined) {
                updateData.questionText = questionText;
            }
            const updatedQuestion = await server_1.prisma.question.update({
                where: { id },
                data: updateData,
                include: {
                    options: true,
                    quiz: {
                        select: {
                            id: true,
                            title: true
                        }
                    }
                }
            });
            if (options) {
                await server_1.prisma.option.deleteMany({
                    where: { questionId: id }
                });
                await server_1.prisma.option.createMany({
                    data: options.map(option => ({
                        questionId: id,
                        optionText: option.optionText,
                        isCorrect: option.isCorrect
                    }))
                });
                const finalQuestion = await server_1.prisma.question.findUnique({
                    where: { id },
                    include: {
                        options: true,
                        quiz: {
                            select: {
                                id: true,
                                title: true
                            }
                        }
                    }
                });
                (0, logger_1.logInfo)('Question updated with new options', { questionId: id });
                return finalQuestion;
            }
            (0, logger_1.logInfo)('Question updated', { questionId: id });
            return updatedQuestion;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to update question', error, { questionId: id });
            throw error;
        }
    }
    async deleteQuestion(id) {
        try {
            const question = await server_1.prisma.question.findUnique({
                where: { id },
                select: { quizId: true }
            });
            if (!question) {
                (0, logger_1.logInfo)('Question not found for deletion', { questionId: id });
                return false;
            }
            await server_1.prisma.question.delete({
                where: { id }
            });
            (0, logger_1.logInfo)('Question deleted successfully', { questionId: id });
            return true;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to delete question', error, { questionId: id });
            throw error;
        }
    }
    async getQuestionStats(quizId) {
        try {
            const questions = await server_1.prisma.question.findMany({
                where: { quizId },
                include: {
                    options: true
                }
            });
            const totalQuestions = questions.length;
            const mcqQuestions = totalQuestions;
            const booleanQuestions = 0;
            const questionsWithMultipleCorrect = questions.filter((q) => q.options.filter((o) => o.isCorrect).length > 1).length;
            const questionsWithSingleCorrect = totalQuestions - questionsWithMultipleCorrect;
            const optionStats = questions.reduce((acc, q) => {
                acc.totalOptions += q.options.length;
                acc.correctOptions += q.options.filter((o) => o.isCorrect).length;
                return acc;
            }, { totalOptions: 0, correctOptions: 0 });
            const stats = {
                totalQuestions,
                mcqQuestions,
                booleanQuestions,
                questionsWithSingleCorrect,
                questionsWithMultipleCorrect,
                ...optionStats,
                averageOptionsPerQuestion: totalQuestions > 0 ? optionStats.totalOptions / totalQuestions : 0
            };
            (0, logger_1.logInfo)('Question stats retrieved', { quizId, totalQuestions });
            return stats;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to retrieve question stats', error, { quizId });
            throw error;
        }
    }
}
exports.QuestionService = QuestionService;
exports.questionService = new QuestionService();
//# sourceMappingURL=questionService.js.map