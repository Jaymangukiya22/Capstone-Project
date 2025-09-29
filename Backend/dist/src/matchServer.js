"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchService = void 0;
const express_1 = require("express");
const http_1 = require("http");
const helmet_1 = require("helmet");
const compression_1 = require("compression");
const cors_1 = require("cors");
const socket_io_1 = require("socket.io");
const redis_1 = require("redis");
const matchService_1 = require("./services/matchService");
const logger_1 = require("./utils/logger");
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const port = process.env.MATCH_SERVICE_PORT || 3001;
const redis = (0, redis_1.createClient)({ url: process.env.REDIS_URL });
redis.connect().catch(console.error);
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const matchService = new matchService_1.MatchService(io);
exports.matchService = matchService;
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'Quiz Match Service',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
app.get('/matches', (req, res) => {
    try {
        const matches = matchService.getActiveMatches();
        res.json({
            success: true,
            data: { matches },
            count: matches.length
        });
    }
    catch (error) {
        (0, logger_1.logError)('Failed to get active matches', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get active matches'
        });
    }
});
app.get('/matches/:matchId', (req, res) => {
    try {
        const match = matchService.getMatchById(req.params.matchId);
        if (!match) {
            res.status(404).json({
                success: false,
                error: 'Match not found'
            });
            return;
        }
        res.json({
            success: true,
            data: {
                match: {
                    id: match.id,
                    quizId: match.quizId,
                    quiz: match.quiz,
                    playerCount: match.players.size,
                    maxPlayers: match.maxPlayers,
                    status: match.status,
                    currentQuestionIndex: match.currentQuestionIndex,
                    totalQuestions: match.questions.length,
                    createdAt: match.createdAt
                }
            }
        });
    }
    catch (error) {
        (0, logger_1.logError)('Failed to get match details', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get match details'
        });
    }
});
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.originalUrl}`
    });
});
app.use((err, req, res, next) => {
    (0, logger_1.logError)('Unhandled error in match service', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});
process.on('SIGTERM', async () => {
    (0, logger_1.logInfo)('SIGTERM received, shutting down gracefully');
    server.close(() => {
        redis.disconnect();
        process.exit(0);
    });
});
process.on('SIGINT', async () => {
    (0, logger_1.logInfo)('SIGINT received, shutting down gracefully');
    server.close(() => {
        redis.disconnect();
        process.exit(0);
    });
});
server.listen(port, () => {
    (0, logger_1.logInfo)(`Match service started on port ${port}`, {
        port,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    });
});
//# sourceMappingURL=matchServer.js.map