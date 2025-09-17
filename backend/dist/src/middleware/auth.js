"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePlayer = exports.requireAdmin = exports.requireRole = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
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
exports.requireAdmin = (0, exports.requireRole)([client_1.UserRole.ADMIN]);
exports.requirePlayer = (0, exports.requireRole)([client_1.UserRole.PLAYER, client_1.UserRole.ADMIN]);
//# sourceMappingURL=auth.js.map