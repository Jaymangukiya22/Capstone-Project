import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { JWTPayload } from '@/types/index.types';

/**
 * Generate JWT access token
 */
export const generateAccessToken = (payload: {
  userId: string;
  email: string;
  role: UserRole;
}): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return (jwt.sign as any)(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '7d',
      issuer: 'quizspark',
      audience: 'quizspark-users',
    }
  );
};

/**
 * Generate JWT refresh token
 */
export const generateRefreshToken = (userId: string): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return (jwt.sign as any)(
    { userId, type: 'refresh' },
    process.env.JWT_SECRET,
    {
      expiresIn: '30d',
      issuer: 'quizspark',
      audience: 'quizspark-refresh',
    }
  );
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): JWTPayload => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): { userId: string; type: string } => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
  
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid refresh token');
  }

  return decoded;
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = (payload: {
  userId: string;
  email: string;
  role: UserRole;
}) => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload.userId),
  };
};
