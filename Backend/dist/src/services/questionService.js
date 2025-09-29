"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.questionService = exports.QuestionService = void 0;
const logger_1 = require("../utils/logger");
const models_1 = require("../models");
const QuestionBankItem_1 = require("../models/QuestionBankItem");
const sequelize_1 = require("sequelize");
class QuestionService {
    async createQuestion(data) {
        try {
            (0, logger_1.logInfo)('Creating new question', { categoryId: data.categoryId, questionText: data.questionText });
            const category = await models_1.Category.findByPk(data.categoryId);
            if (!category) {
                throw new Error('Category not found');
            }
            const hasCorrectAnswer = data.options.some(option => option.isCorrect);
            if (!hasCorrectAnswer) {
                throw new Error('At least one option must be marked as correct');
            }
            const question = await models_1.QuestionBankItem.create({
                categoryId: data.categoryId,
                createdById: data.createdById,
                questionText: data.questionText,
                difficulty: data.difficulty || QuestionBankItem_1.Difficulty.MEDIUM,
                isActive: true
            });
            const options = await models_1.QuestionBankOption.bulkCreate(data.options.map(option => ({
                questionId: question.id,
                optionText: option.optionText,
                isCorrect: option.isCorrect
            })));
            const completeQuestion = await models_1.QuestionBankItem.findByPk(question.id, {
                include: [
                    { model: models_1.QuestionBankOption, as: 'options' },
                    { model: models_1.Category, as: 'category' },
                    {
                        model: models_1.User,
                        as: 'createdBy',
                        attributes: ['id', 'username']
                    }
                ]
            });
            (0, logger_1.logInfo)('Question created successfully', { questionId: question.id });
            return completeQuestion;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to create question', error, { questionText: data.questionText });
            throw error;
        }
    }
    async getQuestionsByCategory(categoryId, page = 1, limit = 20) {
        try {
            const offset = (page - 1) * limit;
            const [questions, total] = await Promise.all([
                models_1.QuestionBankItem.findAll({
                    where: {
                        categoryId,
                        isActive: true
                    },
                    include: [
                        { model: models_1.QuestionBankOption, as: 'options' },
                        { model: models_1.Category, as: 'category' },
                        {
                            model: models_1.User,
                            as: 'createdBy',
                            attributes: ['id', 'username']
                        }
                    ],
                    order: [['createdAt', 'DESC']],
                    offset,
                    limit
                }),
                models_1.QuestionBankItem.count({
                    where: {
                        categoryId,
                        isActive: true
                    }
                })
            ]);
            return {
                questions,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        }
        catch (error) {
            (0, logger_1.logError)('Failed to get questions by category', error, { categoryId });
            throw error;
        }
    }
    async getQuestionById(id) {
        try {
            const question = await models_1.QuestionBankItem.findOne({
                where: { id, isActive: true },
                include: [
                    { model: models_1.QuestionBankOption, as: 'options' },
                    { model: models_1.Category, as: 'category' },
                    {
                        model: models_1.User,
                        as: 'createdBy',
                        attributes: ['id', 'username']
                    }
                ]
            });
            if (!question) {
                throw new Error('Question not found');
            }
            return question;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to get question by ID', error, { questionId: id });
            throw error;
        }
    }
    async updateQuestion(id, data) {
        try {
            const existingQuestion = await models_1.QuestionBankItem.findByPk(id);
            if (!existingQuestion) {
                throw new Error('Question not found');
            }
            await models_1.QuestionBankItem.update({
                questionText: data.questionText,
                difficulty: data.difficulty
            }, {
                where: { id }
            });
            if (data.options) {
                const hasCorrectAnswer = data.options.some(option => option.isCorrect);
                if (!hasCorrectAnswer) {
                    throw new Error('At least one option must be marked as correct');
                }
                await models_1.QuestionBankOption.destroy({
                    where: { questionId: id }
                });
                await models_1.QuestionBankOption.bulkCreate(data.options.map(option => ({
                    questionId: id,
                    optionText: option.optionText,
                    isCorrect: option.isCorrect
                })));
            }
            const updatedQuestion = await models_1.QuestionBankItem.findByPk(id, {
                include: [
                    { model: models_1.QuestionBankOption, as: 'options' },
                    { model: models_1.Category, as: 'category' },
                    {
                        model: models_1.User,
                        as: 'createdBy',
                        attributes: ['id', 'username']
                    }
                ]
            });
            (0, logger_1.logInfo)('Question updated successfully', { questionId: id });
            return updatedQuestion;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to update question', error, { questionId: id });
            throw error;
        }
    }
    async deleteQuestion(id) {
        try {
            await models_1.QuestionBankItem.update({ isActive: false }, { where: { id } });
            (0, logger_1.logInfo)('Question deleted (soft delete)', { questionId: id });
            return true;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to delete question', error, { questionId: id });
            throw error;
        }
    }
    async searchQuestions(filters) {
        try {
            const page = filters.page || 1;
            const limit = filters.limit || 20;
            const offset = (page - 1) * limit;
            const where = { isActive: true };
            if (filters.categoryId) {
                where.categoryId = filters.categoryId;
            }
            if (filters.difficulty) {
                where.difficulty = filters.difficulty;
            }
            if (filters.search) {
                where.questionText = {
                    [sequelize_1.Op.iLike]: `%${filters.search}%`
                };
            }
            const [questions, total] = await Promise.all([
                models_1.QuestionBankItem.findAll({
                    where,
                    include: [
                        { model: models_1.QuestionBankOption, as: 'options' },
                        { model: models_1.Category, as: 'category' },
                        {
                            model: models_1.User,
                            as: 'createdBy',
                            attributes: ['id', 'username']
                        }
                    ],
                    order: [['createdAt', 'DESC']],
                    offset,
                    limit
                }),
                models_1.QuestionBankItem.count({ where })
            ]);
            return {
                questions,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        }
        catch (error) {
            (0, logger_1.logError)('Failed to search questions', error, filters);
            throw error;
        }
    }
    async getRandomQuestions(categoryId, difficulty, count = 10) {
        try {
            const where = { isActive: true };
            if (categoryId) {
                where.categoryId = categoryId;
            }
            if (difficulty) {
                where.difficulty = difficulty;
            }
            const questions = await models_1.QuestionBankItem.findAll({
                where,
                include: [
                    { model: models_1.QuestionBankOption, as: 'options' },
                    { model: models_1.Category, as: 'category' }
                ],
                order: [['createdAt', 'DESC']],
                limit: count
            });
            return questions;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to get random questions', error, { categoryId, difficulty, count });
            throw error;
        }
    }
    async addQuestionToQuiz(quizId, questionText, options) {
        try {
            (0, logger_1.logInfo)('Adding question to quiz (deprecated method)', { quizId, questionText });
            let defaultCategory = await models_1.Category.findOne({ where: { name: 'General' } });
            if (!defaultCategory) {
                defaultCategory = await models_1.Category.create({
                    name: 'General',
                    description: 'Default category for quiz questions'
                });
            }
            const questionData = {
                categoryId: defaultCategory.id,
                createdById: 1,
                questionText,
                difficulty: QuestionBankItem_1.Difficulty.MEDIUM,
                options
            };
            return await this.createQuestion(questionData);
        }
        catch (error) {
            (0, logger_1.logError)('Failed to add question to quiz', error, { quizId, questionText });
            throw error;
        }
    }
    async getQuestionsByQuizId(quizId) {
        try {
            (0, logger_1.logInfo)('Getting questions by quiz ID (deprecated method)', { quizId });
            const questions = await models_1.QuestionBankItem.findAll({
                where: { isActive: true },
                include: [
                    { model: models_1.QuestionBankOption, as: 'options' },
                    { model: models_1.Category, as: 'category' },
                    {
                        model: models_1.User,
                        as: 'createdBy',
                        attributes: ['id', 'username']
                    }
                ],
                order: [['createdAt', 'DESC']],
                limit: 20
            });
            return questions;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to get questions by quiz ID', error, { quizId });
            throw error;
        }
    }
    async getQuestionStats(quizId) {
        try {
            (0, logger_1.logInfo)('Getting question statistics', { quizId });
            const totalQuestions = await models_1.QuestionBankItem.count({
                where: { isActive: true }
            });
            const questionsByDifficulty = await models_1.QuestionBankItem.findAll({
                where: { isActive: true },
                attributes: [
                    'difficulty',
                    [models_1.QuestionBankItem.sequelize.fn('COUNT', models_1.QuestionBankItem.sequelize.col('id')), 'count']
                ],
                group: ['difficulty'],
                raw: true
            });
            const questionsByCategory = await models_1.QuestionBankItem.findAll({
                where: { isActive: true },
                include: [
                    {
                        model: models_1.Category,
                        as: 'category',
                        attributes: ['name']
                    }
                ],
                attributes: [
                    'categoryId',
                    [models_1.QuestionBankItem.sequelize.fn('COUNT', models_1.QuestionBankItem.sequelize.col('QuestionBankItem.id')), 'count']
                ],
                group: ['categoryId', 'category.id', 'category.name'],
                raw: true
            });
            return {
                totalQuestions,
                byDifficulty: questionsByDifficulty,
                byCategory: questionsByCategory
            };
        }
        catch (error) {
            (0, logger_1.logError)('Failed to get question statistics', error, { quizId });
            throw error;
        }
    }
}
exports.QuestionService = QuestionService;
exports.questionService = new QuestionService();
//# sourceMappingURL=questionService.js.map