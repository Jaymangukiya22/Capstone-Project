import { Category, Quiz, QuestionBankItem } from '../models';
import { logInfo, logError } from '../utils/logger';
import { Op } from 'sequelize';

export interface CreateCategoryData {
  name: string;
  description?: string;
  parentId?: number | null;
  isActive?: boolean;
}

export interface CategoryQueryOptions {
  page?: number;
  limit?: number;
  parentId?: number | null;
  includeChildren?: boolean;
  depth?: number;
  isActive?: boolean;
  search?: string;
}

export class CategoryService {
  async createCategory(data: CreateCategoryData): Promise<any> {
    try {
      // Validate parent exists if provided
      if (data.parentId) {
        const parent = await Category.findByPk(data.parentId);
        if (!parent) {
          throw new Error('Parent category not found');
        }
        
        // Check if parent is active
        if (!parent.isActive) {
          throw new Error('Cannot create subcategory under inactive parent');
        }
      }

      const category = await Category.create({
        name: data.name,
        description: data.description,
        parentId: data.parentId,
        isActive: data.isActive ?? true
      });

      logInfo('Category created', { categoryId: category.id });
      return category;
    } catch (error) {
      logError('Failed to create category', error as Error, { data });
      throw error;
    }
  }

  async getAllCategories(options: CategoryQueryOptions = {}): Promise<{ categories: any[], total: number, page: number, totalPages: number }> {
    try {
      const {
        page = 1,
        limit = 10,
        parentId,
        includeChildren = false,
        depth = 1,
        isActive,
        search
      } = options;

      const offset = (page - 1) * limit;
      
      // Build where clause
      const whereClause: any = {};
      
      if (parentId !== undefined) {
        whereClause.parentId = parentId;
      }
      
      if (isActive !== undefined) {
        whereClause.isActive = isActive;
      }
      
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Build include clause for hierarchical data
      const includeClause = [];
      
      if (includeChildren && depth > 0) {
        includeClause.push(this.buildChildrenInclude(depth));
      }
      
      // Always include parent for context
      includeClause.push({
        model: Category,
        as: 'parent',
        attributes: ['id', 'name', 'parentId']
      });

      const { count, rows: categories } = await Category.findAndCountAll({
        where: whereClause,
        include: includeClause,
        order: [['name', 'ASC']],
        limit,
        offset,
        distinct: true
      });

      const totalPages = Math.ceil(count / limit);

      logInfo('Retrieved categories with pagination', { 
        count, 
        page, 
        totalPages,
        includeChildren,
        depth 
      });

      return {
        categories,
        total: count,
        page,
        totalPages
      };
    } catch (error) {
      logError('Failed to retrieve categories', error as Error, { options });
      throw error;
    }
  }

  async getCategoryById(id: number, includeChildren: boolean = false, depth: number = 1): Promise<any | null> {
    try {
      const includeClause = [
        {
          model: Category,
          as: 'parent',
          attributes: ['id', 'name', 'parentId']
        }
      ];

      if (includeChildren && depth > 0) {
        includeClause.push(this.buildChildrenInclude(depth));
      }

      const category = await Category.findByPk(id, {
        include: includeClause
      });

      if (category) {
        logInfo('Retrieved category by ID', { categoryId: id, includeChildren, depth });
      } else {
        logInfo('Category not found', { categoryId: id });
      }

      return category;
    } catch (error) {
      logError('Failed to retrieve category by ID', error as Error, { categoryId: id });
      throw error;
    }
  }

  async getCategoryHierarchy(maxDepth: number = 5): Promise<any[]> {
    try {
      // Get root categories (no parent) with full hierarchy
      const rootCategories = await Category.findAll({
        where: {
          parentId: null,
          isActive: true
        },
        include: [this.buildChildrenInclude(maxDepth)],
        order: [['name', 'ASC']]
      });

      logInfo('Retrieved category hierarchy', { 
        rootCount: rootCategories.length,
        maxDepth 
      });
      return rootCategories;
    } catch (error) {
      logError('Failed to retrieve category hierarchy', error as Error);
      throw error;
    }
  }

  async getCategoryPath(id: number): Promise<any[]> {
    try {
      const path: any[] = [];
      let currentId: number | null = id;

      while (currentId) {
        const category: Category | null = await Category.findByPk(currentId, {
          attributes: ['id', 'name', 'parentId']
        });

        if (!category) break;

        path.unshift(category);
        currentId = category.parentId || null;
      }

      logInfo('Retrieved category path', { categoryId: id, pathLength: path.length });
      return path;
    } catch (error) {
      logError('Failed to retrieve category path', error as Error, { categoryId: id });
      throw error;
    }
  }

  async getSubcategories(parentId: number, depth: number = 1): Promise<any[]> {
    try {
      const includeClause = depth > 1 ? [this.buildChildrenInclude(depth - 1)] : [];

      const subcategories = await Category.findAll({
        where: {
          parentId,
          isActive: true
        },
        include: includeClause,
        order: [['name', 'ASC']]
      });

      logInfo('Retrieved subcategories', { 
        parentId, 
        count: subcategories.length,
        depth 
      });
      return subcategories;
    } catch (error) {
      logError('Failed to retrieve subcategories', error as Error, { parentId });
      throw error;
    }
  }

  async updateCategory(id: number, data: Partial<CreateCategoryData>): Promise<any> {
    try {
      // Check if category exists
      const existingCategory = await Category.findByPk(id);

      if (!existingCategory) {
        return null;
      }

      // Validate parent relationship if parentId is being updated
      if (data.parentId !== undefined) {
        if (data.parentId) {
          const parent = await Category.findByPk(data.parentId);
          if (!parent) {
            throw new Error('Parent category not found');
          }

          // Check for circular reference
          const isCircular = await this.checkCircularReference(id, data.parentId);
          if (isCircular) {
            throw new Error('Cannot create circular reference in category hierarchy');
          }

          // Check if parent is active
          if (!parent.isActive) {
            throw new Error('Cannot move category under inactive parent');
          }
        }
      }

      await Category.update(data, { where: { id } });
      const updatedCategory = await Category.findByPk(id, {
        include: [
          {
            model: Category,
            as: 'parent',
            attributes: ['id', 'name', 'parentId']
          }
        ]
      });

      logInfo('Category updated', { categoryId: id });
      return updatedCategory;
    } catch (error) {
      logError('Failed to update category', error as Error, { categoryId: id, data });
      throw error;
    }
  }

  async deleteCategory(id: number): Promise<boolean> {
    try {
      // Check if category has children
      const children = await Category.findAll({
        where: { parentId: id }
      });

      if (children.length > 0) {
        throw new Error('Cannot delete category with subcategories. Please delete or move subcategories first.');
      }

      // Check if any quizzes reference this category
      const quizCount = await Quiz.count({
        where: { categoryId: id }
      });

      if (quizCount > 0) {
        throw new Error('Cannot delete category with associated quizzes. Please reassign or delete quizzes first.');
      }

      // Check if any questions reference this category
      const questionCount = await QuestionBankItem.count({
        where: { categoryId: id }
      });

      if (questionCount > 0) {
        throw new Error('Cannot delete category with associated questions. Please reassign or delete questions first.');
      }

      await Category.destroy({
        where: { id }
      });

      logInfo('Category deleted', { categoryId: id });
      return true;
    } catch (error) {
      logError('Failed to delete category', error as Error, { categoryId: id });
      throw error;
    }
  }

  async searchCategories(query: string, options: CategoryQueryOptions = {}): Promise<{ categories: any[], total: number }> {
    try {
      const {
        page = 1,
        limit = 10,
        isActive = true,
        includeChildren = false,
        depth = 1
      } = options;

      const offset = (page - 1) * limit;

      const whereClause = {
        [Op.and]: [
          {
            [Op.or]: [
              { name: { [Op.iLike]: `%${query}%` } },
              { description: { [Op.iLike]: `%${query}%` } }
            ]
          },
          { isActive }
        ]
      };

      const includeClause = [
        {
          model: Category,
          as: 'parent',
          attributes: ['id', 'name', 'parentId']
        }
      ];

      if (includeChildren && depth > 0) {
        includeClause.push(this.buildChildrenInclude(depth));
      }

      const { count, rows: categories } = await Category.findAndCountAll({
        where: whereClause,
        include: includeClause,
        order: [['name', 'ASC']],
        limit,
        offset,
        distinct: true
      });

      logInfo('Searched categories', { query, count, page });
      return { categories, total: count };
    } catch (error) {
      logError('Failed to search categories', error as Error, { query, options });
      throw error;
    }
  }

  // Helper method to build nested children include for hierarchical queries
  private buildChildrenInclude(depth: number): any {
    if (depth <= 0) return null;

    const include: any = {
      model: Category,
      as: 'children',
      where: { isActive: true },
      required: false,
      order: [['name', 'ASC']]
    };

    if (depth > 1) {
      include.include = [this.buildChildrenInclude(depth - 1)];
    }

    return include;
  }

  private async checkCircularReference(categoryId: number, parentId: number): Promise<boolean> {
    let currentParentId: number | null = parentId;
    
    while (currentParentId) {
      if (currentParentId === categoryId) {
        return true;
      }
      
      const parent: Category | null = await Category.findByPk(currentParentId, {
        attributes: ['parentId']
      });
      
      currentParentId = parent?.parentId || null;
    }
    
    return false;
  }
}

export const categoryService = new CategoryService();
