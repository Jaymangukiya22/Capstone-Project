import morgan from 'morgan';
import { Request, Response } from 'express';
import logger, { logInfo } from '../utils/logger';
import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

// Custom morgan stream to write to winston
const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  }
};

// Custom morgan token for request ID
morgan.token('id', (req: Request) => {
  return (req as any).id || 'unknown';
});

// Custom morgan token for user info
morgan.token('user', (req: Request) => {
  return (req as any).user?.username || 'anonymous';
});

// Development format
const devFormat = ':method :url :status :response-time ms - :res[content-length]';

// Production format with more details
const prodFormat = ':remote-addr - :user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms';

// Morgan middleware configuration
export const requestLogger = morgan(
  process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  { 
    stream,
    skip: (req: Request, res: Response) => {
      // Skip logging for health checks and metrics
      return req.url === '/health' || req.url === '/metrics';
    }
  }
);

// Enhanced request logging middleware
export const enhancedRequestLogger = (req: Request, res: Response, next: Function) => {
  const startTime = Date.now();
  
  // Add request ID
  (req as any).id = Math.random().toString(36).substr(2, 9);
  
  // Log request start
  logInfo('Request started', {
    requestId: (req as any).id,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  const originalEnd = res.end.bind(res);

  res.end = function (
    chunk?: any,
    encoding?: BufferEncoding | (() => void),
    cb?: () => void
  ): Response {
    const duration = Date.now() - startTime;
  
    logInfo('Request completed', {
      requestId: (req as any).id,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length') || 0,
      timestamp: new Date().toISOString()
    });
  
    // Handle overloads properly
    if (typeof encoding === 'function') {
      return originalEnd(chunk, encoding as any);
    }
    return originalEnd(chunk, encoding as BufferEncoding, cb);
  } as typeof res.end;

  next();
};

export default requestLogger;
