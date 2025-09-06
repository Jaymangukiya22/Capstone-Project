import { Request, Response, NextFunction } from 'express';
import { categoryService } from '../services/categoryService';
import { categorySchema } from '../utils/validation';

export class CategoryController {
  async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { error, value } = categorySchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          message: error.details[0].message
        });
        return;
      }

      const { name, parentId } = value;
      const category = await categoryService.createCategory(name, parentId);

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
      const { hierarchy } = req.query;
      
      let categories;
      if (hierarchy === 'true') {
        categories = await categoryService.getCategoryHierarchy();
      } else {
        categories = await categoryService.getAllCategories();
      }

      res.status(200).json({
        success: true,
        data: categories,
        count: categories.length,
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
          error: 'Invalid category ID',
          message: 'Category ID must be a number'
        });
        return;
      }

      const { error, value } = categorySchema.validate(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation error',
          message: error.details[0].message
        });
        return;
      }

      const { name, parentId } = value;
      const category = await categoryService.updateCategory(id, name, parentId);

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
          error: 'Invalid category ID',
          message: 'Category ID must be a number'
        });
        return;
      }

      await categoryService.deleteCategory(id);

      res.status(200).json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

export const categoryController = new CategoryController();
