"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhancedRequestLogger = exports.requestLogger = void 0;
const morgan_1 = require("morgan");
const logger_1 = require("../utils/logger");
const stream = {
    write: (message) => {
        logger_1.default.info(message.trim());
    }
};
morgan_1.default.token('id', (req) => {
    return req.id || 'unknown';
});
morgan_1.default.token('user', (req) => {
    return req.user?.username || 'anonymous';
});
const devFormat = ':method :url :status :response-time ms - :res[content-length]';
const prodFormat = ':remote-addr - :user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms';
exports.requestLogger = (0, morgan_1.default)(process.env.NODE_ENV === 'production' ? prodFormat : devFormat, {
    stream,
    skip: (req, res) => {
        return req.url === '/health' || req.url === '/metrics';
    }
});
const enhancedRequestLogger = (req, res, next) => {
    const startTime = Date.now();
    req.id = Math.random().toString(36).substr(2, 9);
    (0, logger_1.logInfo)('Request started', {
        requestId: req.id,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        timestamp: new Date().toISOString()
    });
    const originalEnd = res.end.bind(res);
    res.end = function (chunk, encoding, cb) {
        const duration = Date.now() - startTime;
        (0, logger_1.logInfo)('Request completed', {
            requestId: req.id,
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            contentLength: res.get('content-length') || 0,
            timestamp: new Date().toISOString()
        });
        if (typeof encoding === 'function') {
            return originalEnd(chunk, encoding);
        }
        return originalEnd(chunk, encoding, cb);
    };
    next();
};
exports.enhancedRequestLogger = enhancedRequestLogger;
exports.default = exports.requestLogger;
//# sourceMappingURL=requestLogger.js.map