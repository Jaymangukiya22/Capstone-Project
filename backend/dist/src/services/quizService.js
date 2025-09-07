"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quizService = exports.QuizService = void 0;
const server_1 = require("../server");
const logger_1 = require("../utils/logger");
class QuizService {
    async createQuiz(quizData, categoryId) {
        try {
            if (categoryId) {
                const category = await server_1.prisma.category.findUnique({
                    where: { id: categoryId }
                });
                if (!category) {
                    throw new Error('Category not found');
                }
            }
            const quizDataWithRelations = {
                title: quizData.title,
                description: quizData.description,
                difficulty: quizData.difficulty || 'MEDIUM',
                timeLimit: quizData.timeLimit,
                categoryId: categoryId
            };
            if (quizData.questions) {
                quizDataWithRelations.questions = {
                    create: quizData.questions.map(q => ({
                        questionText: q.questionText,
                        options: {
                            create: q.options.map(opt => ({
                                optionText: opt.optionText,
                                isCorrect: opt.isCorrect
                            }))
                        }
                    }))
                };
            }
            const quiz = await server_1.prisma.quiz.create({
                data: quizDataWithRelations,
                include: {
                    questions: {
                        include: {
                            options: true
                        }
                    },
                    category: true
                }
            });
            (0, logger_1.logInfo)('Quiz created', { quizId: quiz.id });
            return quiz;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to create quiz', error, { title: quizData.title });
            throw error;
        }
    }
    async getAllQuizzes(filters) {
        try {
            const where = {};
            if (filters?.difficulty) {
                where.difficulty = filters.difficulty;
            }
            if (filters?.categoryId) {
                where.categoryId = filters.categoryId;
            }
            const [quizzes, total] = await Promise.all([
                server_1.prisma.quiz.findMany({
                    where,
                    include: {
                        questions: {
                            include: {
                                options: true
                            }
                        },
                        category: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: filters?.limit || 50,
                    skip: filters?.offset || 0
                }),
                server_1.prisma.quiz.count({ where })
            ]);
            (0, logger_1.logInfo)('Retrieved quizzes', { count: quizzes.length, total });
            return { quizzes, total };
        }
        catch (error) {
            (0, logger_1.logError)('Failed to retrieve quizzes', error);
            throw error;
        }
    }
    async getQuizById(id) {
        try {
            const quiz = await server_1.prisma.quiz.findUnique({
                where: { id },
                include: {
                    questions: {
                        include: {
                            options: true
                        }
                    },
                    category: true
                }
            });
            if (quiz) {
                (0, logger_1.logInfo)('Retrieved quiz by ID', { quizId: id });
            }
            else {
                (0, logger_1.logInfo)('Quiz not found', { quizId: id });
            }
            return quiz;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to retrieve quiz', error, { quizId: id });
            throw error;
        }
    }
    async updateQuiz(id, data) {
        try {
            const existingQuiz = await server_1.prisma.quiz.findUnique({
                where: { id }
            });
            if (!existingQuiz) {
                throw new Error('Quiz not found');
            }
            const updateData = {
                title: data.title,
                description: data.description,
                difficulty: data.difficulty,
                timeLimit: data.timeLimit
            };
            Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
            const updatedQuiz = await server_1.prisma.quiz.update({
                where: { id },
                data: updateData,
                include: {
                    questions: {
                        include: {
                            options: true
                        }
                    },
                    category: true
                }
            });
            (0, logger_1.logInfo)('Quiz updated', { quizId: id });
            return updatedQuiz;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to update quiz', error, { quizId: id });
            throw error;
        }
    }
    async deleteQuiz(id) {
        try {
            await server_1.prisma.quiz.delete({
                where: { id }
            });
            (0, logger_1.logInfo)('Quiz deleted successfully', { quizId: id });
            return true;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to delete quiz', error, { quizId: id });
            return false;
        }
    }
    async updateQuestionCount(quizId) {
        try {
            const questionCount = await server_1.prisma.question.count({
                where: { quizId }
            });
            (0, logger_1.logInfo)('Quiz question count retrieved', { quizId, questionCount });
            return questionCount;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to get question count', error, { quizId });
            throw error;
        }
    }
    async getQuizStats(id) {
        try {
            const quiz = await server_1.prisma.quiz.findUnique({
                where: { id },
                include: {
                    questions: {
                        include: {
                            options: true
                        }
                    }
                }
            });
            if (!quiz) {
                return null;
            }
            const totalQuestions = quiz.questions.length;
            const totalOptions = quiz.questions.reduce((sum, q) => sum + q.options.length, 0);
            const correctOptions = quiz.questions.reduce((sum, q) => sum + q.options.filter((o) => o.isCorrect).length, 0);
            const stats = {
                id: quiz.id,
                title: quiz.title,
                description: quiz.description,
                difficulty: quiz.difficulty,
                timeLimit: quiz.timeLimit,
                categoryId: quiz.categoryId,
                totalQuestions,
                totalOptions,
                correctOptions,
                createdAt: quiz.createdAt,
                updatedAt: quiz.updatedAt
            };
            (0, logger_1.logInfo)('Quiz stats retrieved', { quizId: id, totalQuestions });
            return stats;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to retrieve quiz stats', error, { quizId: id });
            throw error;
        }
    }
}
exports.QuizService = QuizService;
exports.quizService = new QuizService();
//# sourceMappingURL=quizService.js.map