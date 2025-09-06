"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const categoryRoutes_1 = __importDefault(require("./routes/categoryRoutes"));
const quizRoutes_1 = __importDefault(require("./routes/quizRoutes"));
const questionRoutes_1 = __importDefault(require("./routes/questionRoutes"));
const errorHandler_1 = require("./middleware/errorHandler");
const auth_1 = require("./middleware/auth");
const redis_1 = require("./utils/redis");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
exports.prisma = new client_1.PrismaClient();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Quiz App Backend',
        version: '1.0.0'
    });
});
app.use('/api/categories', auth_1.basicAuth, categoryRoutes_1.default);
app.use('/api/quizzes', auth_1.basicAuth, quizRoutes_1.default);
app.use('/api/questions', auth_1.basicAuth, questionRoutes_1.default);
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.originalUrl}`
    });
});
app.use(errorHandler_1.errorHandler);
process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await exports.prisma.$disconnect();
    await redis_1.redisService.disconnect();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await exports.prisma.$disconnect();
    await redis_1.redisService.disconnect();
    process.exit(0);
});
async function startServer() {
    try {
        await redis_1.redisService.connect();
        console.log('✅ Connected to Redis');
        await exports.prisma.$connect();
        console.log('✅ Connected to PostgreSQL');
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=server.js.map