"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quizService = exports.QuizService = void 0;
const client_1 = require("@prisma/client");
const redis_1 = require("../utils/redis");
const prisma = new client_1.PrismaClient();
class QuizService {
    async createQuiz(title, description, categoryId, difficulty = 'MEDIUM', timeLimit) {
        const category = await prisma.category.findUnique({
            where: { id: categoryId }
        });
        if (!category) {
            throw new Error('Category not found');
        }
        const quiz = await prisma.quiz.create({
            data: {
                title,
                description,
                categoryId,
                difficulty,
                timeLimit
            },
            include: {
                category: true,
                _count: {
                    select: {
                        questions: true
                    }
                }
            }
        });
        return quiz;
    }
    async getQuizById(id) {
        const cached = await redis_1.redisService.getCachedQuiz(id);
        if (cached) {
            return cached;
        }
        const quiz = await prisma.quiz.findUnique({
            where: { id },
            include: {
                category: {
                    include: {
                        parent: {
                            include: {
                                parent: {
                                    include: {
                                        parent: true
                                    }
                                }
                            }
                        }
                    }
                },
                questions: {
                    include: {
                        options: true
                    },
                    orderBy: {
                        id: 'asc'
                    }
                }
            }
        });
        if (quiz) {
            await redis_1.redisService.cacheQuiz(id, quiz, 300);
        }
        return quiz;
    }
    async getAllQuizzes(categoryId) {
        const where = categoryId ? { categoryId } : {};
        return await prisma.quiz.findMany({
            where,
            include: {
                category: true,
                _count: {
                    select: {
                        questions: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }
    async updateQuiz(id, title, description, categoryId, difficulty, timeLimit) {
        if (categoryId) {
            const category = await prisma.category.findUnique({
                where: { id: categoryId }
            });
            if (!category) {
                throw new Error('Category not found');
            }
        }
        const updateData = {};
        if (title !== undefined)
            updateData.title = title;
        if (description !== undefined)
            updateData.description = description;
        if (categoryId !== undefined)
            updateData.categoryId = categoryId;
        if (difficulty !== undefined)
            updateData.difficulty = difficulty;
        if (timeLimit !== undefined)
            updateData.timeLimit = timeLimit;
        const quiz = await prisma.quiz.update({
            where: { id },
            data: updateData,
            include: {
                category: true,
                _count: {
                    select: {
                        questions: true
                    }
                }
            }
        });
        await redis_1.redisService.invalidateQuizCache(id);
        return quiz;
    }
    async deleteQuiz(id) {
        await prisma.quiz.delete({
            where: { id }
        });
        await redis_1.redisService.invalidateQuizCache(id);
    }
    async getQuizzesByCategory(categoryId) {
        return await prisma.quiz.findMany({
            where: { categoryId },
            include: {
                category: true,
                _count: {
                    select: {
                        questions: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }
    async getQuizStats(id) {
        const quiz = await prisma.quiz.findUnique({
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
        if (!quiz) {
            throw new Error('Quiz not found');
        }
        const totalQuestions = quiz.questions.length;
        const totalOptions = quiz.questions.reduce((sum, q) => sum + q.options.length, 0);
        const correctOptions = quiz.questions.reduce((sum, q) => sum + q.options.filter(o => o.isCorrect).length, 0);
        return {
            id: quiz.id,
            title: quiz.title,
            category: quiz.category.name,
            difficulty: quiz.difficulty,
            timeLimit: quiz.timeLimit,
            totalQuestions,
            totalOptions,
            correctOptions,
            createdAt: quiz.createdAt,
            updatedAt: quiz.updatedAt
        };
    }
}
exports.QuizService = QuizService;
exports.quizService = new QuizService();
//# sourceMappingURL=quizService.js.map