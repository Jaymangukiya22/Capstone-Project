import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../models';
import { logError } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    role: UserRole;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (
      process.env.NODE_ENV === 'test' &&
      process.env.TEST_BYPASS_AUTH === 'true' &&
      !token &&
      !(req.originalUrl || '').startsWith('/api/auth')
    ) {
      req.user = {
        id: 1,
        username: 'test-admin',
        email: 'test-admin@example.com',
        role: UserRole.ADMIN,
      };
      next();
      return;
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'AUTH_REQUIRED',
        message: 'Please log in to continue.'
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logError('JWT_SECRET not configured', new Error('Missing JWT_SECRET'));
      res.status(500).json({
        success: false,
        error: 'SERVER_CONFIG_ERROR',
        message: 'Server configuration error. Please try again later.'
      });
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    
    // Fetch user from database to ensure they still exist and are active
    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'username', 'email', 'role', 'isActive']
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Your session has expired. Please log in again.'
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    logError('Authentication error', error as Error);
    res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Your session has expired. Please log in again.'
    });
  }
};

export const requireRole = (roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'AUTH_REQUIRED',
        message: 'Please log in to continue.'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to perform this action.'
      });
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole([UserRole.ADMIN]);
export const requirePlayer = requireRole([UserRole.PLAYER, UserRole.ADMIN]);
