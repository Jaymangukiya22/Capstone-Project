import { Router } from 'express';
import authRoutes from './auth.routes';
import courseRoutes from './course.routes';
import quizRoutes from './quiz.routes';
import leaderboardRoutes from './leaderboard.routes';

const router = Router();

// API version prefix
const API_VERSION = '/api/v1';

// Mount all route modules
router.use(`${API_VERSION}/auth`, authRoutes);
router.use(`${API_VERSION}/courses`, courseRoutes);
router.use(`${API_VERSION}/quizzes`, quizRoutes);
router.use(`${API_VERSION}/leaderboard`, leaderboardRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'QuizSpark API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API documentation endpoint
router.get(`${API_VERSION}`, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'QuizSpark API v1',
    endpoints: {
      auth: {
        base: `${API_VERSION}/auth`,
        endpoints: [
          'POST /register - Register new user',
          'POST /login - User login',
          'POST /refresh-token - Refresh access token',
          'POST /logout - User logout',
          'GET /profile - Get user profile',
          'PUT /profile - Update user profile',
          'PUT /change-password - Change password',
          'GET /users - Get all users (Admin)',
          'POST /users - Create user (Admin)',
          'DELETE /users/:userId - Delete user (Admin)',
        ]
      },
      courses: {
        base: `${API_VERSION}/courses`,
        endpoints: [
          'POST / - Create course (Faculty/Admin)',
          'GET / - Get all courses',
          'GET /my-courses - Get user courses',
          'GET /:courseId - Get course by ID',
          'PUT /:courseId - Update course',
          'DELETE /:courseId - Delete course',
          'POST /:courseId/enroll - Enroll in course',
          'DELETE /:courseId/unenroll - Unenroll from course',
          'GET /:courseId/leaderboard - Get course leaderboard',
        ]
      },
      quizzes: {
        base: `${API_VERSION}/quizzes`,
        endpoints: [
          'POST / - Create quiz (Faculty/Admin)',
          'GET /upcoming - Get upcoming quizzes',
          'GET /:quizId - Get quiz by ID',
          'PUT /:quizId - Update quiz',
          'DELETE /:quizId - Delete quiz',
          'POST /:quizId/schedule - Schedule quiz',
          'POST /:quizId/questions - Add question to quiz',
          'PUT /questions/:questionId - Update question',
          'DELETE /questions/:questionId - Delete question',
          'GET /course/:courseId - Get course quizzes',
        ]
      },
      leaderboard: {
        base: `${API_VERSION}/leaderboard`,
        endpoints: [
          'GET /course/:courseId - Get course leaderboard',
          'GET /global - Get global leaderboard',
          'GET /course/:courseId/stats - Get course rating stats',
          'POST /reset/:userId/:courseId - Reset user rating (Admin)',
        ]
      }
    }
  });
});

export default router;
