"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserStats = exports.getLeaderboard = exports.getUserAttempts = exports.getAttemptById = exports.completeQuizAttempt = exports.submitAnswer = exports.startQuizAttempt = void 0;
const quizAttemptService_1 = require("../services/quizAttemptService");
const logger_1 = require("../utils/logger");
const startQuizAttempt = async (req, res) => {
    try {
        const { quizId } = req.body;
        let userId = req.user?.id;
        if (!userId) {
            const { User } = await Promise.resolve().then(() => require('../models'));
            const firstUser = await User.findOne();
            if (!firstUser) {
                res.status(400).json({
                    success: false,
                    error: 'No users found',
                    message: 'Please ensure the database is properly seeded with users'
                });
                return;
            }
            userId = firstUser.id;
        }
        const attempt = await quizAttemptService_1.quizAttemptService.startQuizAttempt({
            userId,
            quizId
        });
        res.status(201).json({
            success: true,
            data: { attempt },
            message: 'Quiz attempt started successfully'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Error starting quiz attempt', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start quiz attempt',
            message: error instanceof Error ? error.message : 'An error occurred while starting the quiz'
        });
    }
};
exports.startQuizAttempt = startQuizAttempt;
const submitAnswer = async (req, res) => {
    try {
        const attemptId = parseInt(req.params.attemptId);
        const { questionId, selectedOptions, timeSpent } = req.body;
        if (isNaN(attemptId)) {
            res.status(400).json({
                success: false,
                error: 'Invalid attempt ID',
                message: 'Attempt ID must be a number'
            });
            return;
        }
        const result = await quizAttemptService_1.quizAttemptService.submitAnswer({
            attemptId,
            questionId,
            selectedOptions,
            timeSpent
        });
        res.json({
            success: true,
            data: result,
            message: 'Answer submitted successfully'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Error submitting answer', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit answer',
            message: error instanceof Error ? error.message : 'An error occurred while submitting the answer'
        });
    }
};
exports.submitAnswer = submitAnswer;
const completeQuizAttempt = async (req, res) => {
    try {
        const attemptId = parseInt(req.params.attemptId);
        let userId = req.user?.id;
        if (!userId) {
            const { User } = await Promise.resolve().then(() => require('../models'));
            const firstUser = await User.findOne();
            if (!firstUser) {
                res.status(400).json({
                    success: false,
                    error: 'No users found',
                    message: 'Please ensure the database is properly seeded with users'
                });
                return;
            }
            userId = firstUser.id;
        }
        if (isNaN(attemptId)) {
            res.status(400).json({
                success: false,
                error: 'Invalid attempt ID',
                message: 'Attempt ID must be a number'
            });
            return;
        }
        const result = await quizAttemptService_1.quizAttemptService.completeQuizAttempt({
            attemptId,
            userId
        });
        res.json({
            success: true,
            data: result,
            message: 'Quiz completed successfully'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Error completing quiz attempt', error);
        res.status(500).json({
            success: false,
            error: 'Failed to complete quiz',
            message: error instanceof Error ? error.message : 'An error occurred while completing the quiz'
        });
    }
};
exports.completeQuizAttempt = completeQuizAttempt;
const getAttemptById = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const userId = req.user?.id || 1;
        if (isNaN(id)) {
            res.status(400).json({
                success: false,
                error: 'Invalid attempt ID',
                message: 'Attempt ID must be a number'
            });
            return;
        }
        const attempt = await quizAttemptService_1.quizAttemptService.getAttemptById(id, userId);
        if (!attempt) {
            res.status(404).json({
                success: false,
                error: 'Attempt not found',
                message: 'Quiz attempt not found or access denied'
            });
            return;
        }
        res.json({
            success: true,
            data: { attempt },
            message: 'Quiz attempt retrieved successfully'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Error fetching quiz attempt', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch quiz attempt',
            message: 'An error occurred while fetching the quiz attempt'
        });
    }
};
exports.getAttemptById = getAttemptById;
const getUserAttempts = async (req, res) => {
    try {
        const userId = req.user?.id || 1;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await quizAttemptService_1.quizAttemptService.getUserAttempts(userId, page, limit);
        res.json({
            success: true,
            data: result,
            message: 'User attempts retrieved successfully'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Error fetching user attempts', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch attempts',
            message: 'An error occurred while fetching user attempts'
        });
    }
};
exports.getUserAttempts = getUserAttempts;
const getLeaderboard = async (req, res) => {
    try {
        const quizId = req.query.quizId ? parseInt(req.query.quizId) : undefined;
        const limit = parseInt(req.query.limit) || 10;
        const leaderboard = await quizAttemptService_1.quizAttemptService.getLeaderboard(quizId, limit);
        res.json({
            success: true,
            data: { leaderboard },
            message: 'Leaderboard retrieved successfully'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Error fetching leaderboard', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch leaderboard',
            message: 'An error occurred while fetching the leaderboard'
        });
    }
};
exports.getLeaderboard = getLeaderboard;
const getUserStats = async (req, res) => {
    try {
        const userId = req.user?.id || 1;
        const stats = await quizAttemptService_1.quizAttemptService.getUserStats(userId);
        res.json({
            success: true,
            data: stats,
            message: 'User statistics retrieved successfully'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Error fetching user stats', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user stats',
            message: 'An error occurred while fetching user statistics'
        });
    }
};
exports.getUserStats = getUserStats;
//# sourceMappingURL=quizAttemptController.js.map