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

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid access token'
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logError('JWT_SECRET not configured', new Error('Missing JWT_SECRET'));
      res.status(500).json({
        success: false,
        error: 'Server configuration error'
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
        error: 'Invalid or expired token',
        message: 'User not found or account deactivated'
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    logError('Authentication error', error as Error);
    res.status(403).json({
      success: false,
      error: 'Invalid token',
      message: 'Token verification failed'
    });
  }
};

export const requireRole = (roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `Required role: ${roles.join(' or ')}`
      });
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole([UserRole.ADMIN]);
export const requirePlayer = requireRole([UserRole.PLAYER, UserRole.ADMIN]);
