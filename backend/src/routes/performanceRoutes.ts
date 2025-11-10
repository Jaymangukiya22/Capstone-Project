import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { getQuizPerformanceData, getStudentPerformance, getFriendMatchHistory, getMyMatchHistory, getCombinedQuizPerformance } from '../controllers/performanceController';

const router = Router();

// Get combined quiz performance data (Solo VS AI + Friend Matches) (admin only)
router.get('/quiz-performance', authenticateToken, requireAdmin, getCombinedQuizPerformance);

// Get solo quiz performance data only (admin only)
router.get('/solo-performance', authenticateToken, requireAdmin, getQuizPerformanceData);

// Get individual student performance (admin only)
router.get('/student-performance/:userId', authenticateToken, requireAdmin, getStudentPerformance);

// Get friend match history (admin only)
router.get('/friend-matches', authenticateToken, requireAdmin, getFriendMatchHistory);

// Get my match history (player can see their own)
router.get('/my-matches', authenticateToken, getMyMatchHistory);

export default router;
