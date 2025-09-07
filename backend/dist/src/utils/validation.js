"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateQuestion = exports.validateQuiz = exports.validateCategory = exports.validationMessages = exports.addQuestionSchema = exports.createQuestionSchema = exports.createQuizSchema = exports.categorySchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.categorySchema = joi_1.default.object({
    name: joi_1.default.string().min(1).max(100).required(),
    parentId: joi_1.default.number().integer().positive().optional().allow(null),
    description: joi_1.default.string().optional().allow('')
});
exports.createQuizSchema = joi_1.default.object({
    title: joi_1.default.string().min(1).max(200).required(),
    description: joi_1.default.string().optional().allow(''),
    difficulty: joi_1.default.string().valid('EASY', 'MEDIUM', 'HARD').default('MEDIUM'),
    timeLimit: joi_1.default.number().integer().positive().optional()
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
exports.addQuestionSchema = joi_1.default.object({
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