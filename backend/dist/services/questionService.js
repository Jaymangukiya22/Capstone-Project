"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.questionService = exports.QuestionService = void 0;
const client_1 = require("@prisma/client");
const redis_1 = require("../utils/redis");
const prisma = new client_1.PrismaClient();
class QuestionService {
    async createQuestion(data) {
        const quiz = await prisma.quiz.findUnique({
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
        const question = await prisma.question.create({
            data: {
                quizId: data.quizId,
                questionText: data.questionText,
                options: {
                    create: data.options
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
        await redis_1.redisService.invalidateQuizCache(data.quizId);
        return question;
    }
    async addQuestionToQuiz(quizId, questionText, options) {
        return this.createQuestion({
            quizId,
            questionText,
            options
        });
    }
    async getQuestionsByQuizId(quizId) {
        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId }
        });
        if (!quiz) {
            throw new Error('Quiz not found');
        }
        return await prisma.question.findMany({
            where: { quizId },
            include: {
                options: true
            },
            orderBy: {
                id: 'asc'
            }
        });
    }
    async getQuestionById(id) {
        return await prisma.question.findUnique({
            where: { id },
            include: {
                options: true,
                quiz: {
                    include: {
                        category: true
                    }
                }
            }
        });
    }
    async updateQuestion(id, questionText, options) {
        const existingQuestion = await prisma.question.findUnique({
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
        const question = await prisma.question.update({
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
            await prisma.option.deleteMany({
                where: { questionId: id }
            });
            await prisma.option.createMany({
                data: options.map(option => ({
                    questionId: id,
                    optionText: option.optionText,
                    isCorrect: option.isCorrect
                }))
            });
            const updatedQuestion = await prisma.question.findUnique({
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
            await redis_1.redisService.invalidateQuizCache(existingQuestion.quizId);
            return updatedQuestion;
        }
        await redis_1.redisService.invalidateQuizCache(existingQuestion.quizId);
        return question;
    }
    async deleteQuestion(id) {
        const question = await prisma.question.findUnique({
            where: { id },
            select: { quizId: true }
        });
        if (!question) {
            throw new Error('Question not found');
        }
        await prisma.question.delete({
            where: { id }
        });
        await redis_1.redisService.invalidateQuizCache(question.quizId);
    }
    async getQuestionStats(quizId) {
        const questions = await prisma.question.findMany({
            where: { quizId },
            include: {
                options: true
            }
        });
        const totalQuestions = questions.length;
        const questionsWithMultipleCorrect = questions.filter(q => q.options.filter(o => o.isCorrect).length > 1).length;
        const questionsWithSingleCorrect = totalQuestions - questionsWithMultipleCorrect;
        const optionStats = questions.reduce((acc, q) => {
            acc.totalOptions += q.options.length;
            acc.correctOptions += q.options.filter(o => o.isCorrect).length;
            return acc;
        }, { totalOptions: 0, correctOptions: 0 });
        return {
            totalQuestions,
            questionsWithSingleCorrect,
            questionsWithMultipleCorrect,
            ...optionStats,
            averageOptionsPerQuestion: totalQuestions > 0 ? optionStats.totalOptions / totalQuestions : 0
        };
    }
}
exports.QuestionService = QuestionService;
exports.questionService = new QuestionService();
//# sourceMappingURL=questionService.js.map