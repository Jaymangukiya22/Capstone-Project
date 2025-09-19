import { Router } from 'express';
import { categoryController } from '../controllers/categoryController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Public routes (require authentication)
// router.use(authenticateToken);

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
// router.use(requireAdmin);

// POST /api/categories - Create a new category (Admin only)
router.post('/', categoryController.createCategory.bind(categoryController));

// PUT /api/categories/:id - Update category (Admin only)
router.put('/:id', categoryController.updateCategory.bind(categoryController));

// DELETE /api/categories/:id - Delete category (Admin only)
router.delete('/:id', categoryController.deleteCategory.bind(categoryController));

export default router;
