import { PrismaClient, Category } from '@prisma/client';
import { redisService } from '../utils/redis';

const prisma = new PrismaClient();

export class CategoryService {
  async createCategory(name: string, parentId?: number): Promise<Category> {
    // Validate parent exists if provided
    if (parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: parentId }
      });
      if (!parent) {
        throw new Error('Parent category not found');
      }
    }

    const category = await prisma.category.create({
      data: {
        name,
        parentId
      }
    });

    // Invalidate categories cache
    await redisService.invalidateCategoriesCache();

    return category;
  }

  async getAllCategories(): Promise<Category[]> {
    // Try to get from cache first
    const cached = await redisService.getCachedCategories();
    if (cached) {
      return cached;
    }

    // Fetch from database with hierarchy
    const categories = await prisma.category.findMany({
      include: {
        children: {
          include: {
            children: {
              include: {
                children: true // Support up to 4 levels deep
              }
            }
          }
        },
        parent: true,
        _count: {
          select: {
            quizzes: true
          }
        }
      },
      orderBy: [
        { parentId: 'asc' },
        { name: 'asc' }
      ]
    });

    // Cache the result
    await redisService.cacheCategories(categories, 600); // Cache for 10 minutes

    return categories;
  }

  async getCategoryById(id: number): Promise<Category | null> {
    return await prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        parent: true,
        quizzes: {
          select: {
            id: true,
            title: true,
            difficulty: true,
            _count: {
              select: {
                questions: true
              }
            }
          }
        },
        _count: {
          select: {
            quizzes: true
          }
        }
      }
    });
  }

  async getCategoryHierarchy(): Promise<Category[]> {
    // Get root categories (no parent) with full hierarchy
    return await prisma.category.findMany({
      where: {
        parentId: null
      },
      include: {
        children: {
          include: {
            children: {
              include: {
                children: {
                  include: {
                    _count: {
                      select: {
                        quizzes: true
                      }
                    }
                  }
                },
                _count: {
                  select: {
                    quizzes: true
                  }
                }
              }
            },
            _count: {
              select: {
                quizzes: true
              }
            }
          }
        },
        _count: {
          select: {
            quizzes: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
  }

  async updateCategory(id: number, name: string, parentId?: number): Promise<Category> {
    // Validate parent exists if provided and is not the same as current category
    if (parentId && parentId !== id) {
      const parent = await prisma.category.findUnique({
        where: { id: parentId }
      });
      if (!parent) {
        throw new Error('Parent category not found');
      }

      // Check for circular reference
      const isCircular = await this.checkCircularReference(id, parentId);
      if (isCircular) {
        throw new Error('Circular reference detected');
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        parentId: parentId === id ? null : parentId
      }
    });

    // Invalidate categories cache
    await redisService.invalidateCategoriesCache();

    return category;
  }

  async deleteCategory(id: number): Promise<void> {
    await prisma.category.delete({
      where: { id }
    });

    // Invalidate categories cache
    await redisService.invalidateCategoriesCache();
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
