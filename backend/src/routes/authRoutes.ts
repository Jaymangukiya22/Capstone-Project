import { Router } from 'express';
import { register, login, refreshToken, getProfile, updateProfile } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { registerSchema, loginSchema, refreshTokenSchema, updateProfileSchema } from '../utils/validation';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public routes (rate-limited: register/login only, not refresh)
router.post('/register', authLimiter, validateRequest(registerSchema), register);
router.post('/login', authLimiter, validateRequest(loginSchema), login);
router.post('/refresh', refreshToken);

// Protected routes
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, validateRequest(updateProfileSchema), updateProfile);

export default router;
