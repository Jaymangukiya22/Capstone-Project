import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Constant, valid bcrypt hash of a throwaway string. Used to equalize login
// timing when the user does not exist (see authController.login), so response
// time does not reveal whether an account exists.
export const DUMMY_PASSWORD_HASH =
  '$2b$10$ikLEnIxRtXueY9cC2QpzuuFhzntwlPuB9NnZdVUYEVPpu.GN39gU6';

export enum UserRole {
  ADMIN = 'ADMIN',
  PLAYER = 'PLAYER'
}

export interface TokenPayload {
  userId: number;
  username: string;
  email: string;
  role: UserRole;
}

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');  // 10 is faster, still secure
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const generateToken = (payload: TokenPayload): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign(payload, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  } as jwt.SignOptions);
};

export const generateRefreshToken = (userId: number): string => {
  const jwtSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_REFRESH_SECRET not configured');
  }

  return jwt.sign({ userId }, jwtSecret, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  } as jwt.SignOptions);
};

export const verifyRefreshToken = (token: string): { userId: number } => {
  const jwtSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_REFRESH_SECRET not configured');
  }

  return jwt.verify(token, jwtSecret) as { userId: number };
};
