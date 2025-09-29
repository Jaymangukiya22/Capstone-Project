"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getProfile = exports.refreshToken = exports.login = exports.register = void 0;
const models_1 = require("../models");
const auth_1 = require("../utils/auth");
const logger_1 = require("../utils/logger");
const sequelize_1 = require("sequelize");
const register = async (req, res) => {
    try {
        const { username, email, password, firstName, lastName, role } = req.body;
        const existingUser = await models_1.User.findOne({
            where: {
                [sequelize_1.Op.or]: [
                    { email },
                    { username }
                ]
            }
        });
        if (existingUser) {
            res.status(400).json({
                success: false,
                error: 'User already exists',
                message: 'Email or username already registered'
            });
            return;
        }
        const passwordHash = await (0, auth_1.hashPassword)(password);
        const user = await models_1.User.create({
            username,
            email,
            passwordHash,
            firstName,
            lastName,
            role: role || models_1.UserRole.ADMIN
        });
        const userResponse = {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            eloRating: user.eloRating,
            createdAt: user.createdAt
        };
        const token = (0, auth_1.generateToken)({
            userId: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        });
        const refreshToken = (0, auth_1.generateRefreshToken)(user.id);
        (0, logger_1.logInfo)('User registered successfully', { userId: user.id, username: user.username });
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: userResponse,
                token,
                refreshToken
            }
        });
    }
    catch (error) {
        (0, logger_1.logError)('Registration error', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed',
            message: 'An error occurred during registration'
        });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await models_1.User.findOne({
            where: { email }
        });
        if (!user || !user.isActive) {
            res.status(401).json({
                success: false,
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
            return;
        }
        const isPasswordValid = await (0, auth_1.comparePassword)(password, user.passwordHash);
        if (!isPasswordValid) {
            res.status(401).json({
                success: false,
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
            return;
        }
        await models_1.User.update({ lastLoginAt: new Date() }, { where: { id: user.id } });
        const token = (0, auth_1.generateToken)({
            userId: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        });
        const refreshToken = (0, auth_1.generateRefreshToken)(user.id);
        const userResponse = {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            eloRating: user.eloRating,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt
        };
        (0, logger_1.logInfo)('User logged in successfully', { userId: user.id, username: user.username });
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: userResponse,
                token,
                refreshToken
            }
        });
    }
    catch (error) {
        (0, logger_1.logError)('Login error', error);
        res.status(500).json({
            success: false,
            error: 'Login failed',
            message: 'An error occurred during login'
        });
    }
};
exports.login = login;
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            res.status(400).json({
                success: false,
                error: 'Refresh token required'
            });
            return;
        }
        const decoded = (0, auth_1.verifyRefreshToken)(refreshToken);
        const user = await models_1.User.findByPk(decoded.userId, {
            attributes: ['id', 'username', 'email', 'role', 'isActive']
        });
        if (!user || !user.isActive) {
            res.status(401).json({
                success: false,
                error: 'Invalid refresh token'
            });
            return;
        }
        const newToken = (0, auth_1.generateToken)({
            userId: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        });
        const newRefreshToken = (0, auth_1.generateRefreshToken)(user.id);
        res.json({
            success: true,
            data: {
                token: newToken,
                refreshToken: newRefreshToken
            }
        });
    }
    catch (error) {
        (0, logger_1.logError)('Token refresh error', error);
        res.status(401).json({
            success: false,
            error: 'Invalid refresh token'
        });
    }
};
exports.refreshToken = refreshToken;
const getProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        const user = await models_1.User.findByPk(userId, {
            attributes: [
                'id', 'username', 'email', 'firstName', 'lastName', 'avatar',
                'role', 'eloRating', 'totalMatches', 'wins', 'losses',
                'createdAt', 'lastLoginAt'
            ]
        });
        if (!user) {
            res.status(404).json({
                success: false,
                error: 'User not found'
            });
            return;
        }
        res.json({
            success: true,
            data: { user }
        });
    }
    catch (error) {
        (0, logger_1.logError)('Get profile error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch profile'
        });
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { firstName, lastName, avatar } = req.body;
        await models_1.User.update({ firstName, lastName, avatar }, { where: { id: userId } });
        const user = await models_1.User.findByPk(userId, {
            attributes: [
                'id', 'username', 'email', 'firstName', 'lastName', 'avatar',
                'role', 'eloRating', 'totalMatches', 'wins', 'losses'
            ]
        });
        (0, logger_1.logInfo)('Profile updated successfully', { userId });
        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: { user }
        });
    }
    catch (error) {
        (0, logger_1.logError)('Update profile error', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update profile'
        });
    }
};
exports.updateProfile = updateProfile;
//# sourceMappingURL=authController.js.map