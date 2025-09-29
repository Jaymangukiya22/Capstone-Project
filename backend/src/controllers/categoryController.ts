import { Request, Response, NextFunction } from 'express';
import { categoryService, CategoryQueryOptions } from '../services/categoryService';
import { categorySchema, categoryUpdateSchema, categoryQuerySchema } from '../utils/validation';

export class CategoryController {
  async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = categorySchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          message: error.details[0].message
        });
        return;
      }

      const category = await categoryService.createCategory(value);

      res.status(201).json({
        success: true,
        data: category,
        message: 'Category created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = categoryQuerySchema.validate(req.query);
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
          const categories = await categoryService.getCategoryHierarchy(
            options.depth || 5, 
            includeQuizzes === 'true' || includeQuizzes === true
          );
          console.log('🔍 Backend Hierarchy Response:', categories.length, 'root categories found');
          
          // If no root categories found, fall back to getting all categories
          if (categories.length === 0) {
            console.log('🔍 No root categories found, falling back to all categories');
            const allCategories = await categoryService.getAllCategories({ 
              limit: 1000, 
              isActive: true 
            } as CategoryQueryOptions);
            result = allCategories;
          } else {
            result = {
              categories,
              total: categories.length,
              page: 1,
              totalPages: 1
            };
          }
        } catch (error) {
          console.log('🔍 Hierarchy failed, falling back to all categories:', error);
          result = await categoryService.getAllCategories({ 
            limit: 1000, 
            isActive: true 
          } as CategoryQueryOptions);
        }
      } else {
        result = await categoryService.getAllCategories(options as CategoryQueryOptions);
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
    } catch (error) {
      next(error);
    }
  }

  async getCategoryById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          error: 'Invalid category ID',
          message: 'Category ID must be a number'
        });
        return;
      }

      const category = await categoryService.getCategoryById(id);
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
    } catch (error) {
      next(error);
    }
  }

  async updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { error, value } = categoryUpdateSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          message: error.details[0].message
        });
        return;
      }

      const category = await categoryService.updateCategory(id, value);
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
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const success = await categoryService.deleteCategory(id);
      
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
    } catch (error) {
      next(error);
    }
  }

  async getCategoryPath(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const path = await categoryService.getCategoryPath(id);

      res.status(200).json({
        success: true,
        data: path,
        message: 'Category path retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getSubcategories(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const depth = parseInt(req.query.depth as string) || 1;
      const subcategories = await categoryService.getSubcategories(parentId, depth);

      res.status(200).json({
        success: true,
        data: subcategories,
        count: subcategories.length,
        message: 'Subcategories retrieved successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async searchCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Search query required',
          message: 'Please provide a search query parameter "q"'
        });
        return;
      }

      const options: CategoryQueryOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        isActive: req.query.isActive === 'false' ? false : true,
        includeChildren: req.query.includeChildren === 'true',
        depth: parseInt(req.query.depth as string) || 1
      };

      const result = await categoryService.searchCategories(query.trim(), options);

      res.status(200).json({
        success: true,
        data: result.categories,
        total: result.total,
        query: query.trim(),
        message: 'Categories search completed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

export const categoryController = new CategoryController();
