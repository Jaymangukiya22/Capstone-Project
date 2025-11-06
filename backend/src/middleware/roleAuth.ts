import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { UserRole } from '../types/enums';

/**
 * Middleware to check if user has required role(s)
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
      return;
    }

    const userRole = req.user.role as UserRole;
    
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to access this resource'
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = requireRole(UserRole.ADMIN);

/**
 * Middleware to check if user is player (student)
 */
export const requirePlayer = requireRole(UserRole.PLAYER);
