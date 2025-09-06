import Joi from 'joi';

// Category validation schemas
export const categorySchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  parentId: Joi.number().integer().positive().optional().allow(null)
});

// Quiz validation schemas
export const createQuizSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().optional(),
  categoryId: Joi.number().integer().positive().required(),
  difficulty: Joi.string().valid('EASY', 'MEDIUM', 'HARD').default('MEDIUM'),
  timeLimit: Joi.number().integer().positive().optional()
});

// Question validation schemas
export const createQuestionSchema = Joi.object({
  quizId: Joi.number().integer().positive().required(),
  questionText: Joi.string().min(1).required(),
  options: Joi.array().items(
    Joi.object({
      optionText: Joi.string().min(1).required(),
      isCorrect: Joi.boolean().required()
    })
  ).min(2).max(4).required()
    .custom((value, helpers) => {
      const correctAnswers = value.filter((option: any) => option.isCorrect);
      if (correctAnswers.length === 0) {
        return helpers.error('custom.noCorrectAnswer');
      }
      return value;
    })
});

// Add question to existing quiz schema
export const addQuestionSchema = Joi.object({
  questionText: Joi.string().min(1).required(),
  options: Joi.array().items(
    Joi.object({
      optionText: Joi.string().min(1).required(),
      isCorrect: Joi.boolean().required()
    })
  ).min(2).max(4).required()
    .custom((value, helpers) => {
      const correctAnswers = value.filter((option: any) => option.isCorrect);
      if (correctAnswers.length === 0) {
        return helpers.error('custom.noCorrectAnswer');
      }
      return value;
    })
});

// Custom error messages
export const validationMessages = {
  'custom.noCorrectAnswer': 'At least one option must be marked as correct'
};

// Helper validation functions for testing
export const validateCategory = (data: any) => categorySchema.validate(data);

export const validateQuiz = (data: any) => {
  return createQuizSchema.validate(data);
};

export const validateQuestion = (data: any) => {
  return createQuestionSchema.validate(data);
};
