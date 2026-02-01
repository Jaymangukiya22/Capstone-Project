import { Request, Response } from 'express';
import { User, UserRole } from '../models';
import { hashPassword, comparePassword, generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/auth';
import { AuthenticatedRequest } from '../middleware/auth';
import { Op } from 'sequelize';
import { logInfo, logError } from '../utils/logger';
import jwt from 'jsonwebtoken';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Registration attempt:', { body: req.body });
    const { username, email, password, firstName, lastName, role } = req.body;

    // Check if user already exists
    console.log('Checking for existing user...');
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { username }]
      }
    });

    if (existingUser) {
      console.log('User already exists:', existingUser.username);
      res.status(409).json({
        success: false,
        error: 'User with this email or username already exists'
      });
      return;
    }

    // Hash password
    console.log('Hashing password...');
    const passwordHash = await hashPassword(password);

    // Create user
    console.log('Creating user with data:', { username, email, firstName, lastName, role });
    // Default to ADMIN for testing (change to PLAYER in production)
    const user = await User.create({
      username,
      email,
      passwordHash,
      firstName,
      lastName,
      role: UserRole.PLAYER  // Changed from PLAYER to ADMIN for testing
    });
    console.log('User created successfully:', user.id);

    // Return user without password
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      eloRating: user.eloRating,
      createdAt: user.createdAt
    };

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
        user: userResponse,
        token,
        refreshToken
      }
    });
  } catch (error) {
    const err: any = error;
    console.error('Detailed registration error:', {
      name: err?.name,
      message: err?.message,
      parent: err?.parent,
      original: err?.original,
    });
    logError('Registration error', err as Error, {
      body: req.body,
      name: err?.name,
      message: err?.message,
      parent: err?.parent,
      original: err?.original,
    });
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      message: 'An error occurred during registration'
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;
    const identifier = username || email;

    if (!identifier || !password) {
      res.status(400).json({
        success: false,
        error: 'validation error'
      });
      return;
    }

    // Find user by email or username (email field can contain username)
    const user = await User.findOne({
      where: {
        [identifier.includes('@') ? 'email' : 'username']: identifier
      }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        error: 'Account is inactive'
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
    await User.update(
      { lastLoginAt: new Date() },
      { where: { id: user.id } }
    );

    // Generate tokens
    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role as UserRole
    });

    const refreshToken = generateRefreshToken(user.id);

    // Return user without password - same structure as register
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      eloRating: user.eloRating,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    };

    logInfo('User logged in successfully', { userId: user.id, username: user.username });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Detailed login error:', error);
    logError('Login error', error as Error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: 'An error occurred during login',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'token required'
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as any;

    // Get user
    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'username', 'email', 'role', 'isActive', 'firstName', 'lastName']
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: 'Invalid token'
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
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: (user as any).firstName,
          lastName: (user as any).lastName,
          role: user.role,
        }
      }
    });
  } catch (error) {
    logError('Token refresh error', error as Error);
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    const user = await User.findByPk(userId, {
      attributes: [
        'id', 'username', 'email', 'firstName', 'lastName', 'avatar',
        'role', 'eloRating', 'totalMatches', 'wins', 'losses',
        'createdAt', 'lastLoginAt'
      ]
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
      data: user
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

    await User.update(
      { firstName, lastName, avatar },
      { where: { id: userId } }
    );

    const user = await User.findByPk(userId, {
      attributes: [
        'id', 'username', 'email', 'firstName', 'lastName', 'avatar',
        'role', 'eloRating', 'totalMatches', 'wins', 'losses'
      ]
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
