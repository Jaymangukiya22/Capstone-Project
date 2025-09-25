"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateQuestion = exports.validateQuiz = exports.validateCategory = exports.validationMessages = exports.joinMatchSchema = exports.createMatchSchema = exports.completeQuizSchema = exports.submitAnswerSchema = exports.startQuizSchema = exports.createQuestionSchema = exports.searchQuizzesSchema = exports.searchQuestionsSchema = exports.questionBankQuerySchema = exports.assignQuestionsSchema = exports.excelUploadSchema = exports.bulkImportSchema = exports.createQuestionBankSchema = exports.createQuizSchema = exports.categoryQuerySchema = exports.categoryUpdateSchema = exports.categorySchema = exports.updateProfileSchema = exports.refreshTokenSchema = exports.loginSchema = exports.registerSchema = void 0;
const joi_1 = require("joi");
exports.registerSchema = joi_1.default.object({
    username: joi_1.default.string().alphanum().min(3).max(50).required(),
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(6).max(100).required(),
    firstName: joi_1.default.string().min(1).max(50).optional(),
    lastName: joi_1.default.string().min(1).max(50).optional(),
    role: joi_1.default.string().valid('ADMIN', 'PLAYER').optional()
});
exports.loginSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().required()
});
exports.refreshTokenSchema = joi_1.default.object({
    refreshToken: joi_1.default.string().required()
});
exports.updateProfileSchema = joi_1.default.object({
    firstName: joi_1.default.string().min(1).max(50).optional(),
    lastName: joi_1.default.string().min(1).max(50).optional(),
    avatar: joi_1.default.string().uri().optional()
});
exports.categorySchema = joi_1.default.object({
    name: joi_1.default.string().min(1).max(100).required(),
    description: joi_1.default.string().min(1).max(500).optional().allow(null),
    parentId: joi_1.default.number().integer().positive().optional().allow(null),
    isActive: joi_1.default.boolean().optional().default(true)
});
exports.categoryUpdateSchema = joi_1.default.object({
    name: joi_1.default.string().min(1).max(100).optional(),
    description: joi_1.default.string().min(1).max(500).optional().allow(null),
    parentId: joi_1.default.number().integer().positive().optional().allow(null),
    isActive: joi_1.default.boolean().optional()
});
exports.categoryQuerySchema = joi_1.default.object({
    page: joi_1.default.number().integer().min(1).optional().default(1),
    limit: joi_1.default.number().integer().min(1).max(10000).optional().default(10),
    parentId: joi_1.default.alternatives().try(joi_1.default.number().integer().positive(), joi_1.default.string().valid('null'), joi_1.default.allow(null)).optional(),
    includeChildren: joi_1.default.boolean().optional().default(false),
    includeQuizzes: joi_1.default.alternatives().try(joi_1.default.boolean(), joi_1.default.string().valid('true', 'false')).optional(),
    depth: joi_1.default.number().integer().min(1).max(5).optional().default(1),
    isActive: joi_1.default.boolean().optional(),
    search: joi_1.default.string().min(1).max(100).optional(),
    hierarchy: joi_1.default.alternatives().try(joi_1.default.boolean(), joi_1.default.string().valid('true', 'false')).optional()
});
exports.createQuizSchema = joi_1.default.object({
    title: joi_1.default.string().min(1).max(200).required(),
    description: joi_1.default.string().optional().allow(''),
    difficulty: joi_1.default.string().valid('EASY', 'MEDIUM', 'HARD').default('MEDIUM'),
    timeLimit: joi_1.default.number().integer().positive().optional(),
    maxQuestions: joi_1.default.number().integer().positive().optional(),
    categoryId: joi_1.default.number().integer().positive().required()
});
exports.createQuestionBankSchema = joi_1.default.object({
    questionText: joi_1.default.string().min(1).required(),
    categoryId: joi_1.default.number().integer().positive().allow(null).optional(),
    difficulty: joi_1.default.string().valid('EASY', 'MEDIUM', 'HARD').default('MEDIUM'),
    options: joi_1.default.array().items(joi_1.default.object({
        optionText: joi_1.default.string().min(1).required(),
        isCorrect: joi_1.default.boolean().required()
    })).min(2).max(4).required()
        .custom((value, helpers) => {
        const correctAnswers = value.filter((option) => option.isCorrect);
        if (correctAnswers.length === 0) {
            return helpers.error('custom.noCorrectAnswer');
        }
        return value;
    })
});
exports.bulkImportSchema = joi_1.default.object({
    categoryId: joi_1.default.number().integer().positive().required(),
    questions: joi_1.default.array().items(joi_1.default.object({
        questionText: joi_1.default.string().min(1).required(),
        difficulty: joi_1.default.string().valid('EASY', 'MEDIUM', 'HARD').default('MEDIUM'),
        options: joi_1.default.array().items(joi_1.default.object({
            optionText: joi_1.default.string().min(1).required(),
            isCorrect: joi_1.default.boolean().required()
        })).min(2).max(4).required()
    })).min(1).required()
});
exports.excelUploadSchema = joi_1.default.object({
    categoryId: joi_1.default.number().integer().positive().required(),
    includeSubcategories: joi_1.default.boolean().optional().default(false),
    subcategoryDepth: joi_1.default.number().integer().min(1).max(10).optional().default(10)
});
exports.assignQuestionsSchema = joi_1.default.object({
    questionIds: joi_1.default.array().items(joi_1.default.number().integer().positive()).min(1).required()
});
exports.questionBankQuerySchema = joi_1.default.object({
    page: joi_1.default.number().integer().min(1).optional().default(1),
    limit: joi_1.default.number().integer().min(1).max(100).optional().default(10),
    categoryId: joi_1.default.number().integer().positive().optional(),
    difficulty: joi_1.default.string().valid('EASY', 'MEDIUM', 'HARD').optional(),
    isActive: joi_1.default.boolean().optional(),
    search: joi_1.default.string().min(1).max(100).optional()
});
exports.searchQuestionsSchema = joi_1.default.object({
    q: joi_1.default.string().min(1).max(200).required(),
    categoryId: joi_1.default.number().integer().positive().optional(),
    difficulty: joi_1.default.string().valid('EASY', 'MEDIUM', 'HARD').optional(),
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(10000).default(20)
});
exports.searchQuizzesSchema = joi_1.default.object({
    search: joi_1.default.string().min(1).max(200).optional(),
    categoryId: joi_1.default.number().integer().positive().optional(),
    difficulty: joi_1.default.string().valid('EASY', 'MEDIUM', 'HARD').optional(),
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(10000).default(20)
});
exports.createQuestionSchema = joi_1.default.object({
    quizId: joi_1.default.number().integer().positive().required(),
    questionText: joi_1.default.string().min(1).required(),
    options: joi_1.default.array().items(joi_1.default.object({
        optionText: joi_1.default.string().min(1).required(),
        isCorrect: joi_1.default.boolean().required()
    })).min(2).max(4).required()
        .custom((value, helpers) => {
        const correctAnswers = value.filter((option) => option.isCorrect);
        if (correctAnswers.length === 0) {
            return helpers.error('custom.noCorrectAnswer');
        }
        return value;
    })
});
exports.startQuizSchema = joi_1.default.object({
    quizId: joi_1.default.number().integer().positive().required()
});
exports.submitAnswerSchema = joi_1.default.object({
    questionId: joi_1.default.number().integer().positive().required(),
    selectedOptions: joi_1.default.array().items(joi_1.default.number().integer().positive()).min(1).required(),
    timeSpent: joi_1.default.number().integer().min(0).optional()
});
exports.completeQuizSchema = joi_1.default.object({});
exports.createMatchSchema = joi_1.default.object({
    quizId: joi_1.default.number().integer().positive().required(),
    maxPlayers: joi_1.default.number().integer().min(2).max(50).default(10),
    timeLimit: joi_1.default.number().integer().positive().optional()
});
exports.joinMatchSchema = joi_1.default.object({
    matchCode: joi_1.default.string().length(10).required()
});
exports.validationMessages = {
    'custom.noCorrectAnswer': 'At least one option must be marked as correct'
};
const validateCategory = (data) => exports.categorySchema.validate(data);
exports.validateCategory = validateCategory;
const validateQuiz = (data) => {
    return exports.createQuizSchema.validate(data);
};
exports.validateQuiz = validateQuiz;
const validateQuestion = (data) => {
    return exports.createQuestionSchema.validate(data);
};
exports.validateQuestion = validateQuestion;
//# sourceMappingURL=validation.js.map