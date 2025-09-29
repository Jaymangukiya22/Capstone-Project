import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logError } from '../utils/logger';

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));

      logError('Validation error', error);

      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Request validation failed',
        details: errorDetails
      });
      return;
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));

      logError('Query validation error', error);

      res.status(400).json({
        success: false,
        error: 'Query validation failed',
        message: 'Query parameters validation failed',
        details: errorDetails
      });
      return;
    }

    // Replace req.query with validated and sanitized data
    req.query = value;
    next();
  };
};

export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));

      logError('Params validation error', error);

      res.status(400).json({
        success: false,
        error: 'Parameters validation failed',
        message: 'URL parameters validation failed',
        details: errorDetails
      });
      return;
    }

    // Replace req.params with validated and sanitized data
    req.params = value;
    next();
  };
};
