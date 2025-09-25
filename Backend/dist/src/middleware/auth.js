"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePlayer = exports.requireAdmin = exports.requireRole = exports.authenticateToken = void 0;
const jsonwebtoken_1 = require("jsonwebtoken");
const models_1 = require("../models");
const logger_1 = require("../utils/logger");
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            res.status(401).json({
                success: false,
                error: 'Access token required',
                message: 'Please provide a valid access token'
            });
            return;
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            (0, logger_1.logError)('JWT_SECRET not configured', new Error('Missing JWT_SECRET'));
            res.status(500).json({
                success: false,
                error: 'Server configuration error'
            });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        const user = await models_1.User.findByPk(decoded.userId, {
            attributes: ['id', 'username', 'email', 'role', 'isActive']
        });
        if (!user || !user.isActive) {
            res.status(401).json({
                success: false,
                error: 'Invalid or expired token',
                message: 'User not found or account deactivated'
            });
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        (0, logger_1.logError)('Authentication error', error);
        res.status(403).json({
            success: false,
            error: 'Invalid token',
            message: 'Token verification failed'
        });
    }
};
exports.authenticateToken = authenticateToken;
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                message: `Required role: ${roles.join(' or ')}`
            });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
exports.requireAdmin = (0, exports.requireRole)([models_1.UserRole.ADMIN]);
exports.requirePlayer = (0, exports.requireRole)([models_1.UserRole.PLAYER, models_1.UserRole.ADMIN]);
//# sourceMappingURL=auth.js.map