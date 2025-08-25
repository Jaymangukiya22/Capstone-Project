import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/services/auth.service';
import { 
  AuthenticatedRequest, 
  LoginRequest, 
  RegisterRequest,
  ApiResponse 
} from '@/types/index.types';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Register a new user
   */
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const registerData: RegisterRequest = req.body;
      const result = await this.authService.register(registerData);

      const response: ApiResponse = {
        success: true,
        message: 'User registered successfully',
        data: result,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Login user
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const loginData: LoginRequest = req.body;
      const result = await this.authService.login(loginData);

      const response: ApiResponse = {
        success: true,
        message: 'Login successful',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Refresh access token
   */
  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const result = await this.authService.refreshToken(refreshToken);

      const response: ApiResponse = {
        success: true,
        message: 'Token refreshed successfully',
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get current user profile
   */
  getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }

      const profile = await this.authService.getProfile(req.user.id);

      const response: ApiResponse = {
        success: true,
        message: 'Profile retrieved successfully',
        data: profile,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update user profile
   */
  updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }

      const updateData = req.body;
      const updatedProfile = await this.authService.updateProfile(req.user.id, updateData);

      const response: ApiResponse = {
        success: true,
        message: 'Profile updated successfully',
        data: updatedProfile,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Change user password
   */
  changePassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new Error('User not authenticated'));
      }

      const { currentPassword, newPassword } = req.body;
      const result = await this.authService.changePassword(req.user.id, currentPassword, newPassword);

      const response: ApiResponse = {
        success: true,
        message: result.message,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all users (Admin only)
   */
  getAllUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, limit, search } = req.query as any;
      const result = await this.authService.getAllUsers(
        parseInt(page) || 1,
        parseInt(limit) || 10,
        search
      );

      const response: ApiResponse = {
        success: true,
        message: 'Users retrieved successfully',
        data: result.users,
      };

      // Add pagination info to response
      (response as any).pagination = result.pagination;

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create new user (Admin only)
   */
  createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userData: RegisterRequest = req.body;
      const result = await this.authService.createUser(userData);

      const response: ApiResponse = {
        success: true,
        message: 'User created successfully',
        data: result,
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete user (Admin only)
   */
  deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const result = await this.authService.deleteUser(userId);

      const response: ApiResponse = {
        success: true,
        message: result.message,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Logout user (client-side token removal)
   */
  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const response: ApiResponse = {
        success: true,
        message: 'Logout successful. Please remove tokens from client storage.',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
