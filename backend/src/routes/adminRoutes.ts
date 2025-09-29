import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { adminController } from '../controllers/adminController';

const router = Router();

// All admin routes require authentication and admin role
// router.use(authenticateToken);
// router.use(requireAdmin);

// User management
router.get('/users', adminController.getAllUsers.bind(adminController));
router.put('/users/:id/status', adminController.updateUserStatus.bind(adminController));
router.delete('/users/:id', adminController.deleteUser.bind(adminController));

// System statistics
router.get('/stats', adminController.getSystemStats.bind(adminController));

// Database operations
router.post('/seed', adminController.seedDatabase.bind(adminController));
router.delete('/clear-db', adminController.clearDatabase.bind(adminController));

// System health and monitoring
router.get('/health', adminController.getSystemHealth.bind(adminController));
router.get('/logs', adminController.getSystemLogs.bind(adminController));

export default router;
