"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const categoryController_1 = require("../controllers/categoryController");
const router = (0, express_1.Router)();
router.get('/search', categoryController_1.categoryController.searchCategories.bind(categoryController_1.categoryController));
router.get('/', categoryController_1.categoryController.getAllCategories.bind(categoryController_1.categoryController));
router.get('/:id', categoryController_1.categoryController.getCategoryById.bind(categoryController_1.categoryController));
router.get('/:id/path', categoryController_1.categoryController.getCategoryPath.bind(categoryController_1.categoryController));
router.get('/:id/subcategories', categoryController_1.categoryController.getSubcategories.bind(categoryController_1.categoryController));
router.post('/', categoryController_1.categoryController.createCategory.bind(categoryController_1.categoryController));
router.put('/:id', categoryController_1.categoryController.updateCategory.bind(categoryController_1.categoryController));
router.delete('/:id', categoryController_1.categoryController.deleteCategory.bind(categoryController_1.categoryController));
exports.default = router;
//# sourceMappingURL=categoryRoutes.js.map