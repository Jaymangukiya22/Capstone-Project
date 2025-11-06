import { Router } from 'express';
import { categoryController } from '../controllers/categoryController';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/roleAuth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/categories/search - Search categories
router.get('/search', categoryController.searchCategories.bind(categoryController));

// GET /api/categories - Get all categories (with optional hierarchy query param)
router.get('/', categoryController.getAllCategories.bind(categoryController));

// GET /api/categories/:id - Get category by ID
router.get('/:id', categoryController.getCategoryById.bind(categoryController));

// GET /api/categories/:id/path - Get category path (breadcrumb)
router.get('/:id/path', categoryController.getCategoryPath.bind(categoryController));

// GET /api/categories/:id/subcategories - Get subcategories
router.get('/:id/subcategories', categoryController.getSubcategories.bind(categoryController));

// Admin-only routes
// POST /api/categories - Create a new category (Admin only)
router.post('/', requireAdmin, categoryController.createCategory.bind(categoryController));

// PUT /api/categories/:id - Update category (Admin only)
router.put('/:id', requireAdmin, categoryController.updateCategory.bind(categoryController));

// DELETE /api/categories/:id - Delete category (Admin only)
router.delete('/:id', requireAdmin, categoryController.deleteCategory.bind(categoryController));

export default router;
