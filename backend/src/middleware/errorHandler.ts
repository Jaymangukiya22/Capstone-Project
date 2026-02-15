import { Request, Response, NextFunction } from 'express';
import { logError, logWarn } from '../utils/logger';

interface CustomError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
}

const getFriendlyErrorCode = (error: CustomError): string => {
  if (typeof error.code === 'string' && error.code.length > 0) return error.code;
  if (typeof error.name === 'string' && error.name.length > 0) return error.name;
  return 'INTERNAL_ERROR';
};

const getFriendlyMessage = (error: CustomError, statusCode: number): string => {
  if (statusCode >= 500) return 'Something went wrong. Please try again.';
  if (error.message && error.message.length > 0) return error.message;
  return 'Request failed. Please try again.';
};

export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';
  let errorCode = getFriendlyErrorCode(error);

  // Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    statusCode = 400;
    errorCode = 'DATABASE_ERROR';
    message = 'Database operation failed';
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = error.message;
  }

  // Sequelize errors
  if (error.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    errorCode = 'CONFLICT';
    message = 'This record already exists.';
  }

  if (error.name === 'SequelizeValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Request validation failed.';
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Your session is invalid. Please log in again.';
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Your session has expired. Please log in again.';
  }

  // Log error with structured logging
  const errorMeta = {
    requestId: (req as any).id || 'unknown',
    method: req.method,
    url: req.url,
    statusCode,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString(),
    errorName: error.name,
    stack: error.stack
  };

  if (statusCode >= 500) {
    logError('Server error occurred', error, errorMeta);
  } else {
    logWarn('Client error occurred', { ...errorMeta, message });
  }

  // Development error response
  if (process.env.NODE_ENV === 'development') {
    return res.status(statusCode).json({
      success: false,
      error: errorCode,
      message: getFriendlyMessage(error, statusCode),
      details: error.message,
      stack: error.stack,
      requestId: (req as any).id
    });
  }

  // Production error response
  if (error.isOperational || statusCode < 500) {
    return res.status(statusCode).json({
      success: false,
      error: errorCode,
      message: getFriendlyMessage(error, statusCode),
      requestId: (req as any).id
    });
  }

  // Generic error message for production
  return res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: 'Something went wrong. Please try again.',
    requestId: (req as any).id
  });
};

export default errorHandler;
