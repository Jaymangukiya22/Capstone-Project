import { Request, Response, NextFunction } from 'express';
import { logError, logWarn } from '../utils/logger';

interface CustomError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';

  // Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    statusCode = 400;
    message = 'Database operation failed';
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = error.message;
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
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
      message,
      error: error.message,
      stack: error.stack,
      requestId: (req as any).id
    });
  }

  // Production error response
  if (error.isOperational || statusCode < 500) {
    return res.status(statusCode).json({
      success: false,
      message,
      requestId: (req as any).id
    });
  }

  // Generic error message for production
  return res.status(500).json({
    success: false,
    message: 'Something went wrong',
    requestId: (req as any).id
  });
};

export default errorHandler;
