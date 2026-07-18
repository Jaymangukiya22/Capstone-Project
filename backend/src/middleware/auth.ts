import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../models';
import { logError } from '../utils/logger';
import { getRedisClient } from '../config/redis';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    role: UserRole;
  };
}

interface CachedAuthUser {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

const AUTH_CACHE_TTL_SECONDS = 60;
const authCacheKey = (userId: number) => `user:${userId}:auth`;

// Invalidation hook for logout/deactivation flows: no such endpoint exists on
// this branch today, but any future one must call this so a cached
// isActive/role snapshot cannot outlive the change for up to the TTL below.
export const invalidateAuthCache = async (userId: number): Promise<void> => {
  try {
    await getRedisClient().del(authCacheKey(userId));
  } catch (error) {
    logError('Failed to invalidate auth cache', error as Error, { userId });
  }
};

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

    // Redis cache (60s TTL): avoids a Postgres round trip on every
    // authenticated request. A deactivated user may keep access for up to
    // the TTL — acceptable per product decision.
    let user: CachedAuthUser | null = null;
    try {
      const cached = await getRedisClient().get(authCacheKey(decoded.userId));
      if (cached) user = JSON.parse(cached);
    } catch (error) {
      logError('Auth cache read failed, falling back to database', error as Error);
    }

    if (!user) {
      // Fetch user from database to ensure they still exist and are active
      const dbUser = await User.findByPk(decoded.userId, {
        attributes: ['id', 'username', 'email', 'role', 'isActive']
      });

      if (!dbUser) {
        res.status(401).json({
          success: false,
          error: 'INVALID_TOKEN',
          message: 'Your session has expired. Please log in again.'
        });
        return;
      }

      user = {
        id: dbUser.id,
        username: dbUser.username,
        email: dbUser.email,
        role: dbUser.role as UserRole,
        isActive: dbUser.isActive
      };

      try {
        await getRedisClient().set(
          authCacheKey(user.id),
          JSON.stringify(user),
          'EX',
          AUTH_CACHE_TTL_SECONDS
        );
      } catch (error) {
        logError('Auth cache write failed', error as Error);
      }
    }

    if (!user.isActive) {
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
