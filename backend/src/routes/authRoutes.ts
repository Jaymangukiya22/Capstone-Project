import { Router } from 'express';
import { register, login, refreshToken, getProfile, updateProfile } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { registerSchema, loginSchema, refreshTokenSchema, updateProfileSchema } from '../utils/validation';

const router = Router();

// Public routes
router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);
router.post('/refresh', validateRequest(refreshTokenSchema), refreshToken);

// Protected routes
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, validateRequest(updateProfileSchema), updateProfile);

export default router;
