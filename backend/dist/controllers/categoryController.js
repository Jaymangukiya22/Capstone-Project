"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryController = exports.CategoryController = void 0;
const categoryService_1 = require("../services/categoryService");
const validation_1 = require("../utils/validation");
class CategoryController {
    async createCategory(req, res, next) {
        try {
            const { error, value } = validation_1.createCategorySchema.validate(req.body);
            if (error) {
                res.status(400).json({
                    error: 'Validation error',
                    message: error.details[0].message
                });
                return;
            }
            const { name, parentId } = value;
            const category = await categoryService_1.categoryService.createCategory(name, parentId);
            res.status(201).json({
                success: true,
                data: category,
                message: 'Category created successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getAllCategories(req, res, next) {
        try {
            const { hierarchy } = req.query;
            let categories;
            if (hierarchy === 'true') {
                categories = await categoryService_1.categoryService.getCategoryHierarchy();
            }
            else {
                categories = await categoryService_1.categoryService.getAllCategories();
            }
            res.status(200).json({
                success: true,
                data: categories,
                count: categories.length,
                message: 'Categories retrieved successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getCategoryById(req, res, next) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({
                    error: 'Invalid category ID',
                    message: 'Category ID must be a number'
                });
                return;
            }
            const category = await categoryService_1.categoryService.getCategoryById(id);
            if (!category) {
                res.status(404).json({
                    error: 'Category not found',
                    message: `Category with ID ${id} does not exist`
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: category,
                message: 'Category retrieved successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateCategory(req, res, next) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({
                    error: 'Invalid category ID',
                    message: 'Category ID must be a number'
                });
                return;
            }
            const { error, value } = validation_1.createCategorySchema.validate(req.body);
            if (error) {
                res.status(400).json({
                    error: 'Validation error',
                    message: error.details[0].message
                });
                return;
            }
            const { name, parentId } = value;
            const category = await categoryService_1.categoryService.updateCategory(id, name, parentId);
            res.status(200).json({
                success: true,
                data: category,
                message: 'Category updated successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteCategory(req, res, next) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({
                    error: 'Invalid category ID',
                    message: 'Category ID must be a number'
                });
                return;
            }
            await categoryService_1.categoryService.deleteCategory(id);
            res.status(200).json({
                success: true,
                message: 'Category deleted successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.CategoryController = CategoryController;
exports.categoryController = new CategoryController();
//# sourceMappingURL=categoryController.js.map