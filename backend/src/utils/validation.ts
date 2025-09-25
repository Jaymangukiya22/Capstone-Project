import * as Joi from 'joi'; 
// Authentication validation schemas
export const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(100).required(),
  firstName: Joi.string().min(1).max(50).optional(),
  lastName: Joi.string().min(1).max(50).optional(),
  role: Joi.string().valid('ADMIN', 'PLAYER').optional()
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required()
});

export const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(1).max(50).optional(),
  lastName: Joi.string().min(1).max(50).optional(),
  avatar: Joi.string().uri().optional()
});

// Category validation schemas
export const categorySchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().min(1).max(500).optional().allow(null),
  parentId: Joi.number().integer().positive().optional().allow(null),
  isActive: Joi.boolean().optional().default(true)
});

export const categoryUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().min(1).max(500).optional().allow(null),
  parentId: Joi.number().integer().positive().optional().allow(null),
  isActive: Joi.boolean().optional()
});

export const categoryQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(10000).optional().default(10),
  parentId: Joi.alternatives().try(
    Joi.number().integer().positive(),
    Joi.string().valid('null'),
    Joi.allow(null)
  ).optional(),
  includeChildren: Joi.boolean().optional().default(false),
  includeQuizzes: Joi.alternatives().try(
    Joi.boolean(),
    Joi.string().valid('true', 'false')
  ).optional(),
  depth: Joi.number().integer().min(1).max(5).optional().default(1),
  isActive: Joi.boolean().optional(),
  search: Joi.string().min(1).max(100).optional(),
  hierarchy: Joi.alternatives().try(
    Joi.boolean(),
    Joi.string().valid('true', 'false')
  ).optional()
});

// Quiz validation schemas
export const createQuizSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().optional().allow(''),
  difficulty: Joi.string().valid('EASY', 'MEDIUM', 'HARD').default('MEDIUM'),
  timeLimit: Joi.number().integer().positive().optional(),
  maxQuestions: Joi.number().integer().positive().optional(),
  categoryId: Joi.number().integer().positive().required()
});

// Question Bank validation schemas
export const createQuestionBankSchema = Joi.object({
  questionText: Joi.string().min(1).required(),
  categoryId: Joi.number().integer().positive().allow(null).optional(),
  difficulty: Joi.string().valid('EASY', 'MEDIUM', 'HARD').default('MEDIUM'),
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

export const bulkImportSchema = Joi.object({
  categoryId: Joi.number().integer().positive().required(),
  questions: Joi.array().items(
    Joi.object({
      questionText: Joi.string().min(1).required(),
      difficulty: Joi.string().valid('EASY', 'MEDIUM', 'HARD').default('MEDIUM'),
      options: Joi.array().items(
        Joi.object({
          optionText: Joi.string().min(1).required(),
          isCorrect: Joi.boolean().required()
        })
      ).min(2).max(4).required()
    })
  ).min(1).required()
});

// Excel upload validation schema
export const excelUploadSchema = Joi.object({
  categoryId: Joi.number().integer().positive().required(),
  includeSubcategories: Joi.boolean().optional().default(false),
  subcategoryDepth: Joi.number().integer().min(1).max(10).optional().default(10)
});

// Quiz Question Assignment
export const assignQuestionsSchema = Joi.object({
  questionIds: Joi.array().items(Joi.number().integer().positive()).min(1).required()
});

// Question Bank Query validation
export const questionBankQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  categoryId: Joi.number().integer().positive().optional(),
  difficulty: Joi.string().valid('EASY', 'MEDIUM', 'HARD').optional(),
  isActive: Joi.boolean().optional(),
  search: Joi.string().min(1).max(100).optional()
});

// Search validation schemas
export const searchQuestionsSchema = Joi.object({
  q: Joi.string().min(1).max(200).required(),
  categoryId: Joi.number().integer().positive().optional(),
  difficulty: Joi.string().valid('EASY', 'MEDIUM', 'HARD').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(10000).default(20)
});

export const searchQuizzesSchema = Joi.object({
  search: Joi.string().min(1).max(200).optional(),
  categoryId: Joi.number().integer().positive().optional(),
  difficulty: Joi.string().valid('EASY', 'MEDIUM', 'HARD').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(10000).default(20)
});

// Question validation schemas (legacy)
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

// Quiz Attempt schemas
export const startQuizSchema = Joi.object({
  quizId: Joi.number().integer().positive().required()
});

export const submitAnswerSchema = Joi.object({
  questionId: Joi.number().integer().positive().required(),
  selectedOptions: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
  timeSpent: Joi.number().integer().min(0).optional()
});

export const completeQuizSchema = Joi.object({
  // attemptId is passed as URL parameter, not in body
  // No body validation needed for complete quiz
});

// Match schemas
export const createMatchSchema = Joi.object({
  quizId: Joi.number().integer().positive().required(),
  maxPlayers: Joi.number().integer().min(2).max(50).default(10),
  timeLimit: Joi.number().integer().positive().optional()
});

export const joinMatchSchema = Joi.object({
  matchCode: Joi.string().length(10).required()
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
