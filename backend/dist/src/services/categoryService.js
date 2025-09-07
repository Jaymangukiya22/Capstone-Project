"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryService = exports.CategoryService = void 0;
const server_1 = require("../server");
const logger_1 = require("../utils/logger");
class CategoryService {
    async createCategory(data) {
        try {
            if (data.parentId) {
                const parent = await server_1.prisma.category.findUnique({
                    where: { id: data.parentId }
                });
                if (!parent) {
                    throw new Error('Parent category not found');
                }
            }
            const category = await server_1.prisma.category.create({
                data: {
                    name: data.name,
                    parentId: data.parentId
                },
                include: {
                    parent: true,
                    children: true
                }
            });
            (0, logger_1.logInfo)('Category created', { categoryId: category.id });
            return category;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to create category', error, { data });
            throw error;
        }
    }
    async getAllCategories() {
        try {
            const categories = await server_1.prisma.category.findMany({
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
            (0, logger_1.logInfo)('Retrieved all categories', { count: categories.length });
            return categories;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to retrieve categories', error);
            throw error;
        }
    }
    async getCategoryById(id) {
        try {
            const category = await server_1.prisma.category.findUnique({
                where: { id },
                include: {
                    parent: true,
                    children: true
                }
            });
            if (category) {
                (0, logger_1.logInfo)('Retrieved category by ID', { categoryId: id });
            }
            else {
                (0, logger_1.logInfo)('Category not found', { categoryId: id });
            }
            return category;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to retrieve category by ID', error, { categoryId: id });
            throw error;
        }
    }
    async getCategoryHierarchy() {
        try {
            const rootCategories = await server_1.prisma.category.findMany({
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
            (0, logger_1.logInfo)('Retrieved category hierarchy', { rootCount: rootCategories.length });
            return rootCategories;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to retrieve category hierarchy', error);
            throw error;
        }
    }
    async updateCategory(id, data) {
        try {
            const existingCategory = await server_1.prisma.category.findUnique({
                where: { id }
            });
            if (!existingCategory) {
                throw new Error('Category not found');
            }
            if (data.parentId !== undefined && data.parentId !== existingCategory.parentId) {
                if (data.parentId === id) {
                    throw new Error('Category cannot be its own parent');
                }
                if (data.parentId) {
                    const parent = await server_1.prisma.category.findUnique({
                        where: { id: data.parentId }
                    });
                    if (!parent) {
                        throw new Error('Parent category not found');
                    }
                }
            }
            const updatedCategory = await server_1.prisma.category.update({
                where: { id },
                data,
                include: {
                    parent: true,
                    children: true
                }
            });
            (0, logger_1.logInfo)('Category updated', { categoryId: id });
            return updatedCategory;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to update category', error, { categoryId: id, data });
            throw error;
        }
    }
    async deleteCategory(id) {
        try {
            const children = await server_1.prisma.category.findMany({
                where: { parentId: id }
            });
            if (children.length > 0) {
                throw new Error('Cannot delete category with subcategories');
            }
            const quizCount = await server_1.prisma.quiz.count({
                where: {
                    categoryId: id
                }
            });
            if (quizCount > 0) {
                throw new Error('Cannot delete category with associated quizzes');
            }
            await server_1.prisma.category.delete({
                where: { id }
            });
            (0, logger_1.logInfo)('Category deleted', { categoryId: id });
            return true;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to delete category', error, { categoryId: id });
            throw error;
        }
    }
    async checkCircularReference(categoryId, parentId) {
        let currentParentId = parentId;
        while (currentParentId) {
            if (currentParentId === categoryId) {
                return true;
            }
            const parent = await server_1.prisma.category.findUnique({
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