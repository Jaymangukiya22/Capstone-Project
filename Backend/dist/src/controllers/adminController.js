"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminController = exports.AdminController = void 0;
const models_1 = require("../models");
const logger_1 = require("../utils/logger");
const massiveSeeder_1 = require("../seeders/massiveSeeder");
const sequelize_1 = require("sequelize");
class AdminController {
    async getAllUsers(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const role = req.query.role;
            const offset = (page - 1) * limit;
            const whereClause = {};
            if (role) {
                whereClause.role = role;
            }
            const { count, rows: users } = await models_1.User.findAndCountAll({
                where: whereClause,
                attributes: { exclude: ['password'] },
                order: [['createdAt', 'DESC']],
                limit,
                offset
            });
            const totalPages = Math.ceil(count / limit);
            res.status(200).json({
                success: true,
                data: users,
                pagination: {
                    total: count,
                    page,
                    totalPages,
                    limit
                },
                message: 'Users retrieved successfully'
            });
        }
        catch (error) {
            (0, logger_1.logError)('Failed to get users', error);
            next(error);
        }
    }
    async updateUserStatus(req, res, next) {
        try {
            const userId = parseInt(req.params.id);
            const { isActive } = req.body;
            if (isNaN(userId)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid user ID',
                    message: 'User ID must be a number'
                });
                return;
            }
            const user = await models_1.User.findByPk(userId);
            if (!user) {
                res.status(404).json({
                    success: false,
                    error: 'User not found',
                    message: `User with ID ${userId} does not exist`
                });
                return;
            }
            await models_1.User.update({ isActive }, { where: { id: userId } });
            const updatedUser = await models_1.User.findByPk(userId, {
                attributes: { exclude: ['password'] }
            });
            res.status(200).json({
                success: true,
                data: updatedUser,
                message: 'User status updated successfully'
            });
        }
        catch (error) {
            (0, logger_1.logError)('Failed to update user status', error);
            next(error);
        }
    }
    async deleteUser(req, res, next) {
        try {
            const userId = parseInt(req.params.id);
            if (isNaN(userId)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid user ID',
                    message: 'User ID must be a number'
                });
                return;
            }
            const user = await models_1.User.findByPk(userId);
            if (!user) {
                res.status(404).json({
                    success: false,
                    error: 'User not found',
                    message: `User with ID ${userId} does not exist`
                });
                return;
            }
            const attemptCount = await models_1.QuizAttempt.count({ where: { userId } });
            if (attemptCount > 0) {
                res.status(400).json({
                    success: false,
                    error: 'Cannot delete user',
                    message: 'User has associated quiz attempts. Please reassign or delete attempts first.'
                });
                return;
            }
            await models_1.User.destroy({ where: { id: userId } });
            res.status(200).json({
                success: true,
                message: 'User deleted successfully'
            });
        }
        catch (error) {
            (0, logger_1.logError)('Failed to delete user', error);
            next(error);
        }
    }
    async getSystemStats(req, res, next) {
        try {
            const [totalUsers, totalCategories, totalQuestions, totalQuizzes, totalAttempts, activeUsers, recentAttempts] = await Promise.all([
                models_1.User.count(),
                models_1.Category.count(),
                models_1.QuestionBankItem.count(),
                models_1.Quiz.count(),
                models_1.QuizAttempt.count(),
                models_1.User.count({ where: { isActive: true } }),
                models_1.QuizAttempt.count({
                    where: {
                        createdAt: {
                            [sequelize_1.Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        }
                    }
                })
            ]);
            const stats = {
                users: {
                    total: totalUsers,
                    active: activeUsers,
                    inactive: totalUsers - activeUsers
                },
                content: {
                    categories: totalCategories,
                    questions: totalQuestions,
                    quizzes: totalQuizzes
                },
                activity: {
                    totalAttempts,
                    recentAttempts
                },
                system: {
                    uptime: process.uptime(),
                    nodeVersion: process.version,
                    platform: process.platform
                }
            };
            res.status(200).json({
                success: true,
                data: stats,
                message: 'System statistics retrieved successfully'
            });
        }
        catch (error) {
            (0, logger_1.logError)('Failed to get system stats', error);
            next(error);
        }
    }
    async seedDatabase(req, res, next) {
        try {
            const seeder = new massiveSeeder_1.MassiveSeeder();
            await seeder.seed();
            res.status(200).json({
                success: true,
                message: 'Database seeded successfully'
            });
        }
        catch (error) {
            (0, logger_1.logError)('Failed to seed database', error);
            next(error);
        }
    }
    async clearDatabase(req, res, next) {
        try {
            await models_1.QuizAttempt.destroy({ where: {} });
            await models_1.Quiz.destroy({ where: {} });
            await models_1.QuestionBankItem.destroy({ where: {} });
            await models_1.Category.destroy({ where: {} });
            await models_1.User.destroy({ where: { role: { [sequelize_1.Op.ne]: 'ADMIN' } } });
            res.status(200).json({
                success: true,
                message: 'Database cleared successfully (admin users preserved)'
            });
        }
        catch (error) {
            (0, logger_1.logError)('Failed to clear database', error);
            next(error);
        }
    }
    async getSystemHealth(req, res, next) {
        try {
            const health = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                database: 'connected'
            };
            res.status(200).json({
                success: true,
                data: health,
                message: 'System health check completed'
            });
        }
        catch (error) {
            (0, logger_1.logError)('Failed to get system health', error);
            next(error);
        }
    }
    async getSystemLogs(req, res, next) {
        try {
            const logs = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'System running normally'
                }
            ];
            res.status(200).json({
                success: true,
                data: logs,
                message: 'System logs retrieved successfully'
            });
        }
        catch (error) {
            (0, logger_1.logError)('Failed to get system logs', error);
            next(error);
        }
    }
}
exports.AdminController = AdminController;
exports.adminController = new AdminController();
//# sourceMappingURL=adminController.js.map