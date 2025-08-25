import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '@/types/index.types';

/**
 * Generic validation middleware factory
 */
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessages = error.details.reduce((acc, detail) => {
        const field = detail.path.join('.');
        if (!acc[field]) {
          acc[field] = [];
        }
        acc[field].push(detail.message);
        return acc;
      }, {} as Record<string, string[]>);

      const validationError = new ValidationError('Validation failed');
      (validationError as any).errors = errorMessages;
      return next(validationError);
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

/**
 * Validation schemas for authentication
 */
export const authSchemas = {
  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    username: Joi.string().alphanum().min(3).max(30).required().messages({
      'string.alphanum': 'Username must contain only alphanumeric characters',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username cannot exceed 30 characters',
      'any.required': 'Username is required'
    }),
    password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required().messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
    firstName: Joi.string().min(1).max(50).required().messages({
      'string.min': 'First name is required',
      'string.max': 'First name cannot exceed 50 characters',
      'any.required': 'First name is required'
    }),
    lastName: Joi.string().min(1).max(50).required().messages({
      'string.min': 'Last name is required',
      'string.max': 'Last name cannot exceed 50 characters',
      'any.required': 'Last name is required'
    }),
    role: Joi.string().valid('ADMIN', 'FACULTY', 'STUDENT').optional().default('STUDENT')
  }),

  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required'
    })
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required().messages({
      'any.required': 'Refresh token is required'
    })
  })
};

/**
 * Validation schemas for courses
 */
export const courseSchemas = {
  create: Joi.object({
    title: Joi.string().min(1).max(200).required().messages({
      'string.min': 'Course title is required',
      'string.max': 'Course title cannot exceed 200 characters',
      'any.required': 'Course title is required'
    }),
    description: Joi.string().max(1000).optional().allow('').messages({
      'string.max': 'Course description cannot exceed 1000 characters'
    }),
    code: Joi.string().min(2).max(20).required().messages({
      'string.min': 'Course code must be at least 2 characters long',
      'string.max': 'Course code cannot exceed 20 characters',
      'any.required': 'Course code is required'
    }),
    imageUrl: Joi.string().uri().optional().allow('').messages({
      'string.uri': 'Please provide a valid image URL'
    })
  }),

  update: Joi.object({
    title: Joi.string().min(1).max(200).optional().messages({
      'string.min': 'Course title cannot be empty',
      'string.max': 'Course title cannot exceed 200 characters'
    }),
    description: Joi.string().max(1000).optional().allow('').messages({
      'string.max': 'Course description cannot exceed 1000 characters'
    }),
    code: Joi.string().min(2).max(20).optional().messages({
      'string.min': 'Course code must be at least 2 characters long',
      'string.max': 'Course code cannot exceed 20 characters'
    }),
    imageUrl: Joi.string().uri().optional().allow('').messages({
      'string.uri': 'Please provide a valid image URL'
    }),
    isActive: Joi.boolean().optional()
  }),

  enroll: Joi.object({
    userId: Joi.string().required().messages({
      'any.required': 'User ID is required'
    })
  })
};

/**
 * Validation schemas for quizzes
 */
export const quizSchemas = {
  create: Joi.object({
    title: Joi.string().min(1).max(200).required().messages({
      'string.min': 'Quiz title is required',
      'string.max': 'Quiz title cannot exceed 200 characters',
      'any.required': 'Quiz title is required'
    }),
    description: Joi.string().max(1000).optional().allow('').messages({
      'string.max': 'Quiz description cannot exceed 1000 characters'
    }),
    courseId: Joi.string().required().messages({
      'any.required': 'Course ID is required'
    }),
    timeLimit: Joi.number().integer().min(10).max(300).required().messages({
      'number.base': 'Time limit must be a number',
      'number.integer': 'Time limit must be a whole number',
      'number.min': 'Time limit must be at least 10 seconds',
      'number.max': 'Time limit cannot exceed 300 seconds (5 minutes)',
      'any.required': 'Time limit is required'
    }),
    scheduledAt: Joi.date().greater('now').optional().messages({
      'date.greater': 'Scheduled time must be in the future'
    })
  }),

  update: Joi.object({
    title: Joi.string().min(1).max(200).optional().messages({
      'string.min': 'Quiz title cannot be empty',
      'string.max': 'Quiz title cannot exceed 200 characters'
    }),
    description: Joi.string().max(1000).optional().allow('').messages({
      'string.max': 'Quiz description cannot exceed 1000 characters'
    }),
    timeLimit: Joi.number().integer().min(10).max(300).optional().messages({
      'number.base': 'Time limit must be a number',
      'number.integer': 'Time limit must be a whole number',
      'number.min': 'Time limit must be at least 10 seconds',
      'number.max': 'Time limit cannot exceed 300 seconds (5 minutes)'
    }),
    scheduledAt: Joi.date().greater('now').optional().allow(null).messages({
      'date.greater': 'Scheduled time must be in the future'
    }),
    status: Joi.string().valid('DRAFT', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED').optional()
  })
};

/**
 * Validation schemas for questions
 */
export const questionSchemas = {
  create: Joi.object({
    text: Joi.string().min(1).max(1000).required().messages({
      'string.min': 'Question text is required',
      'string.max': 'Question text cannot exceed 1000 characters',
      'any.required': 'Question text is required'
    }),
    imageUrl: Joi.string().uri().optional().allow('').messages({
      'string.uri': 'Please provide a valid image URL'
    }),
    timeLimit: Joi.number().integer().min(5).max(120).required().messages({
      'number.base': 'Time limit must be a number',
      'number.integer': 'Time limit must be a whole number',
      'number.min': 'Time limit must be at least 5 seconds',
      'number.max': 'Time limit cannot exceed 120 seconds',
      'any.required': 'Time limit is required'
    }),
    points: Joi.number().integer().min(1).max(1000).optional().default(100).messages({
      'number.base': 'Points must be a number',
      'number.integer': 'Points must be a whole number',
      'number.min': 'Points must be at least 1',
      'number.max': 'Points cannot exceed 1000'
    }),
    options: Joi.array().items(
      Joi.object({
        text: Joi.string().min(1).max(500).required().messages({
          'string.min': 'Option text is required',
          'string.max': 'Option text cannot exceed 500 characters',
          'any.required': 'Option text is required'
        }),
        imageUrl: Joi.string().uri().optional().allow('').messages({
          'string.uri': 'Please provide a valid image URL'
        }),
        isCorrect: Joi.boolean().required().messages({
          'any.required': 'Option correctness must be specified'
        })
      })
    ).min(2).max(6).required().messages({
      'array.min': 'At least 2 options are required',
      'array.max': 'Maximum 6 options are allowed',
      'any.required': 'Options are required'
    }).custom((value, helpers) => {
      const correctOptions = value.filter((option: any) => option.isCorrect);
      if (correctOptions.length !== 1) {
        return helpers.error('custom.exactlyOneCorrect');
      }
      return value;
    }).messages({
      'custom.exactlyOneCorrect': 'Exactly one option must be marked as correct'
    })
  }),

  update: Joi.object({
    text: Joi.string().min(1).max(1000).optional().messages({
      'string.min': 'Question text cannot be empty',
      'string.max': 'Question text cannot exceed 1000 characters'
    }),
    imageUrl: Joi.string().uri().optional().allow('').messages({
      'string.uri': 'Please provide a valid image URL'
    }),
    timeLimit: Joi.number().integer().min(5).max(120).optional().messages({
      'number.base': 'Time limit must be a number',
      'number.integer': 'Time limit must be a whole number',
      'number.min': 'Time limit must be at least 5 seconds',
      'number.max': 'Time limit cannot exceed 120 seconds'
    }),
    points: Joi.number().integer().min(1).max(1000).optional().messages({
      'number.base': 'Points must be a number',
      'number.integer': 'Points must be a whole number',
      'number.min': 'Points must be at least 1',
      'number.max': 'Points cannot exceed 1000'
    })
  })
};

/**
 * Validation schemas for user profile updates
 */
export const userSchemas = {
  updateProfile: Joi.object({
    firstName: Joi.string().min(1).max(50).optional().messages({
      'string.min': 'First name cannot be empty',
      'string.max': 'First name cannot exceed 50 characters'
    }),
    lastName: Joi.string().min(1).max(50).optional().messages({
      'string.min': 'Last name cannot be empty',
      'string.max': 'Last name cannot exceed 50 characters'
    }),
    avatar: Joi.string().uri().optional().allow('').messages({
      'string.uri': 'Please provide a valid avatar URL'
    })
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({
      'any.required': 'Current password is required'
    }),
    newPassword: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required().messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'New password is required'
    })
  })
};

/**
 * Query parameter validation schemas
 */
export const querySchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).optional().default(1).messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be a whole number',
      'number.min': 'Page must be at least 1'
    }),
    limit: Joi.number().integer().min(1).max(100).optional().default(10).messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be a whole number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
    search: Joi.string().max(100).optional().allow('').messages({
      'string.max': 'Search term cannot exceed 100 characters'
    }),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional().default('desc')
  })
};

/**
 * Middleware to validate query parameters
 */
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessages = error.details.reduce((acc, detail) => {
        const field = detail.path.join('.');
        if (!acc[field]) {
          acc[field] = [];
        }
        acc[field].push(detail.message);
        return acc;
      }, {} as Record<string, string[]>);

      const validationError = new ValidationError('Query validation failed');
      (validationError as any).errors = errorMessages;
      return next(validationError);
    }

    // Replace req.query with validated and sanitized data
    req.query = value;
    next();
  };
};
