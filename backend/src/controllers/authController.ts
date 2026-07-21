import { Request, Response } from 'express';
import { User, UserRole } from '../models';
import { hashPassword, comparePassword, generateToken, generateRefreshToken, verifyRefreshToken, DUMMY_PASSWORD_HASH } from '../utils/auth';
import { AuthenticatedRequest } from '../middleware/auth';
import { UniqueConstraintError } from 'sequelize';
import { logInfo, logError } from '../utils/logger';
import jwt from 'jsonwebtoken';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create directly and rely on the DB unique constraints (email/username).
    // A pre-insert findOne existence check is a TOCTOU race under concurrency;
    // the UniqueConstraintError catch below handles duplicates atomically.
    const user = await User.create({
      username,
      email,
      passwordHash,
      firstName,
      lastName,
      role: UserRole.PLAYER
    });

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
    // Handled locally (not rethrown to the global errorHandler) so the
    // response keeps the specific USER_ALREADY_EXISTS code.
    if (error instanceof UniqueConstraintError) {
      res.status(409).json({
        success: false,
        error: 'USER_ALREADY_EXISTS',
        message: 'An account with this email or username already exists. Please log in instead.'
      });
      return;
    }

    const err: any = error;
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
        error: 'VALIDATION_ERROR',
        message: 'Please enter your email/username and password.'
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
      // Username enumeration defenses: same error code as a wrong password,
      // and a dummy bcrypt compare so the response time matches the
      // user-found path (no timing side-channel).
      await comparePassword(password, DUMMY_PASSWORD_HASH);
      res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Email/username or password is incorrect.'
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        error: 'ACCOUNT_INACTIVE',
        message: 'Your account is inactive. Please contact support.'
      });
      return;
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Email/username or password is incorrect.'
      });
      return;
    }

    // Update last login — fire-and-forget; login must not block on this write
    User.update(
      { lastLoginAt: new Date() },
      { where: { id: user.id } }
    ).catch(err => logError('lastLoginAt update failed', err as Error));

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
        error: 'AUTH_REQUIRED',
        message: 'Please log in to continue.'
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      res.status(500).json({
        success: false,
        error: 'SERVER_CONFIG_ERROR',
        message: 'Server configuration error. Please try again later.'
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
        error: 'INVALID_TOKEN',
        message: 'Your session has expired. Please log in again.'
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
      error: 'INVALID_TOKEN',
      message: 'Your session has expired. Please log in again.'
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
        error: 'USER_NOT_FOUND',
        message: 'User not found.'
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
      error: 'PROFILE_FETCH_FAILED',
      message: 'Could not load your profile right now. Please try again.'
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
      error: 'PROFILE_UPDATE_FAILED',
      message: 'Could not update your profile right now. Please try again.'
    });
  }
};
