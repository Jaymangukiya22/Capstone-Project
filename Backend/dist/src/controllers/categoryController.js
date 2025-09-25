"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryController = exports.CategoryController = void 0;
const categoryService_1 = require("../services/categoryService");
const validation_1 = require("../utils/validation");
class CategoryController {
    async createCategory(req, res, next) {
        try {
            const { error, value } = validation_1.categorySchema.validate(req.body);
            if (error) {
                res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    message: error.details[0].message
                });
                return;
            }
            const category = await categoryService_1.categoryService.createCategory(value);
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
            const { error, value } = validation_1.categoryQuerySchema.validate(req.query);
            if (error) {
                res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    message: error.details[0].message
                });
                return;
            }
            const { hierarchy, includeQuizzes, ...options } = value;
            let result;
            if (hierarchy === 'true') {
                try {
                    const categories = await categoryService_1.categoryService.getCategoryHierarchy(options.depth || 5, includeQuizzes === 'true' || includeQuizzes === true);
                    console.log('🔍 Backend Hierarchy Response:', categories.length, 'root categories found');
                    if (categories.length === 0) {
                        console.log('🔍 No root categories found, falling back to all categories');
                        const allCategories = await categoryService_1.categoryService.getAllCategories({
                            limit: 1000,
                            isActive: true
                        });
                        result = allCategories;
                    }
                    else {
                        result = {
                            categories,
                            total: categories.length,
                            page: 1,
                            totalPages: 1
                        };
                    }
                }
                catch (error) {
                    console.log('🔍 Hierarchy failed, falling back to all categories:', error);
                    result = await categoryService_1.categoryService.getAllCategories({
                        limit: 1000,
                        isActive: true
                    });
                }
            }
            else {
                result = await categoryService_1.categoryService.getAllCategories(options);
            }
            res.status(200).json({
                success: true,
                data: result.categories,
                pagination: {
                    total: result.total,
                    page: result.page,
                    totalPages: result.totalPages,
                    limit: options.limit || 10
                },
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
                    success: false,
                    error: 'Invalid category ID',
                    message: 'Category ID must be a number'
                });
                return;
            }
            const { error, value } = validation_1.categoryUpdateSchema.validate(req.body);
            if (error) {
                res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    message: error.details[0].message
                });
                return;
            }
            const category = await categoryService_1.categoryService.updateCategory(id, value);
            if (!category) {
                res.status(404).json({
                    success: false,
                    error: 'Category not found',
                    message: `Category with ID ${id} does not exist`
                });
                return;
            }
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
                    success: false,
                    error: 'Invalid category ID',
                    message: 'Category ID must be a number'
                });
                return;
            }
            const success = await categoryService_1.categoryService.deleteCategory(id);
            if (!success) {
                res.status(404).json({
                    success: false,
                    error: 'Category not found',
                    message: `Category with ID ${id} does not exist`
                });
                return;
            }
            res.status(200).json({
                success: true,
                message: 'Category deleted successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getCategoryPath(req, res, next) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid category ID',
                    message: 'Category ID must be a number'
                });
                return;
            }
            const path = await categoryService_1.categoryService.getCategoryPath(id);
            res.status(200).json({
                success: true,
                data: path,
                message: 'Category path retrieved successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getSubcategories(req, res, next) {
        try {
            const parentId = parseInt(req.params.id);
            if (isNaN(parentId)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid parent category ID',
                    message: 'Parent category ID must be a number'
                });
                return;
            }
            const depth = parseInt(req.query.depth) || 1;
            const subcategories = await categoryService_1.categoryService.getSubcategories(parentId, depth);
            res.status(200).json({
                success: true,
                data: subcategories,
                count: subcategories.length,
                message: 'Subcategories retrieved successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async searchCategories(req, res, next) {
        try {
            const query = req.query.q;
            if (!query || query.trim().length === 0) {
                res.status(400).json({
                    success: false,
                    error: 'Search query required',
                    message: 'Please provide a search query parameter "q"'
                });
                return;
            }
            const options = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 10,
                isActive: req.query.isActive === 'false' ? false : true,
                includeChildren: req.query.includeChildren === 'true',
                depth: parseInt(req.query.depth) || 1
            };
            const result = await categoryService_1.categoryService.searchCategories(query.trim(), options);
            res.status(200).json({
                success: true,
                data: result.categories,
                total: result.total,
                query: query.trim(),
                message: 'Categories search completed successfully'
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