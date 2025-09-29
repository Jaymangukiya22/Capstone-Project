"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateParams = exports.validateQuery = exports.validateRequest = void 0;
const logger_1 = require("../utils/logger");
const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });
        if (error) {
            const errorDetails = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                type: detail.type
            }));
            (0, logger_1.logError)('Validation error', error);
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                message: 'Request validation failed',
                details: errorDetails
            });
            return;
        }
        req.body = value;
        next();
    };
};
exports.validateRequest = validateRequest;
const validateQuery = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query, {
            abortEarly: false,
            stripUnknown: true
        });
        if (error) {
            const errorDetails = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                type: detail.type
            }));
            (0, logger_1.logError)('Query validation error', error);
            res.status(400).json({
                success: false,
                error: 'Query validation failed',
                message: 'Query parameters validation failed',
                details: errorDetails
            });
            return;
        }
        req.query = value;
        next();
    };
};
exports.validateQuery = validateQuery;
const validateParams = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.params, {
            abortEarly: false,
            stripUnknown: true
        });
        if (error) {
            const errorDetails = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                type: detail.type
            }));
            (0, logger_1.logError)('Params validation error', error);
            res.status(400).json({
                success: false,
                error: 'Parameters validation failed',
                message: 'URL parameters validation failed',
                details: errorDetails
            });
            return;
        }
        req.params = value;
        next();
    };
};
exports.validateParams = validateParams;
//# sourceMappingURL=validation.js.map