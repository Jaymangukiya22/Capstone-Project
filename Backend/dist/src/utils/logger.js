"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logDebug = exports.logWarn = exports.logError = exports.logInfo = void 0;
const winston = require("winston");
const path = require("path");
const fs = require("fs");
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }), winston.format.errors({ stack: true }), winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }), winston.format.json()),
    defaultMeta: {
        service: 'quiz-app-backend',
        version: '1.0.0'
    },
    transports: [
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880,
            maxFiles: 5,
        }),
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880,
            maxFiles: 5,
        }),
        new winston.transports.File({
            filename: path.join(logsDir, 'app.log'),
            level: 'info',
            maxsize: 5242880,
            maxFiles: 5,
        }),
    ],
});
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), winston.format.simple(), winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        }))
    }));
}
const logInfo = (message, meta) => {
    logger.info(message, meta);
};
exports.logInfo = logInfo;
const logError = (message, error, meta) => {
    logger.error(message, { error: error?.stack || error, ...meta });
};
exports.logError = logError;
const logWarn = (message, meta) => {
    logger.warn(message, meta);
};
exports.logWarn = logWarn;
const logDebug = (message, meta) => {
    logger.debug(message, meta);
};
exports.logDebug = logDebug;
exports.default = logger;
//# sourceMappingURL=logger.js.map