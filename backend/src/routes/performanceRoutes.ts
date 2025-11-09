import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getQuizPerformanceData, getStudentPerformance } from '../controllers/performanceController';

const router = Router();

// Get quiz performance data (admin only)
router.get('/quiz-performance', authenticateToken, getQuizPerformanceData);

// Get individual student performance (admin only)
router.get('/student-performance/:userId', authenticateToken, getStudentPerformance);

export default router;
