"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getProfile = exports.refreshToken = exports.login = exports.register = void 0;
const client_1 = require("@prisma/client");
const auth_1 = require("../utils/auth");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
const register = async (req, res) => {
    try {
        const { username, email, password, firstName, lastName, role } = req.body;
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
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
        const user = await prisma.user.create({
            data: {
                username,
                email,
                passwordHash,
                firstName,
                lastName,
                role: role || client_1.UserRole.PLAYER
            },
            select: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                eloRating: true,
                createdAt: true
            }
        });
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
                user,
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
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                username: true,
                email: true,
                passwordHash: true,
                firstName: true,
                lastName: true,
                role: true,
                eloRating: true,
                isActive: true,
                totalMatches: true,
                wins: true,
                losses: true
            }
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
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
        });
        const token = (0, auth_1.generateToken)({
            userId: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        });
        const refreshToken = (0, auth_1.generateRefreshToken)(user.id);
        const { passwordHash, ...userWithoutPassword } = user;
        (0, logger_1.logInfo)('User logged in successfully', { userId: user.id, username: user.username });
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: userWithoutPassword,
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
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                isActive: true
            }
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
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true,
                avatar: true,
                role: true,
                eloRating: true,
                totalMatches: true,
                wins: true,
                losses: true,
                createdAt: true,
                lastLoginAt: true
            }
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
        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                firstName,
                lastName,
                avatar
            },
            select: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true,
                avatar: true,
                role: true,
                eloRating: true,
                totalMatches: true,
                wins: true,
                losses: true
            }
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