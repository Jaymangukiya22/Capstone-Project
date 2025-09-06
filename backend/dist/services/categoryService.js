"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryService = exports.CategoryService = void 0;
const client_1 = require("@prisma/client");
const redis_1 = require("../utils/redis");
const prisma = new client_1.PrismaClient();
class CategoryService {
    async createCategory(name, parentId) {
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
        await redis_1.redisService.invalidateCategoriesCache();
        return category;
    }
    async getAllCategories() {
        const cached = await redis_1.redisService.getCachedCategories();
        if (cached) {
            return cached;
        }
        const categories = await prisma.category.findMany({
            include: {
                children: {
                    include: {
                        children: {
                            include: {
                                children: true
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
        await redis_1.redisService.cacheCategories(categories, 600);
        return categories;
    }
    async getCategoryById(id) {
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
    async getCategoryHierarchy() {
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
    async updateCategory(id, name, parentId) {
        if (parentId && parentId !== id) {
            const parent = await prisma.category.findUnique({
                where: { id: parentId }
            });
            if (!parent) {
                throw new Error('Parent category not found');
            }
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
        await redis_1.redisService.invalidateCategoriesCache();
        return category;
    }
    async deleteCategory(id) {
        await prisma.category.delete({
            where: { id }
        });
        await redis_1.redisService.invalidateCategoriesCache();
    }
    async checkCircularReference(categoryId, parentId) {
        let currentParentId = parentId;
        while (currentParentId) {
            if (currentParentId === categoryId) {
                return true;
            }
            const parent = await prisma.category.findUnique({
                where: { id: currentParentId },
                select: { parentId: true }
            });
            currentParentId = parent?.parentId ?? null;
        }
        return false;
    }
}
exports.CategoryService = CategoryService;
exports.categoryService = new CategoryService();
//# sourceMappingURL=categoryService.js.map