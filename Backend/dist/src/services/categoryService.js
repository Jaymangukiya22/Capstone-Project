"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryService = exports.CategoryService = void 0;
const models_1 = require("../models");
const logger_1 = require("../utils/logger");
const sequelize_1 = require("sequelize");
class CategoryService {
    async createCategory(data) {
        try {
            if (data.parentId) {
                const parent = await models_1.Category.findByPk(data.parentId);
                if (!parent) {
                    throw new Error('Parent category not found');
                }
                if (!parent.isActive) {
                    throw new Error('Cannot create subcategory under inactive parent');
                }
            }
            const category = await models_1.Category.create({
                name: data.name,
                description: data.description,
                parentId: data.parentId,
                isActive: data.isActive ?? true
            });
            (0, logger_1.logInfo)('Category created', { categoryId: category.id });
            return category;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to create category', error, { data });
            throw error;
        }
    }
    async getAllCategories(options = {}) {
        try {
            const { page = 1, limit = 10, parentId, includeChildren = false, depth = 1, isActive, search } = options;
            const offset = (page - 1) * limit;
            const whereClause = {};
            if (parentId !== undefined) {
                whereClause.parentId = parentId;
            }
            if (isActive !== undefined) {
                whereClause.isActive = isActive;
            }
            if (search) {
                whereClause[sequelize_1.Op.or] = [
                    { name: { [sequelize_1.Op.iLike]: `%${search}%` } },
                    { description: { [sequelize_1.Op.iLike]: `%${search}%` } }
                ];
            }
            const includeClause = [];
            if (includeChildren && depth > 0) {
                const childrenInclude = this.buildChildrenInclude(depth, false);
                if (childrenInclude) {
                    includeClause.push(childrenInclude);
                }
            }
            includeClause.push({
                model: models_1.Category,
                as: 'parent',
                attributes: ['id', 'name', 'parentId'],
                required: false
            });
            const { count, rows: categories } = await models_1.Category.findAndCountAll({
                where: whereClause,
                include: includeClause,
                order: [['name', 'ASC']],
                limit,
                offset,
                distinct: true
            });
            const totalPages = Math.ceil(count / limit);
            (0, logger_1.logInfo)('Retrieved categories with pagination', {
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
        }
        catch (error) {
            (0, logger_1.logError)('Failed to retrieve categories', error, { options });
            throw error;
        }
    }
    async getCategoryById(id, includeChildren = false, depth = 1) {
        try {
            const includeClause = [
                {
                    model: models_1.Category,
                    as: 'parent',
                    attributes: ['id', 'name', 'parentId'],
                    required: false
                }
            ];
            if (includeChildren && depth > 0) {
                const childrenInclude = this.buildChildrenInclude(depth, false);
                if (childrenInclude) {
                    includeClause.push(childrenInclude);
                }
            }
            const category = await models_1.Category.findByPk(id, {
                include: includeClause
            });
            if (category) {
                (0, logger_1.logInfo)('Retrieved category by ID', { categoryId: id, includeChildren, depth });
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
    async getCategoryHierarchy(maxDepth = 5, includeQuizzes = false) {
        try {
            const includeClause = [];
            if (maxDepth > 0) {
                const childrenInclude = this.buildChildrenInclude(maxDepth, includeQuizzes);
                if (childrenInclude) {
                    includeClause.push(childrenInclude);
                }
            }
            if (includeQuizzes) {
                includeClause.push({
                    model: models_1.Quiz,
                    as: 'quizzes',
                    where: { isActive: true },
                    required: false,
                    order: [['title', 'ASC']]
                });
            }
            const rootCategories = await models_1.Category.findAll({
                where: {
                    parentId: null,
                    isActive: true
                },
                include: includeClause,
                order: [['name', 'ASC']]
            });
            (0, logger_1.logInfo)('Retrieved category hierarchy', {
                rootCount: rootCategories.length,
                maxDepth
            });
            rootCategories.forEach((cat, index) => {
                console.log(`🔍 Root Category ${index + 1}:`, {
                    id: cat.id,
                    name: cat.name,
                    children: cat.children?.length || 0,
                    hasChildren: !!cat.children
                });
            });
            return rootCategories;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to retrieve category hierarchy', error);
            throw error;
        }
    }
    async getCategoryPath(id) {
        try {
            const path = [];
            let currentId = id;
            while (currentId) {
                const category = await models_1.Category.findByPk(currentId, {
                    attributes: ['id', 'name', 'parentId']
                });
                if (!category)
                    break;
                path.unshift(category);
                currentId = category.parentId || null;
            }
            (0, logger_1.logInfo)('Retrieved category path', { categoryId: id, pathLength: path.length });
            return path;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to retrieve category path', error, { categoryId: id });
            throw error;
        }
    }
    async getSubcategories(parentId, depth = 1) {
        try {
            const includeClause = [];
            if (depth > 1) {
                const childrenInclude = this.buildChildrenInclude(depth - 1, false);
                if (childrenInclude) {
                    includeClause.push(childrenInclude);
                }
            }
            const subcategories = await models_1.Category.findAll({
                where: {
                    parentId,
                    isActive: true
                },
                include: includeClause,
                order: [['name', 'ASC']]
            });
            (0, logger_1.logInfo)('Retrieved subcategories', {
                parentId,
                count: subcategories.length,
                depth
            });
            return subcategories;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to retrieve subcategories', error, { parentId });
            throw error;
        }
    }
    async updateCategory(id, data) {
        try {
            const existingCategory = await models_1.Category.findByPk(id);
            if (!existingCategory) {
                return null;
            }
            if (data.parentId !== undefined) {
                if (data.parentId) {
                    const parent = await models_1.Category.findByPk(data.parentId);
                    if (!parent) {
                        throw new Error('Parent category not found');
                    }
                    const isCircular = await this.checkCircularReference(id, data.parentId);
                    if (isCircular) {
                        throw new Error('Cannot create circular reference in category hierarchy');
                    }
                    if (!parent.isActive) {
                        throw new Error('Cannot move category under inactive parent');
                    }
                }
            }
            await models_1.Category.update(data, { where: { id } });
            const updatedCategory = await models_1.Category.findByPk(id, {
                include: [
                    {
                        model: models_1.Category,
                        as: 'parent',
                        attributes: ['id', 'name', 'parentId']
                    }
                ]
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
            const children = await models_1.Category.findAll({
                where: { parentId: id }
            });
            if (children.length > 0) {
                throw new Error('Cannot delete category with subcategories. Please delete or move subcategories first.');
            }
            const quizCount = await models_1.Quiz.count({
                where: { categoryId: id }
            });
            if (quizCount > 0) {
                throw new Error('Cannot delete category with associated quizzes. Please reassign or delete quizzes first.');
            }
            const questionCount = await models_1.QuestionBankItem.count({
                where: { categoryId: id }
            });
            if (questionCount > 0) {
                throw new Error('Cannot delete category with associated questions. Please reassign or delete questions first.');
            }
            await models_1.Category.destroy({
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
    async searchCategories(query, options = {}) {
        try {
            const { page = 1, limit = 10, isActive = true, includeChildren = false, depth = 1 } = options;
            const offset = (page - 1) * limit;
            const whereClause = {
                [sequelize_1.Op.and]: [
                    {
                        [sequelize_1.Op.or]: [
                            { name: { [sequelize_1.Op.iLike]: `%${query}%` } },
                            { description: { [sequelize_1.Op.iLike]: `%${query}%` } }
                        ]
                    },
                    { isActive }
                ]
            };
            const includeClause = [
                {
                    model: models_1.Category,
                    as: 'parent',
                    attributes: ['id', 'name', 'parentId'],
                    required: false
                }
            ];
            if (includeChildren && depth > 0) {
                const childrenInclude = this.buildChildrenInclude(depth, false);
                if (childrenInclude) {
                    includeClause.push(childrenInclude);
                }
            }
            const { count, rows: categories } = await models_1.Category.findAndCountAll({
                where: whereClause,
                include: includeClause,
                order: [['name', 'ASC']],
                limit,
                offset,
                distinct: true
            });
            (0, logger_1.logInfo)('Searched categories', { query, count, page });
            return { categories, total: count };
        }
        catch (error) {
            (0, logger_1.logError)('Failed to search categories', error, { query, options });
            throw error;
        }
    }
    buildChildrenInclude(depth, includeQuizzes = false) {
        if (depth <= 0)
            return null;
        const includeClause = [];
        if (depth > 1) {
            const nestedInclude = this.buildChildrenInclude(depth - 1, includeQuizzes);
            if (nestedInclude) {
                includeClause.push(nestedInclude);
            }
        }
        if (includeQuizzes) {
            includeClause.push({
                model: models_1.Quiz,
                as: 'quizzes',
                where: { isActive: true },
                required: false,
                order: [['title', 'ASC']]
            });
        }
        const include = {
            model: models_1.Category,
            as: 'children',
            where: { isActive: true },
            required: false,
            order: [['name', 'ASC']]
        };
        if (includeClause.length > 0) {
            include.include = includeClause;
        }
        return include;
    }
    async checkCircularReference(categoryId, parentId) {
        let currentParentId = parentId;
        while (currentParentId) {
            if (currentParentId === categoryId) {
                return true;
            }
            const parent = await models_1.Category.findByPk(currentParentId, {
                attributes: ['parentId']
            });
            currentParentId = parent?.parentId || null;
        }
        return false;
    }
}
exports.CategoryService = CategoryService;
exports.categoryService = new CategoryService();
//# sourceMappingURL=categoryService.js.map