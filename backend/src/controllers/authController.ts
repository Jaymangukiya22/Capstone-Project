import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { hashPassword, comparePassword, generateToken, generateRefreshToken, verifyRefreshToken, UserRole } from '../utils/auth';
import { logInfo, logError } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, firstName, lastName, role } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        error: 'User already exists',
        message: 'Email or username already registered'
      });
      return;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        firstName,
        lastName,
        role: role || UserRole.PLAYER
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        eloRating: true,
        createdAt: true
      }
    });

    // Generate tokens
    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role as UserRole
    });

    const refreshToken = generateRefreshToken(user.id);

    logInfo('User registered successfully', { userId: user.id, username: user.username });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        token,
        refreshToken
      }
    });
  } catch (error) {
    logError('Registration error', error as Error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      message: 'An error occurred during registration'
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        username: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        role: true,
        eloRating: true,
        isActive: true,
        totalMatches: true,
        wins: true,
        losses: true
      }
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
      return;
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
      return;
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Generate tokens
    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role as UserRole
    });

    const refreshToken = generateRefreshToken(user.id);

    const { passwordHash, ...userWithoutPassword } = user;

    logInfo('User logged in successfully', { userId: user.id, username: user.username });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token,
        refreshToken
      }
    });
  } catch (error) {
    logError('Login error', error as Error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: 'An error occurred during login'
    });
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'Refresh token required'
      });
      return;
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
      return;
    }

    // Generate new tokens
    const newToken = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role as UserRole
    });

    const newRefreshToken = generateRefreshToken(user.id);

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    logError('Token refresh error', error as Error);
    res.status(401).json({
      success: false,
      error: 'Invalid refresh token'
    });
  }
};

export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        eloRating: true,
        totalMatches: true,
        wins: true,
        losses: true,
        createdAt: true,
        lastLoginAt: true
      }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    logError('Get profile error', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { firstName, lastName, avatar } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        avatar
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        eloRating: true,
        totalMatches: true,
        wins: true,
        losses: true
      }
    });

    logInfo('Profile updated successfully', { userId });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    logError('Update profile error', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
};
