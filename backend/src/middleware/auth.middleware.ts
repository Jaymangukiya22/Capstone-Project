import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { prisma } from '@/config/database.config';
import { 
  AuthenticatedRequest, 
  JWTPayload, 
  AuthenticationError, 
  AuthorizationError 
} from '@/types/index.types';

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Access token is required');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
    
    // Fetch user from database to ensure they still exist and are active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
      }
    });

    if (!user) {
      throw new AuthenticationError('User not found or account deactivated');
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid access token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError('Access token has expired'));
    } else {
      next(error);
    }
  }
};

/**
 * Middleware to authorize specific roles
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new AuthorizationError(
          `Access denied. Required roles: ${allowedRoles.join(', ')}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = authorize(UserRole.ADMIN);

/**
 * Middleware to check if user is faculty or admin
 */
export const requireFaculty = authorize(UserRole.FACULTY, UserRole.ADMIN);

/**
 * Middleware to check if user is student, faculty, or admin
 */
export const requireStudent = authorize(UserRole.STUDENT, UserRole.FACULTY, UserRole.ADMIN);

/**
 * Middleware to check course ownership or admin access
 */
export const requireCourseAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    const courseId = req.params.courseId || req.body.courseId;
    
    if (!courseId) {
      throw new AuthorizationError('Course ID is required');
    }

    // Admin has access to all courses
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    // Check if user is the course creator (faculty)
    if (req.user.role === UserRole.FACULTY) {
      const course = await prisma.course.findFirst({
        where: {
          id: courseId,
          creatorId: req.user.id
        }
      });

      if (course) {
        return next();
      }
    }

    // Check if user is enrolled in the course (student)
    if (req.user.role === UserRole.STUDENT) {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          courseId: courseId,
          userId: req.user.id
        }
      });

      if (enrollment) {
        return next();
      }
    }

    throw new AuthorizationError('Access denied to this course');
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check quiz ownership or admin access
 */
export const requireQuizAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    const quizId = req.params.quizId || req.body.quizId;
    
    if (!quizId) {
      throw new AuthorizationError('Quiz ID is required');
    }

    // Admin has access to all quizzes
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        course: {
          include: {
            enrollments: {
              where: { userId: req.user.id }
            }
          }
        }
      }
    });

    if (!quiz) {
      throw new AuthorizationError('Quiz not found');
    }

    // Check if user is the quiz creator (faculty) or course creator
    if (req.user.role === UserRole.FACULTY) {
      if (quiz.creatorId === req.user.id || quiz.course.creatorId === req.user.id) {
        return next();
      }
    }

    // Check if user is enrolled in the course (student)
    if (req.user.role === UserRole.STUDENT && quiz.course.enrollments.length > 0) {
      return next();
    }

    throw new AuthorizationError('Access denied to this quiz');
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware - doesn't throw error if no token
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    
    if (!process.env.JWT_SECRET) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
      }
    });

    if (user) {
      req.user = user;
    }

    next();
  } catch (error) {
    // Ignore authentication errors in optional auth
    next();
  }
};
