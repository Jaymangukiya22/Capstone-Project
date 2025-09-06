import { Router } from 'express';
import { categoryController } from '../controllers/categoryController';

const router = Router();

// POST /api/categories - Create a new category
router.post('/', categoryController.createCategory.bind(categoryController));

// GET /api/categories - Get all categories (with optional hierarchy query param)
router.get('/', categoryController.getAllCategories.bind(categoryController));

// GET /api/categories/:id - Get category by ID
router.get('/:id', categoryController.getCategoryById.bind(categoryController));

// PUT /api/categories/:id - Update category
router.put('/:id', categoryController.updateCategory.bind(categoryController));

// DELETE /api/categories/:id - Delete category
router.delete('/:id', categoryController.deleteCategory.bind(categoryController));

export default router;
