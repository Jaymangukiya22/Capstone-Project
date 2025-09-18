import { Request, Response, NextFunction } from 'express';
import { User, Category, Quiz, QuestionBankItem, QuizAttempt } from '../models';
import { logInfo, logError } from '../utils/logger';
import { MassiveSeeder } from '../seeders/massiveSeeder';
import { Op } from 'sequelize';

export class AdminController {
  async getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const role = req.query.role as string;
      const offset = (page - 1) * limit;

      const whereClause: any = {};
      if (role) {
        whereClause.role = role;
      }

      const { count, rows: users } = await User.findAndCountAll({
        where: whereClause,
        attributes: { exclude: ['password'] },
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      const totalPages = Math.ceil(count / limit);

      res.status(200).json({
        success: true,
        data: users,
        pagination: {
          total: count,
          page,
          totalPages,
          limit
        },
        message: 'Users retrieved successfully'
      });
    } catch (error) {
      logError('Failed to get users', error as Error);
      next(error);
    }
  }

  async updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = parseInt(req.params.id);
      const { isActive } = req.body;

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid user ID',
          message: 'User ID must be a number'
        });
        return;
      }

      const user = await User.findByPk(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          message: `User with ID ${userId} does not exist`
        });
        return;
      }

      await User.update({ isActive }, { where: { id: userId } });
      const updatedUser = await User.findByPk(userId, {
        attributes: { exclude: ['password'] }
      });

      res.status(200).json({
        success: true,
        data: updatedUser,
        message: 'User status updated successfully'
      });
    } catch (error) {
      logError('Failed to update user status', error as Error);
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid user ID',
          message: 'User ID must be a number'
        });
        return;
      }

      const user = await User.findByPk(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          message: `User with ID ${userId} does not exist`
        });
        return;
      }

      // Check if user has quiz attempts
      const attemptCount = await QuizAttempt.count({ where: { userId } });
      if (attemptCount > 0) {
        res.status(400).json({
          success: false,
          error: 'Cannot delete user',
          message: 'User has associated quiz attempts. Please reassign or delete attempts first.'
        });
        return;
      }

      await User.destroy({ where: { id: userId } });

      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      logError('Failed to delete user', error as Error);
      next(error);
    }
  }

  async getSystemStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [
        totalUsers,
        totalCategories,
        totalQuestions,
        totalQuizzes,
        totalAttempts,
        activeUsers,
        recentAttempts
      ] = await Promise.all([
        User.count(),
        Category.count(),
        QuestionBankItem.count(),
        Quiz.count(),
        QuizAttempt.count(),
        User.count({ where: { isActive: true } }),
        QuizAttempt.count({
          where: {
            createdAt: {
              [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          }
        })
      ]);

      const stats = {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers
        },
        content: {
          categories: totalCategories,
          questions: totalQuestions,
          quizzes: totalQuizzes
        },
        activity: {
          totalAttempts,
          recentAttempts
        },
        system: {
          uptime: process.uptime(),
          nodeVersion: process.version,
          platform: process.platform
        }
      };

      res.status(200).json({
        success: true,
        data: stats,
        message: 'System statistics retrieved successfully'
      });
    } catch (error) {
      logError('Failed to get system stats', error as Error);
      next(error);
    }
  }

  async seedDatabase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const seeder = new MassiveSeeder();
      await seeder.seed();

      res.status(200).json({
        success: true,
        message: 'Database seeded successfully'
      });
    } catch (error) {
      logError('Failed to seed database', error as Error);
      next(error);
    }
  }

  async clearDatabase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Clear in reverse dependency order
      await QuizAttempt.destroy({ where: {} });
      await Quiz.destroy({ where: {} });
      await QuestionBankItem.destroy({ where: {} });
      await Category.destroy({ where: {} });
      // Keep admin users
      await User.destroy({ where: { role: { [Op.ne]: 'ADMIN' } } });

      res.status(200).json({
        success: true,
        message: 'Database cleared successfully (admin users preserved)'
      });
    } catch (error) {
      logError('Failed to clear database', error as Error);
      next(error);
    }
  }

  async getSystemHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: 'connected' // Could add actual DB health check
      };

      res.status(200).json({
        success: true,
        data: health,
        message: 'System health check completed'
      });
    } catch (error) {
      logError('Failed to get system health', error as Error);
      next(error);
    }
  }

  async getSystemLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // This is a placeholder - in a real system you'd read from log files
      const logs = [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'System running normally'
        }
      ];

      res.status(200).json({
        success: true,
        data: logs,
        message: 'System logs retrieved successfully'
      });
    } catch (error) {
      logError('Failed to get system logs', error as Error);
      next(error);
    }
  }
}

export const adminController = new AdminController();
