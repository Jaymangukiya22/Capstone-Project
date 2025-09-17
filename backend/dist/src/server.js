"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
require("./tracing");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_prom_bundle_1 = __importDefault(require("express-prom-bundle"));
const client_1 = require("@prisma/client");
const categoryRoutes_1 = __importDefault(require("./routes/categoryRoutes"));
const quizRoutes_1 = __importDefault(require("./routes/quizRoutes"));
const questionRoutes_1 = __importDefault(require("./routes/questionRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const questionBankRoutes_1 = __importDefault(require("./routes/questionBankRoutes"));
const quizAttemptRoutes_1 = __importDefault(require("./routes/quizAttemptRoutes"));
const errorHandler_1 = require("./middleware/errorHandler");
const requestLogger_1 = require("./middleware/requestLogger");
const logger_1 = require("./utils/logger");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
exports.prisma = new client_1.PrismaClient();
const metricsMiddleware = (0, express_prom_bundle_1.default)({
    includeMethod: true,
    includePath: true,
    includeStatusCode: true,
    includeUp: true,
    customLabels: { project_name: 'quiz-app-backend' },
    promClient: {
        collectDefaultMetrics: {},
    },
});
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: '*' }));
app.use((0, compression_1.default)());
app.use(metricsMiddleware);
app.use(requestLogger_1.requestLogger);
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Quiz Management System Backend',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});
app.use('/api/auth', authRoutes_1.default);
app.use('/api/categories', categoryRoutes_1.default);
app.use('/api/quizzes', quizRoutes_1.default);
app.use('/api/questions', questionRoutes_1.default);
app.use('/api/question-bank', questionBankRoutes_1.default);
app.use('/api/quiz-attempts', quizAttemptRoutes_1.default);
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.originalUrl}`
    });
});
app.use(errorHandler_1.errorHandler);
process.on('SIGINT', async () => {
    (0, logger_1.logInfo)('Received SIGINT, shutting down gracefully...');
    await exports.prisma.$disconnect();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    (0, logger_1.logInfo)('Received SIGTERM, shutting down gracefully...');
    await exports.prisma.$disconnect();
    process.exit(0);
});
async function startServer() {
    try {
        await exports.prisma.$connect();
        (0, logger_1.logInfo)('Connected to PostgreSQL database');
        app.listen(PORT, () => {
            (0, logger_1.logInfo)('Server started successfully', {
                port: PORT,
                environment: process.env.NODE_ENV || 'development',
                healthCheck: `http://localhost:${PORT}/health`,
                metrics: `http://localhost:${PORT}/metrics`
            });
        });
    }
    catch (error) {
        (0, logger_1.logError)('Failed to start server', error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=server.js.map