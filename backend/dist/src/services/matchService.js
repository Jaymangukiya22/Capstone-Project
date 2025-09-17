"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchService = exports.MatchService = void 0;
const socket_io_1 = require("socket.io");
const client_1 = require("@prisma/client");
const redis_1 = __importDefault(require("redis"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("../utils/logger");
const uuid_1 = require("uuid");
const prisma = new client_1.PrismaClient();
const redis = redis_1.default.createClient({ url: process.env.REDIS_URL });
class MatchService {
    constructor(server) {
        this.matches = new Map();
        this.userToMatch = new Map();
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        this.setupSocketHandlers();
        this.startMatchCleanup();
    }
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            (0, logger_1.logInfo)('Client connected', { socketId: socket.id });
            socket.on('authenticate', async (token) => {
                try {
                    const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
                    const user = await prisma.user.findUnique({
                        where: { id: decoded.userId },
                        select: { id: true, username: true, isActive: true }
                    });
                    if (!user || !user.isActive) {
                        socket.emit('auth_error', { message: 'Invalid token or user inactive' });
                        return;
                    }
                    socket.data.userId = user.id;
                    socket.data.username = user.username;
                    socket.emit('authenticated', { user });
                    (0, logger_1.logInfo)('User authenticated', { userId: user.id, socketId: socket.id });
                }
                catch (error) {
                    socket.emit('auth_error', { message: 'Authentication failed' });
                    (0, logger_1.logError)('Authentication error', error);
                }
            });
            socket.on('create_match', async (data) => {
                try {
                    if (!socket.data.userId) {
                        socket.emit('error', { message: 'Not authenticated' });
                        return;
                    }
                    const match = await this.createMatch(data.quizId, socket.data.userId, data.maxPlayers);
                    socket.join(match.id);
                    socket.emit('match_created', { matchId: match.id, matchCode: match.id.slice(-6).toUpperCase() });
                    (0, logger_1.logInfo)('Match created', { matchId: match.id, userId: socket.data.userId });
                }
                catch (error) {
                    socket.emit('error', { message: 'Failed to create match' });
                    (0, logger_1.logError)('Create match error', error);
                }
            });
            socket.on('join_match', async (data) => {
                try {
                    if (!socket.data.userId) {
                        socket.emit('error', { message: 'Not authenticated' });
                        return;
                    }
                    const matchId = await this.findMatchByCode(data.matchCode);
                    if (!matchId) {
                        socket.emit('error', { message: 'Match not found' });
                        return;
                    }
                    const success = await this.joinMatch(matchId, socket.data.userId, socket.id);
                    if (success) {
                        socket.join(matchId);
                        const match = this.matches.get(matchId);
                        socket.emit('match_joined', {
                            matchId,
                            players: Array.from(match.players.values()).map(p => ({
                                userId: p.userId,
                                username: p.username,
                                isReady: p.isReady
                            }))
                        });
                        socket.to(matchId).emit('player_joined', {
                            userId: socket.data.userId,
                            username: socket.data.username
                        });
                        (0, logger_1.logInfo)('Player joined match', { matchId, userId: socket.data.userId });
                    }
                    else {
                        socket.emit('error', { message: 'Failed to join match' });
                    }
                }
                catch (error) {
                    socket.emit('error', { message: 'Failed to join match' });
                    (0, logger_1.logError)('Join match error', error);
                }
            });
            socket.on('player_ready', async () => {
                try {
                    const matchId = this.userToMatch.get(socket.data.userId);
                    if (!matchId) {
                        socket.emit('error', { message: 'Not in a match' });
                        return;
                    }
                    const match = this.matches.get(matchId);
                    if (!match) {
                        socket.emit('error', { message: 'Match not found' });
                        return;
                    }
                    const player = match.players.get(socket.data.userId);
                    if (player) {
                        player.isReady = true;
                        this.io.to(matchId).emit('player_ready', {
                            userId: socket.data.userId,
                            username: socket.data.username
                        });
                        const allReady = Array.from(match.players.values()).every(p => p.isReady);
                        if (allReady && match.players.size >= 2) {
                            await this.startMatch(matchId);
                        }
                    }
                }
                catch (error) {
                    (0, logger_1.logError)('Player ready error', error);
                }
            });
            socket.on('submit_answer', async (data) => {
                try {
                    const matchId = this.userToMatch.get(socket.data.userId);
                    if (!matchId) {
                        socket.emit('error', { message: 'Not in a match' });
                        return;
                    }
                    await this.submitAnswer(matchId, socket.data.userId, data);
                }
                catch (error) {
                    socket.emit('error', { message: 'Failed to submit answer' });
                    (0, logger_1.logError)('Submit answer error', error);
                }
            });
            socket.on('disconnect', () => {
                this.handleDisconnect(socket.data.userId, socket.id);
                (0, logger_1.logInfo)('Client disconnected', { socketId: socket.id, userId: socket.data.userId });
            });
        });
    }
    async createMatch(quizId, userId, maxPlayers = 10) {
        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId, isActive: true },
            include: {
                quizQuestions: {
                    include: {
                        question: {
                            include: {
                                options: true
                            }
                        }
                    },
                    orderBy: { order: 'asc' }
                }
            }
        });
        if (!quiz || quiz.quizQuestions.length === 0) {
            throw new Error('Quiz not found or has no questions');
        }
        const matchId = (0, uuid_1.v4)();
        const questions = quiz.quizQuestions.map(qq => qq.question);
        const match = {
            id: matchId,
            quizId,
            quiz: {
                id: quiz.id,
                title: quiz.title,
                timeLimit: quiz.timeLimit
            },
            players: new Map(),
            status: 'WAITING',
            currentQuestionIndex: 0,
            questionStartTime: 0,
            maxPlayers,
            timeLimit: quiz.timeLimit || 30,
            questions,
            createdAt: new Date()
        };
        const creator = {
            userId,
            username: '',
            socketId: '',
            score: 0,
            currentQuestionIndex: 0,
            isReady: false,
            answers: []
        };
        match.players.set(userId, creator);
        this.matches.set(matchId, match);
        this.userToMatch.set(userId, matchId);
        await redis.setEx(`match:${matchId}`, 3600, JSON.stringify({
            id: matchId,
            quizId,
            status: match.status,
            createdAt: match.createdAt
        }));
        return match;
    }
    async findMatchByCode(code) {
        for (const [matchId, match] of this.matches) {
            if (matchId.slice(-6).toUpperCase() === code.toUpperCase()) {
                return matchId;
            }
        }
        return null;
    }
    async joinMatch(matchId, userId, socketId) {
        const match = this.matches.get(matchId);
        if (!match || match.status !== 'WAITING' || match.players.size >= match.maxPlayers) {
            return false;
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { username: true }
        });
        if (!user) {
            return false;
        }
        const player = {
            userId,
            username: user.username,
            socketId,
            score: 0,
            currentQuestionIndex: 0,
            isReady: false,
            answers: []
        };
        match.players.set(userId, player);
        this.userToMatch.set(userId, matchId);
        return true;
    }
    async startMatch(matchId) {
        const match = this.matches.get(matchId);
        if (!match)
            return;
        match.status = 'IN_PROGRESS';
        match.currentQuestionIndex = 0;
        match.questionStartTime = Date.now();
        const currentQuestion = match.questions[0];
        const questionForPlayers = {
            id: currentQuestion.id,
            questionText: currentQuestion.questionText,
            options: currentQuestion.options.map((opt) => ({
                id: opt.id,
                optionText: opt.optionText
            })),
            timeLimit: match.timeLimit
        };
        this.io.to(matchId).emit('match_started', {
            question: questionForPlayers,
            questionIndex: 0,
            totalQuestions: match.questions.length
        });
        setTimeout(() => {
            this.nextQuestion(matchId);
        }, match.timeLimit * 1000);
        (0, logger_1.logInfo)('Match started', { matchId, players: match.players.size });
    }
    async submitAnswer(matchId, userId, answerData) {
        const match = this.matches.get(matchId);
        if (!match || match.status !== 'IN_PROGRESS')
            return;
        const player = match.players.get(userId);
        if (!player)
            return;
        const currentQuestion = match.questions[match.currentQuestionIndex];
        if (currentQuestion.id !== answerData.questionId)
            return;
        const correctOptionIds = currentQuestion.options
            .filter((opt) => opt.isCorrect)
            .map((opt) => opt.id);
        const isCorrect = answerData.selectedOptions.length === correctOptionIds.length &&
            answerData.selectedOptions.every(id => correctOptionIds.includes(id));
        const maxTime = match.timeLimit;
        const timeBonus = Math.max(0, (maxTime - answerData.timeSpent) / maxTime);
        const points = isCorrect ? Math.round(100 + (timeBonus * 50)) : 0;
        player.answers.push({
            questionId: answerData.questionId,
            selectedOptions: answerData.selectedOptions,
            timeSpent: answerData.timeSpent,
            isCorrect
        });
        player.score += points;
        this.io.to(player.socketId).emit('answer_result', {
            isCorrect,
            points,
            correctOptions: correctOptionIds,
            totalScore: player.score
        });
        (0, logger_1.logInfo)('Answer submitted', {
            matchId,
            userId,
            isCorrect,
            points,
            timeSpent: answerData.timeSpent
        });
    }
    async nextQuestion(matchId) {
        const match = this.matches.get(matchId);
        if (!match)
            return;
        match.currentQuestionIndex++;
        if (match.currentQuestionIndex >= match.questions.length) {
            await this.endMatch(matchId);
            return;
        }
        const currentQuestion = match.questions[match.currentQuestionIndex];
        const questionForPlayers = {
            id: currentQuestion.id,
            questionText: currentQuestion.questionText,
            options: currentQuestion.options.map((opt) => ({
                id: opt.id,
                optionText: opt.optionText
            })),
            timeLimit: match.timeLimit
        };
        match.questionStartTime = Date.now();
        this.io.to(matchId).emit('next_question', {
            question: questionForPlayers,
            questionIndex: match.currentQuestionIndex,
            totalQuestions: match.questions.length
        });
        setTimeout(() => {
            this.nextQuestion(matchId);
        }, match.timeLimit * 1000);
    }
    async endMatch(matchId) {
        const match = this.matches.get(matchId);
        if (!match)
            return;
        match.status = 'COMPLETED';
        const rankings = Array.from(match.players.values())
            .sort((a, b) => {
            if (b.score !== a.score)
                return b.score - a.score;
            const avgTimeA = a.answers.reduce((sum, ans) => sum + ans.timeSpent, 0) / a.answers.length;
            const avgTimeB = b.answers.reduce((sum, ans) => sum + ans.timeSpent, 0) / b.answers.length;
            return avgTimeA - avgTimeB;
        })
            .map((player, index) => ({
            rank: index + 1,
            userId: player.userId,
            username: player.username,
            score: player.score,
            correctAnswers: player.answers.filter(a => a.isCorrect).length,
            totalAnswers: player.answers.length
        }));
        await this.updateEloRatings(rankings);
        this.io.to(matchId).emit('match_completed', {
            rankings,
            matchId
        });
        for (const player of match.players.values()) {
            this.userToMatch.delete(player.userId);
        }
        setTimeout(() => {
            this.matches.delete(matchId);
            redis.del(`match:${matchId}`);
        }, 300000);
        (0, logger_1.logInfo)('Match completed', { matchId, players: rankings.length });
    }
    async updateEloRatings(rankings) {
        try {
            const winner = rankings[0];
            const eloChange = 25;
            for (const player of rankings) {
                const change = player.rank === 1 ? eloChange : -Math.floor(eloChange / (rankings.length - 1));
                await prisma.user.update({
                    where: { id: player.userId },
                    data: {
                        eloRating: { increment: change },
                        totalMatches: { increment: 1 },
                        wins: player.rank === 1 ? { increment: 1 } : undefined,
                        losses: player.rank !== 1 ? { increment: 1 } : undefined
                    }
                });
            }
        }
        catch (error) {
            (0, logger_1.logError)('Failed to update ELO ratings', error);
        }
    }
    handleDisconnect(userId, socketId) {
        const matchId = this.userToMatch.get(userId);
        if (!matchId)
            return;
        const match = this.matches.get(matchId);
        if (!match)
            return;
        const player = match.players.get(userId);
        if (!player)
            return;
        this.io.to(matchId).emit('player_disconnected', {
            userId,
            username: player.username
        });
        if (match.status === 'WAITING') {
            match.players.delete(userId);
            this.userToMatch.delete(userId);
            if (match.players.size === 0) {
                this.matches.delete(matchId);
                redis.del(`match:${matchId}`);
            }
        }
    }
    startMatchCleanup() {
        setInterval(() => {
            const now = Date.now();
            const maxAge = 60 * 60 * 1000;
            for (const [matchId, match] of this.matches) {
                if (now - match.createdAt.getTime() > maxAge) {
                    this.matches.delete(matchId);
                    redis.del(`match:${matchId}`);
                    (0, logger_1.logInfo)('Cleaned up old match', { matchId });
                }
            }
        }, 10 * 60 * 1000);
    }
    getActiveMatches() {
        return Array.from(this.matches.values()).map(match => ({
            id: match.id,
            quizId: match.quizId,
            quiz: match.quiz,
            playerCount: match.players.size,
            maxPlayers: match.maxPlayers,
            status: match.status,
            createdAt: match.createdAt
        }));
    }
    getMatchById(matchId) {
        return this.matches.get(matchId);
    }
}
exports.MatchService = MatchService;
//# sourceMappingURL=matchService.js.map