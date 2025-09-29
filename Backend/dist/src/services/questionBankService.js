"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionBankService = void 0;
const models_1 = require("../models");
const logger_1 = require("../utils/logger");
const XLSX = require("xlsx");
class QuestionBankService {
    async createQuestion(data) {
        try {
            const question = await models_1.QuestionBankItem.create({
                questionText: data.questionText,
                categoryId: data.categoryId,
                difficulty: data.difficulty,
                createdById: data.createdById
            });
            const options = await models_1.QuestionBankOption.bulkCreate(data.options.map(option => ({
                ...option,
                questionId: question.id
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
            (0, logger_1.logInfo)('Question bank item created', { questionId: question.id });
            return question;
        }
        catch (error) {
            (0, logger_1.logError)('Error creating question bank item', error);
            throw error;
        }
    }
    async getQuestionsByCategory(categoryId, page = 1, limit = 20) {
        try {
            const skip = (page - 1) * limit;
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
                    offset: skip,
                    limit,
                    order: [['createdAt', 'DESC']]
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
            (0, logger_1.logError)('Error fetching questions by category', error);
            throw error;
        }
    }
    async getAllQuestions(page = 1, limit = 20, difficulty) {
        try {
            const skip = (page - 1) * limit;
            const where = { isActive: true };
            if (difficulty) {
                where.difficulty = difficulty;
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
                    offset: skip,
                    limit,
                    order: [['createdAt', 'DESC']]
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
            (0, logger_1.logError)('Error fetching all questions', error);
            throw error;
        }
    }
    async getQuestionById(id) {
        try {
            const question = await models_1.QuestionBankItem.findByPk(id, {
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
            return question;
        }
        catch (error) {
            (0, logger_1.logError)('Error fetching question by ID', error);
            throw error;
        }
    }
    async updateQuestion(id, data) {
        try {
            const updateData = {
                questionText: data.questionText,
                categoryId: data.categoryId,
                difficulty: data.difficulty
            };
            await models_1.QuestionBankItem.update(updateData, {
                where: { id }
            });
            if (data.options) {
                await models_1.QuestionBankOption.destroy({
                    where: { questionId: id }
                });
                await models_1.QuestionBankOption.bulkCreate(data.options.map(option => ({
                    ...option,
                    questionId: id
                })));
            }
            const question = await models_1.QuestionBankItem.findByPk(id, {
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
            (0, logger_1.logInfo)('Question bank item updated', { questionId: id });
            return question;
        }
        catch (error) {
            (0, logger_1.logError)('Error updating question bank item', error);
            throw error;
        }
    }
    async deleteQuestion(id) {
        try {
            await models_1.QuestionBankItem.update({ isActive: false }, { where: { id } });
            (0, logger_1.logInfo)('Question bank item deleted (soft delete)', { questionId: id });
            return true;
        }
        catch (error) {
            (0, logger_1.logError)('Error deleting question bank item', error);
            throw error;
        }
    }
    async bulkImport(data) {
        try {
            const results = [];
            for (const questionData of data.questions) {
                const question = await this.createQuestion({
                    ...questionData,
                    categoryId: data.categoryId,
                    createdById: data.createdById
                });
                results.push(question);
            }
            (0, logger_1.logInfo)('Bulk import completed', {
                categoryId: data.categoryId,
                questionsImported: results.length
            });
            return {
                imported: results.length,
                questions: results
            };
        }
        catch (error) {
            (0, logger_1.logError)('Error in bulk import', error);
            throw error;
        }
    }
    async parseExcelFile(buffer) {
        try {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            const questions = [];
            for (const row of jsonData) {
                const question = {
                    questionText: row['Question'] || row['question'],
                    difficulty: (row['Difficulty'] || row['difficulty'] || 'MEDIUM').toUpperCase(),
                    options: []
                };
                const options = [
                    { text: row['Option1'] || row['option1'], isCorrect: false },
                    { text: row['Option2'] || row['option2'], isCorrect: false },
                    { text: row['Option3'] || row['option3'], isCorrect: false },
                    { text: row['Option4'] || row['option4'], isCorrect: false }
                ].filter(opt => opt.text);
                const correctAnswer = row['CorrectAnswer'] || row['correctAnswer'] || row['correct_answer'];
                if (correctAnswer) {
                    const correctIndex = parseInt(correctAnswer) - 1;
                    if (correctIndex >= 0 && correctIndex < options.length) {
                        options[correctIndex].isCorrect = true;
                    }
                }
                question.options = options.map(opt => ({
                    optionText: opt.text,
                    isCorrect: opt.isCorrect
                }));
                if (question.options.some(opt => opt.isCorrect)) {
                    questions.push(question);
                }
            }
            return questions;
        }
        catch (error) {
            (0, logger_1.logError)('Error parsing Excel file', error);
            throw new Error('Invalid Excel file format');
        }
    }
    async searchQuestions(query, categoryId, difficulty) {
        try {
            const where = {
                isActive: true,
                questionText: {
                    contains: query,
                    mode: 'insensitive'
                }
            };
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
                    { model: models_1.Category, as: 'category' },
                    {
                        model: models_1.User,
                        as: 'createdBy',
                        attributes: ['id', 'username']
                    }
                ],
                order: [['createdAt', 'DESC']]
            });
            return questions;
        }
        catch (error) {
            (0, logger_1.logError)('Error searching questions', error);
            throw error;
        }
    }
}
exports.QuestionBankService = QuestionBankService;
//# sourceMappingURL=questionBankService.js.map