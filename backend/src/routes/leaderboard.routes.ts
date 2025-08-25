import { Router } from 'express';
import { EloService } from '@/services/elo.service';
import { authenticate, requireAdmin } from '@/middleware/auth.middleware';
import { ApiResponse } from '@/types/index.types';
import { Request, Response, NextFunction } from 'express';

const router = Router();
const eloService = new EloService();

// Protected routes
router.use(authenticate);

/**
 * Get course leaderboard
 */
router.get('/course/:courseId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;
    const { limit } = req.query as any;
    
    const leaderboard = await eloService.getCourseLeaderboard(
      courseId, 
      parseInt(limit) || 50
    );

    const response: ApiResponse = {
      success: true,
      message: 'Course leaderboard retrieved successfully',
      data: leaderboard,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * Get global leaderboard
 */
router.get('/global', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit } = req.query as any;
    
    const leaderboard = await eloService.getGlobalLeaderboard(
      parseInt(limit) || 50
    );

    const response: ApiResponse = {
      success: true,
      message: 'Global leaderboard retrieved successfully',
      data: leaderboard,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * Get course rating statistics
 */
router.get('/course/:courseId/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;
    
    const stats = await eloService.getCourseRatingStats(courseId);

    const response: ApiResponse = {
      success: true,
      message: 'Course rating statistics retrieved successfully',
      data: stats,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * Reset user rating (Admin only)
 */
router.post('/reset/:userId/:courseId', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, courseId } = req.params;
    
    const resetRating = await eloService.resetUserRating(userId, courseId);

    const response: ApiResponse = {
      success: true,
      message: 'User rating reset successfully',
      data: resetRating,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
