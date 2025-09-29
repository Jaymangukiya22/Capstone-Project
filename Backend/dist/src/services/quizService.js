"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quizService = exports.QuizService = void 0;
const models_1 = require("../models");
const logger_1 = require("../utils/logger");
const sequelize_1 = require("sequelize");
class QuizService {
    async createQuiz(quizData) {
        try {
            const category = await models_1.Category.findByPk(quizData.categoryId);
            if (!category) {
                throw new Error(`Category with ID ${quizData.categoryId} not found`);
            }
            const quiz = await models_1.Quiz.create({
                title: quizData.title,
                description: quizData.description,
                difficulty: quizData.difficulty || 'MEDIUM',
                timeLimit: quizData.timeLimit,
                maxQuestions: quizData.maxQuestions,
                categoryId: quizData.categoryId,
                createdById: quizData.createdById
            });
            const createdQuiz = await models_1.Quiz.findByPk(quiz.id, {
                include: [
                    { model: models_1.Category, as: 'category' },
                    {
                        model: models_1.User,
                        as: 'createdBy',
                        attributes: ['id', 'username']
                    }
                ]
            });
            (0, logger_1.logInfo)('Quiz created', { quizId: quiz.id, title: quiz.title });
            return createdQuiz;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to create quiz', error, { title: quizData.title });
            throw error;
        }
    }
    async assignQuestionsToQuiz(data) {
        try {
            const quiz = await models_1.Quiz.findByPk(data.quizId, {
                include: [{ model: models_1.Category, as: 'category' }]
            });
            if (!quiz) {
                throw new Error('Quiz not found');
            }
            const questions = await models_1.QuestionBankItem.findAll({
                where: {
                    id: { [sequelize_1.Op.in]: data.questionIds },
                    isActive: true
                }
            });
            if (questions.length !== data.questionIds.length) {
                throw new Error('Some questions not found or inactive');
            }
            await models_1.QuizQuestion.destroy({
                where: { quizId: data.quizId }
            });
            const assignments = await models_1.QuizQuestion.bulkCreate(data.questionIds.map((questionId, index) => ({
                quizId: data.quizId,
                questionId,
                order: index + 1
            })));
            const questionsToUpdate = questions.filter(q => !q.categoryId);
            if (questionsToUpdate.length > 0 && quiz.categoryId) {
                await models_1.QuestionBankItem.update({ categoryId: quiz.categoryId }, {
                    where: {
                        id: { [sequelize_1.Op.in]: questionsToUpdate.map(q => q.id) },
                        categoryId: null
                    }
                });
                (0, logger_1.logInfo)('Questions also assigned to quiz category', {
                    quizId: data.quizId,
                    categoryId: quiz.categoryId,
                    questionsUpdated: questionsToUpdate.length
                });
            }
            (0, logger_1.logInfo)('Questions assigned to quiz', {
                quizId: data.quizId,
                questionsAssigned: assignments.length
            });
            return assignments;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to assign questions to quiz', error);
            throw error;
        }
    }
    async searchQuizzes(filters) {
        try {
            const page = filters.page || 1;
            const limit = filters.limit || 20;
            const skip = (page - 1) * limit;
            const where = { isActive: true };
            if (filters.difficulty) {
                where.difficulty = filters.difficulty;
            }
            if (filters.categoryId) {
                where.categoryId = filters.categoryId;
            }
            if (filters.search) {
                where[sequelize_1.Op.or] = [
                    { title: { [sequelize_1.Op.iLike]: `%${filters.search}%` } },
                    { description: { [sequelize_1.Op.iLike]: `%${filters.search}%` } }
                ];
            }
            const [quizzes, total] = await Promise.all([
                models_1.Quiz.findAll({
                    where,
                    include: [
                        { model: models_1.Category, as: 'category' },
                        {
                            model: models_1.User,
                            as: 'createdBy',
                            attributes: ['id', 'username']
                        }
                    ],
                    order: [['createdAt', 'DESC']],
                    offset: skip,
                    limit
                }),
                models_1.Quiz.count({ where })
            ]);
            return {
                quizzes,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        }
        catch (error) {
            (0, logger_1.logError)('Failed to search quizzes', error);
            throw error;
        }
    }
    async getQuizById(id) {
        try {
            const quiz = await models_1.Quiz.findOne({
                where: { id, isActive: true },
                include: [
                    { model: models_1.Category, as: 'category' },
                    {
                        model: models_1.User,
                        as: 'createdBy',
                        attributes: ['id', 'username']
                    }
                ]
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
    async getQuizForPlay(id, userId) {
        try {
            const quiz = await models_1.Quiz.findOne({
                where: { id, isActive: true },
                include: [
                    { model: models_1.Category, as: 'category' }
                ]
            });
            if (!quiz) {
                throw new Error('Quiz not found');
            }
            const quizQuestions = await models_1.QuizQuestion.findAll({
                where: { quizId: id },
                include: [
                    {
                        model: models_1.QuestionBankItem,
                        as: 'question',
                        include: [
                            {
                                model: models_1.QuestionBankOption,
                                as: 'options'
                            }
                        ]
                    }
                ],
                order: [['order', 'ASC']]
            });
            const questions = quizQuestions.map(qq => {
                const options = qq.question.options.slice(0, 4);
                if (options.length !== 4) {
                    (0, logger_1.logError)('Question does not have exactly 4 options', new Error('Invalid question format'), {
                        questionId: qq.question.id,
                        optionCount: options.length
                    });
                }
                return {
                    id: qq.question.id,
                    questionText: qq.question.questionText,
                    difficulty: qq.question.difficulty,
                    options: options.map(opt => ({
                        id: opt.id,
                        optionText: opt.optionText,
                        isCorrect: opt.isCorrect
                    }))
                };
            });
            (0, logger_1.logInfo)('Quiz accessed for play', { quizId: id, userId, questionCount: questions.length });
            return {
                ...quiz.toJSON(),
                questions
            };
        }
        catch (error) {
            (0, logger_1.logError)('Failed to get quiz for play', error, { quizId: id, userId });
            throw error;
        }
    }
    async updateQuiz(id, data) {
        try {
            const existingQuiz = await models_1.Quiz.findByPk(id);
            if (!existingQuiz) {
                throw new Error('Quiz not found');
            }
            await models_1.Quiz.update({
                title: data.title,
                description: data.description,
                difficulty: data.difficulty,
                timeLimit: data.timeLimit,
                maxQuestions: data.maxQuestions,
                categoryId: data.categoryId
            }, {
                where: { id }
            });
            const updatedQuiz = await models_1.Quiz.findByPk(id, {
                include: [
                    { model: models_1.Category, as: 'category' },
                    {
                        model: models_1.User,
                        as: 'createdBy',
                        attributes: ['id', 'username']
                    }
                ]
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
            await models_1.Quiz.update({ isActive: false }, { where: { id } });
            (0, logger_1.logInfo)('Quiz deleted (soft delete)', { quizId: id });
            return true;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to delete quiz', error, { quizId: id });
            throw error;
        }
    }
    async getQuizStats(id) {
        try {
            const quiz = await models_1.Quiz.findByPk(id, {
                include: [
                    { model: models_1.Category, as: 'category' }
                ]
            });
            if (!quiz) {
                throw new Error('Quiz not found');
            }
            const stats = {
                totalAttempts: 0,
                averageScore: 0,
                completionRate: 0,
                popularityRank: 0
            };
            (0, logger_1.logInfo)('Retrieved quiz stats', { quizId: id });
            return {
                quiz,
                stats
            };
        }
        catch (error) {
            (0, logger_1.logError)('Failed to get quiz stats', error, { quizId: id });
            throw error;
        }
    }
    async getPopularQuizzes(limit = 10) {
        try {
            const quizzes = await models_1.Quiz.findAll({
                where: { isActive: true },
                include: [
                    { model: models_1.Category, as: 'category' },
                    {
                        model: models_1.User,
                        as: 'createdBy',
                        attributes: ['id', 'username']
                    }
                ],
                order: [['createdAt', 'DESC']],
                limit
            });
            return quizzes;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to get popular quizzes', error);
            throw error;
        }
    }
}
exports.QuizService = QuizService;
exports.quizService = new QuizService();
//# sourceMappingURL=quizService.js.map