"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionBankService = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
var Difficulty;
(function (Difficulty) {
    Difficulty["EASY"] = "EASY";
    Difficulty["MEDIUM"] = "MEDIUM";
    Difficulty["HARD"] = "HARD";
})(Difficulty || (Difficulty = {}));
const XLSX = __importStar(require("xlsx"));
const prisma = new client_1.PrismaClient();
class QuestionBankService {
    async createQuestion(data) {
        try {
            const question = await prisma.questionBankItem.create({
                data: {
                    questionText: data.questionText,
                    categoryId: data.categoryId,
                    difficulty: data.difficulty,
                    createdById: data.createdById,
                    options: {
                        create: data.options
                    }
                },
                include: {
                    options: true,
                    category: true,
                    createdBy: {
                        select: {
                            id: true,
                            username: true
                        }
                    }
                }
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
                prisma.questionBankItem.findMany({
                    where: {
                        categoryId,
                        isActive: true
                    },
                    include: {
                        options: true,
                        category: true,
                        createdBy: {
                            select: {
                                id: true,
                                username: true
                            }
                        }
                    },
                    skip,
                    take: limit,
                    orderBy: {
                        createdAt: 'desc'
                    }
                }),
                prisma.questionBankItem.count({
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
                prisma.questionBankItem.findMany({
                    where,
                    include: {
                        options: true,
                        category: true,
                        createdBy: {
                            select: {
                                id: true,
                                username: true
                            }
                        }
                    },
                    skip,
                    take: limit,
                    orderBy: {
                        createdAt: 'desc'
                    }
                }),
                prisma.questionBankItem.count({ where })
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
            const question = await prisma.questionBankItem.findUnique({
                where: { id },
                include: {
                    options: true,
                    category: true,
                    createdBy: {
                        select: {
                            id: true,
                            username: true
                        }
                    }
                }
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
            if (data.options) {
                await prisma.questionBankOption.deleteMany({
                    where: { questionId: id }
                });
                updateData.options = {
                    create: data.options
                };
            }
            const question = await prisma.questionBankItem.update({
                where: { id },
                data: updateData,
                include: {
                    options: true,
                    category: true,
                    createdBy: {
                        select: {
                            id: true,
                            username: true
                        }
                    }
                }
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
            await prisma.questionBankItem.update({
                where: { id },
                data: { isActive: false }
            });
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
            const questions = await prisma.questionBankItem.findMany({
                where,
                include: {
                    options: true,
                    category: true,
                    createdBy: {
                        select: {
                            id: true,
                            username: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
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