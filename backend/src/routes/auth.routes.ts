import { Router } from 'express';
import { AuthController } from '@/controllers/auth.controller';
import { authenticate, requireAdmin } from '@/middleware/auth.middleware';
import { 
  validate, 
  validateQuery,
  authSchemas, 
  userSchemas,
  querySchemas 
} from '@/middleware/validation.middleware';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/register', validate(authSchemas.register), authController.register);
router.post('/login', validate(authSchemas.login), authController.login);
router.post('/refresh-token', validate(authSchemas.refreshToken), authController.refreshToken);

// Protected routes
router.use(authenticate); // All routes below require authentication

router.post('/logout', authController.logout);
router.get('/profile', authController.getProfile);
router.put('/profile', validate(userSchemas.updateProfile), authController.updateProfile);
router.put('/change-password', validate(userSchemas.changePassword), authController.changePassword);

// Admin only routes
router.get('/users', requireAdmin, validateQuery(querySchemas.pagination), authController.getAllUsers);
router.post('/users', requireAdmin, validate(authSchemas.register), authController.createUser);
router.delete('/users/:userId', requireAdmin, authController.deleteUser);

export default router;
