"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_1 = require("../utils/logger");
const errorHandler = (error, req, res, next) => {
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal Server Error';
    if (error.name === 'PrismaClientKnownRequestError') {
        statusCode = 400;
        message = 'Database operation failed';
    }
    if (error.name === 'ValidationError') {
        statusCode = 400;
        message = error.message;
    }
    if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }
    if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }
    const errorMeta = {
        requestId: req.id || 'unknown',
        method: req.method,
        url: req.url,
        statusCode,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        timestamp: new Date().toISOString(),
        errorName: error.name,
        stack: error.stack
    };
    if (statusCode >= 500) {
        (0, logger_1.logError)('Server error occurred', error, errorMeta);
    }
    else {
        (0, logger_1.logWarn)('Client error occurred', { ...errorMeta, message });
    }
    if (process.env.NODE_ENV === 'development') {
        return res.status(statusCode).json({
            success: false,
            message,
            error: error.message,
            stack: error.stack,
            requestId: req.id
        });
    }
    if (error.isOperational || statusCode < 500) {
        return res.status(statusCode).json({
            success: false,
            message,
            requestId: req.id
        });
    }
    return res.status(500).json({
        success: false,
        message: 'Something went wrong',
        requestId: req.id
    });
};
exports.errorHandler = errorHandler;
exports.default = exports.errorHandler;
//# sourceMappingURL=errorHandler.js.map