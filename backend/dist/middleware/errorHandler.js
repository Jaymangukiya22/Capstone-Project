"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const client_1 = require("@prisma/client");
const errorHandler = (error, req, res, next) => {
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal Server Error';
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
            case 'P2002':
                statusCode = 409;
                message = 'A record with this data already exists';
                break;
            case 'P2025':
                statusCode = 404;
                message = 'Record not found';
                break;
            case 'P2003':
                statusCode = 400;
                message = 'Foreign key constraint failed';
                break;
            default:
                statusCode = 400;
                message = 'Database operation failed';
        }
    }
    if (error instanceof client_1.Prisma.PrismaClientValidationError) {
        statusCode = 400;
        message = 'Invalid data provided';
    }
    if (error.name === 'ValidationError') {
        statusCode = 400;
        message = error.message;
    }
    console.error('Error:', {
        message: error.message,
        stack: error.stack,
        statusCode,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });
    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && {
            stack: error.stack,
            details: error
        })
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map