import { prisma } from '../server';
import { logInfo, logError } from '../utils/logger';

export interface CreateCategoryData {
  name: string;
  parentId?: number | null;
}

export class CategoryService {
  async createCategory(data: CreateCategoryData): Promise<any> {
    try {
      // Validate parent exists if provided
      if (data.parentId) {
        const parent = await prisma.category.findUnique({
          where: { id: data.parentId }
        });
        if (!parent) {
          throw new Error('Parent category not found');
        }
      }

      const category = await prisma.category.create({
        data: {
          name: data.name,
          parentId: data.parentId
        },
        include: {
          parent: true,
          children: true
        }
      });

      logInfo('Category created', { categoryId: category.id });
      return category;
    } catch (error) {
      logError('Failed to create category', error as Error, { data });
      throw error;
    }
  }

  async getAllCategories(): Promise<any[]> {
    try {
      const categories = await prisma.category.findMany({
        include: {
          parent: true,
          children: true,
          _count: {
            select: {
              children: true,
              quizzes: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      logInfo('Retrieved all categories', { count: categories.length });
      return categories;
    } catch (error) {
      logError('Failed to retrieve categories', error as Error);
      throw error;
    }
  }

  async getCategoryById(id: number): Promise<any | null> {
    try {
      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          parent: true,
          children: true
          // Removed invalid includes
        }
      });

      if (category) {
        logInfo('Retrieved category by ID', { categoryId: id });
      } else {
        logInfo('Category not found', { categoryId: id });
      }

      return category;
    } catch (error) {
      logError('Failed to retrieve category by ID', error as Error, { categoryId: id });
      throw error;
    }
  }

  async getCategoryHierarchy(): Promise<any[]> {
    try {
      // Get root categories (no parent) with full hierarchy
      const rootCategories = await prisma.category.findMany({
        where: {
          parentId: null
        },
        include: {
          children: {
            include: {
              children: {
                include: {
                  children: true
                }
              }
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      logInfo('Retrieved category hierarchy', { rootCount: rootCategories.length });
      return rootCategories;
    } catch (error) {
      logError('Failed to retrieve category hierarchy', error as Error);
      throw error;
    }
  }

  async updateCategory(id: number, data: Partial<CreateCategoryData>): Promise<any> {
    try {
      // Check if category exists
      const existingCategory = await prisma.category.findUnique({
        where: { id }
      });

      if (!existingCategory) {
        return null;
      }

      // Filter out description field as it doesn't exist in schema
      const { description, ...validData } = data as any;

      // Validate parent relationship if parentId is being updated
      if (validData.parentId !== undefined) {
        if (validData.parentId) {
          const parent = await prisma.category.findUnique({
            where: { id: validData.parentId }
          });
          if (!parent) {
            throw new Error('Parent category not found');
          }
        }
      }

      const updatedCategory = await prisma.category.update({
        where: { id },
        data: validData,
        include: {
          parent: true,
          children: true
        }
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
      const children = await prisma.category.findMany({
        where: { parentId: id }
      });

      if (children.length > 0) {
        throw new Error('Cannot delete category with subcategories');
      }

      // Check if any quizzes reference this category
      const quizCount = await prisma.quiz.count({
        where: { 
          categoryId: id
        }
      });

      if (quizCount > 0) {
        throw new Error('Cannot delete category with associated quizzes');
      }

      await prisma.category.delete({
        where: { id }
      });

      logInfo('Category deleted', { categoryId: id });
      return true;
    } catch (error) {
      logError('Failed to delete category', error as Error, { categoryId: id });
      throw error;
    }
  }

  private async checkCircularReference(categoryId: number, parentId: number): Promise<boolean> {
    let currentParentId: number | null = parentId;
    
    while (currentParentId) {
      if (currentParentId === categoryId) {
        return true;
      }
      
      const parent: { parentId: number | null } | null = await prisma.category.findUnique({
        where: { id: currentParentId },
        select: { parentId: true }
      });
      
      currentParentId = parent?.parentId ?? null;
    }
    
    return false;
  }
}

export const categoryService = new CategoryService();
