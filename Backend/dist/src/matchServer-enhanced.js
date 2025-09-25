"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhancedMatchService = void 0;
const express_1 = require("express");
const http_1 = require("http");
const cors_1 = require("cors");
const helmet_1 = require("helmet");
const compression_1 = require("compression");
const dotenv_1 = require("dotenv");
const socket_io_1 = require("socket.io");
const index_1 = require("./models/index");
const redis_1 = require("redis");
const jsonwebtoken_1 = require("jsonwebtoken");
const logger_1 = require("./utils/logger");
const uuid_1 = require("uuid");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const port = process.env.MATCH_SERVICE_PORT || 3001;
class InMemoryStore {
    constructor() {
        this.data = new Map();
    }
    async get(key) {
        return this.data.get(key) || null;
    }
    async set(key, value, ttl) {
        this.data.set(key, value);
        if (ttl) {
            setTimeout(() => this.data.delete(key), ttl * 1000);
        }
    }
    async del(key) {
        this.data.delete(key);
    }
    async exists(key) {
        return this.data.has(key);
    }
}
let store;
let isRedisConnected = false;
async function initializeStore() {
    try {
        const redis = (0, redis_1.createClient)({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            socket: {
                connectTimeout: 3000
            }
        });
        redis.on('error', () => {
        });
        await Promise.race([
            redis.connect(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connection timeout')), 3000))
        ]);
        await redis.ping();
        store = redis;
        isRedisConnected = true;
        (0, logger_1.logInfo)('Connected to Redis for match service');
    }
    catch (error) {
        (0, logger_1.logInfo)('Redis unavailable, using in-memory store as fallback');
        store = new InMemoryStore();
        isRedisConnected = false;
    }
}
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin)
            return callback(null, true);
        if (process.env.NODE_ENV === 'development') {
            return callback(null, true);
        }
        const allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:5174'
        ];
        const networkIP = process.env.NETWORK_IP;
        if (networkIP) {
            allowedOrigins.push(`http://${networkIP}:5173`);
            allowedOrigins.push(`http://${networkIP}:5174`);
        }
        if (origin.match(/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d{4,5}$/)) {
            return callback(null, true);
        }
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Enhanced Match Service',
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development',
        store: isRedisConnected ? 'Redis' : 'In-Memory'
    });
});
app.get('/matches/code/:joinCode', async (req, res) => {
    try {
        const { joinCode } = req.params;
        const matchId = await store.get(`joinCode:${joinCode.toUpperCase()}`);
        if (!matchId) {
            return res.status(404).json({
                success: false,
                error: 'No match found with that join code'
            });
        }
        const matchData = await store.get(`match:${matchId}`);
        if (!matchData) {
            return res.status(404).json({
                success: false,
                error: 'Match data not found'
            });
        }
        const match = JSON.parse(matchData);
        let quizDetails = null;
        try {
            const quiz = await index_1.Quiz.findByPk(match.quizId);
            if (quiz) {
                quizDetails = {
                    id: quiz.id,
                    title: quiz.title,
                    description: quiz.description,
                    difficulty: quiz.difficulty,
                    timeLimit: quiz.timeLimit
                };
            }
        }
        catch (error) {
            (0, logger_1.logError)('Failed to fetch quiz details', error);
        }
        return res.json({
            success: true,
            data: {
                match: {
                    id: matchId,
                    matchId,
                    joinCode: match.joinCode,
                    quizId: match.quizId,
                    quiz: quizDetails || {
                        id: match.quizId,
                        title: `Quiz ${match.quizId}`,
                        description: 'Quiz description',
                        difficulty: 'MEDIUM',
                        timeLimit: 30
                    },
                    status: match.status,
                    playerCount: match.players ? match.players.length : 0,
                    maxPlayers: 2,
                    matchType: 'FRIEND',
                    players: match.players,
                    createdAt: match.createdAt
                }
            }
        });
    }
    catch (error) {
        (0, logger_1.logError)('Failed to get match by code', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to get match by code'
        });
    }
});
class EnhancedMatchService {
    constructor(server) {
        this.matches = new Map();
        this.userToMatch = new Map();
        this.joinCodeToMatch = new Map();
        this.io = new socket_io_1.Server(server, {
            cors: corsOptions,
            transports: ['websocket', 'polling']
        });
        this.setupSocketHandlers();
    }
    generateJoinCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
    async loadQuizQuestions(quizId) {
        try {
            (0, logger_1.logInfo)('Loading questions for quiz', { quizId });
            const quizQuestions = await index_1.QuizQuestion.findAll({
                where: { quizId },
                include: [{
                        model: index_1.QuestionBankItem,
                        as: 'question',
                        include: [{
                                model: index_1.QuestionBankOption,
                                as: 'options'
                            }]
                    }],
                order: [['order', 'ASC']]
            });
            (0, logger_1.logInfo)('Found quiz questions in database', {
                quizId,
                count: quizQuestions.length,
                questions: quizQuestions.map(qq => ({
                    id: qq.id,
                    questionId: qq.questionId,
                    order: qq.order,
                    hasQuestion: !!qq.question,
                    hasOptions: qq.question ? !!qq.question.options : false,
                    optionsCount: qq.question ? qq.question.options.length : 0
                }))
            });
            const transformedQuestions = quizQuestions.map((qq) => ({
                id: qq.question.id,
                questionText: qq.question.questionText,
                options: qq.question.options.map((opt) => ({
                    id: opt.id,
                    optionText: opt.optionText,
                    isCorrect: opt.isCorrect
                })),
                difficulty: qq.question.difficulty,
                points: qq.points || 100
            }));
            (0, logger_1.logInfo)('Transformed questions for match', {
                quizId,
                finalCount: transformedQuestions.length,
                questions: transformedQuestions.map(q => ({ id: q.id, text: q.questionText.substring(0, 30) + '...' }))
            });
            return transformedQuestions;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to load quiz questions', error);
            return [];
        }
    }
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            (0, logger_1.logInfo)('Client connected', { socketId: socket.id });
            socket.on('authenticate', async (data) => {
                try {
                    let userId;
                    let username;
                    let firstName = '';
                    let lastName = '';
                    if (typeof data === 'string') {
                        const decoded = jsonwebtoken_1.default.verify(data, process.env.JWT_SECRET);
                        const user = await index_1.User.findByPk(decoded.userId, {
                            attributes: ['id', 'username', 'firstName', 'lastName', 'email', 'isActive']
                        });
                        if (!user || !user.isActive) {
                            socket.emit('auth_error', { message: 'Invalid token or user inactive' });
                            return;
                        }
                        userId = user.id;
                        username = user.email || user.username;
                        firstName = user.firstName || '';
                        lastName = user.lastName || '';
                    }
                    else {
                        userId = data.userId || Math.floor(Math.random() * 1000);
                        username = data.username || `Player${userId}`;
                        if (data.firstName || data.lastName) {
                            firstName = data.firstName || '';
                            lastName = data.lastName || '';
                        }
                        else {
                            try {
                                const user = await index_1.User.findByPk(userId, {
                                    attributes: ['id', 'username', 'firstName', 'lastName', 'email', 'isActive']
                                });
                                if (user) {
                                    username = user.email || user.username;
                                    firstName = user.firstName || '';
                                    lastName = user.lastName || '';
                                }
                            }
                            catch (error) {
                                (0, logger_1.logInfo)('Using fallback user data', { userId, username });
                            }
                        }
                    }
                    socket.data.userId = userId;
                    socket.data.username = username;
                    socket.data.firstName = firstName;
                    socket.data.lastName = lastName;
                    const userData = { id: userId, username, firstName, lastName };
                    socket.emit('authenticated', { user: userData });
                    (0, logger_1.logInfo)('User authenticated', {
                        userId,
                        username,
                        firstName,
                        lastName,
                        socketId: socket.id,
                        receivedDataType: typeof data,
                        finalUserData: userData
                    });
                }
                catch (error) {
                    socket.emit('auth_error', { message: 'Authentication failed' });
                    (0, logger_1.logError)('Authentication error', error);
                }
            });
            socket.on('create_friend_match', async (data) => {
                try {
                    if (!socket.data.userId) {
                        socket.emit('error', { message: 'Not authenticated' });
                        return;
                    }
                    const quiz = await index_1.Quiz.findOne({
                        where: { id: data.quizId, isActive: true }
                    });
                    if (!quiz) {
                        socket.emit('error', { message: 'Quiz not found' });
                        return;
                    }
                    const matchId = (0, uuid_1.v4)();
                    const joinCode = this.generateJoinCode();
                    const questions = await this.loadQuizQuestions(data.quizId);
                    const match = {
                        id: matchId,
                        quizId: data.quizId,
                        quiz: {
                            id: quiz.id,
                            title: quiz.title,
                            timeLimit: quiz.timeLimit
                        },
                        players: new Map(),
                        status: 'WAITING',
                        currentQuestionIndex: 0,
                        questionStartTime: 0,
                        maxPlayers: 2,
                        timeLimit: quiz.timeLimit || 30,
                        questions,
                        createdAt: new Date(),
                        joinCode,
                        matchType: 'FRIEND_1V1'
                    };
                    const creator = {
                        userId: socket.data.userId,
                        username: socket.data.username,
                        firstName: socket.data.firstName,
                        lastName: socket.data.lastName,
                        socketId: socket.id,
                        score: 0,
                        currentQuestionIndex: 0,
                        isReady: false,
                        isAI: false,
                        answers: []
                    };
                    match.players.set(socket.data.userId, creator);
                    this.matches.set(matchId, match);
                    this.userToMatch.set(socket.data.userId, matchId);
                    this.joinCodeToMatch.set(joinCode, matchId);
                    socket.join(matchId);
                    socket.emit('friend_match_created', { matchId, joinCode });
                    const matchDataToStore = {
                        id: matchId,
                        quizId: data.quizId,
                        joinCode,
                        status: match.status,
                        createdAt: match.createdAt,
                        players: Array.from(match.players.values()).map(p => ({
                            userId: p.userId,
                            username: p.username,
                            firstName: p.firstName,
                            lastName: p.lastName,
                            isReady: p.isReady
                        }))
                    };
                    (0, logger_1.logInfo)('Storing match in Redis', {
                        matchId,
                        playersData: matchDataToStore.players
                    });
                    await store.set(`match:${matchId}`, JSON.stringify(matchDataToStore));
                    (0, logger_1.logInfo)('Friend match created', {
                        matchId,
                        joinCode,
                        userId: socket.data.userId,
                        username: socket.data.username
                    });
                }
                catch (error) {
                    socket.emit('error', { message: 'Failed to create friend match' });
                    (0, logger_1.logError)('Create friend match error', error);
                }
            });
            socket.on('join_match', async (data) => {
                try {
                    if (!socket.data.userId) {
                        socket.emit('error', { message: 'Not authenticated' });
                        return;
                    }
                    let matchId = this.joinCodeToMatch.get(data.joinCode.toUpperCase());
                    if (!matchId) {
                        const storedMatchId = await store.get(`joinCode:${data.joinCode.toUpperCase()}`);
                        if (!storedMatchId) {
                            socket.emit('error', { message: 'Invalid join code' });
                            return;
                        }
                        matchId = storedMatchId;
                    }
                    let match = this.matches.get(matchId);
                    if (!match) {
                        const matchData = await store.get(`match:${matchId}`);
                        if (!matchData) {
                            socket.emit('error', { message: 'Match not found' });
                            return;
                        }
                        const storedMatch = JSON.parse(matchData);
                        const questions = await this.loadQuizQuestions(storedMatch.quizId);
                        match = {
                            id: matchId,
                            quizId: storedMatch.quizId,
                            quiz: null,
                            joinCode: storedMatch.joinCode,
                            players: new Map(),
                            maxPlayers: 2,
                            status: 'WAITING',
                            questions,
                            currentQuestionIndex: 0,
                            questionStartTime: 0,
                            timeLimit: 30,
                            createdAt: new Date(storedMatch.createdAt),
                            matchType: 'FRIEND_1V1'
                        };
                        if (storedMatch.players && storedMatch.players.length > 0) {
                            const creator = storedMatch.players[0];
                            const creatorPlayer = {
                                userId: creator.userId,
                                username: creator.username,
                                firstName: creator.firstName || '',
                                lastName: creator.lastName || '',
                                socketId: '',
                                score: 0,
                                currentQuestionIndex: 0,
                                isReady: false,
                                isAI: false,
                                answers: []
                            };
                            match.players.set(creator.userId, creatorPlayer);
                        }
                        if (match) {
                            this.matches.set(matchId, match);
                            this.joinCodeToMatch.set(storedMatch.joinCode, matchId);
                        }
                    }
                    if (!match || match.status !== 'WAITING' || match.players.size >= match.maxPlayers) {
                        socket.emit('error', { message: 'Match not available' });
                        return;
                    }
                    if (match.players.has(socket.data.userId)) {
                        socket.emit('error', { message: 'Already in this match' });
                        return;
                    }
                    const player = {
                        userId: socket.data.userId,
                        username: socket.data.username,
                        firstName: socket.data.firstName,
                        lastName: socket.data.lastName,
                        socketId: socket.id,
                        score: 0,
                        currentQuestionIndex: 0,
                        isReady: false,
                        isAI: false,
                        answers: []
                    };
                    match.players.set(socket.data.userId, player);
                    this.userToMatch.set(socket.data.userId, matchId);
                    socket.join(matchId);
                    (0, logger_1.logInfo)('Second player joined WebSocket room', {
                        matchId,
                        userId: socket.data.userId,
                        socketId: socket.id,
                        roomSizeAfterJoin: this.io.sockets.adapter.rooms.get(matchId)?.size || 0
                    });
                    socket.emit('match_joined', {
                        matchId,
                        players: Array.from(match.players.values()).map(p => ({
                            userId: p.userId,
                            username: p.username,
                            firstName: p.firstName,
                            lastName: p.lastName,
                            isReady: p.isReady
                        }))
                    });
                    (0, logger_1.logInfo)('Broadcasting player list update', {
                        matchId,
                        roomSize: this.io.sockets.adapter.rooms.get(matchId)?.size || 0,
                        playerCount: match.players.size
                    });
                    this.io.to(matchId).emit('player_list_updated', {
                        players: Array.from(match.players.values()).map(p => ({
                            userId: p.userId,
                            username: p.username,
                            firstName: p.firstName,
                            lastName: p.lastName,
                            isReady: p.isReady
                        }))
                    });
                    Array.from(match.players.values()).forEach(player => {
                        if (player.socketId) {
                            this.io.to(player.socketId).emit('player_list_updated', {
                                players: Array.from(match.players.values()).map(p => ({
                                    userId: p.userId,
                                    username: p.username,
                                    firstName: p.firstName,
                                    lastName: p.lastName,
                                    isReady: p.isReady
                                }))
                            });
                        }
                    });
                    await store.set(`match:${matchId}`, JSON.stringify({
                        id: matchId,
                        quizId: match.quizId,
                        joinCode: match.joinCode,
                        status: match.status,
                        createdAt: match.createdAt,
                        players: Array.from(match.players.values()).map(p => ({
                            userId: p.userId,
                            username: p.username,
                            firstName: p.firstName,
                            lastName: p.lastName,
                            isReady: p.isReady
                        }))
                    }));
                    (0, logger_1.logInfo)('Player joined match', {
                        matchId,
                        userId: socket.data.userId,
                        playerCount: match.players.size
                    });
                }
                catch (error) {
                    socket.emit('error', { message: 'Failed to join match' });
                    (0, logger_1.logError)('Join match error', error);
                }
            });
            socket.on('connect_to_match', async (data) => {
                try {
                    if (!socket.data.userId) {
                        socket.emit('error', { message: 'Not authenticated' });
                        return;
                    }
                    let match = this.matches.get(data.matchId);
                    if (!match) {
                        const matchData = await store.get(`match:${data.matchId}`);
                        if (!matchData) {
                            socket.emit('error', { message: 'Match not found' });
                            return;
                        }
                        const storedMatch = JSON.parse(matchData);
                        const questions = await this.loadQuizQuestions(storedMatch.quizId);
                        match = {
                            id: data.matchId,
                            quizId: storedMatch.quizId,
                            quiz: null,
                            joinCode: storedMatch.joinCode,
                            players: new Map(),
                            maxPlayers: 2,
                            status: 'WAITING',
                            questions,
                            currentQuestionIndex: 0,
                            questionStartTime: 0,
                            timeLimit: 30,
                            createdAt: new Date(storedMatch.createdAt),
                            matchType: 'FRIEND_1V1'
                        };
                        if (storedMatch.players && Array.isArray(storedMatch.players)) {
                            for (const storedPlayer of storedMatch.players) {
                                const restoredPlayer = {
                                    userId: storedPlayer.userId,
                                    username: storedPlayer.username,
                                    firstName: storedPlayer.firstName || '',
                                    lastName: storedPlayer.lastName || '',
                                    socketId: '',
                                    score: 0,
                                    currentQuestionIndex: 0,
                                    isReady: storedPlayer.isReady || false,
                                    isAI: false,
                                    answers: []
                                };
                                match.players.set(storedPlayer.userId, restoredPlayer);
                            }
                        }
                        this.matches.set(data.matchId, match);
                        this.joinCodeToMatch.set(storedMatch.joinCode, data.matchId);
                    }
                    if (match) {
                        const existingPlayer = match.players.get(socket.data.userId);
                        if (existingPlayer) {
                            existingPlayer.socketId = socket.id;
                        }
                        else {
                            const player = {
                                userId: socket.data.userId,
                                username: socket.data.username,
                                firstName: socket.data.firstName,
                                lastName: socket.data.lastName,
                                socketId: socket.id,
                                score: 0,
                                currentQuestionIndex: 0,
                                isReady: false,
                                isAI: false,
                                answers: []
                            };
                            match.players.set(socket.data.userId, player);
                        }
                        this.userToMatch.set(socket.data.userId, data.matchId);
                        socket.join(data.matchId);
                        (0, logger_1.logInfo)('Player joined WebSocket room', {
                            matchId: data.matchId,
                            userId: socket.data.userId,
                            socketId: socket.id,
                            roomSize: this.io.sockets.adapter.rooms.get(data.matchId)?.size || 0
                        });
                        socket.emit('match_connected', {
                            matchId: data.matchId,
                            joinCode: match.joinCode,
                            players: Array.from(match.players.values()).map(p => ({
                                userId: p.userId,
                                username: p.username,
                                firstName: p.firstName,
                                lastName: p.lastName,
                                isReady: p.isReady
                            }))
                        });
                        this.io.to(data.matchId).emit('player_list_updated', {
                            players: Array.from(match.players.values()).map(p => ({
                                userId: p.userId,
                                username: p.username,
                                firstName: p.firstName,
                                lastName: p.lastName,
                                isReady: p.isReady
                            }))
                        });
                        (0, logger_1.logInfo)('Player connected to match', {
                            matchId: data.matchId,
                            userId: socket.data.userId,
                            playerCount: match.players.size
                        });
                    }
                }
                catch (error) {
                    socket.emit('error', { message: 'Failed to connect to match' });
                    (0, logger_1.logError)('Connect to match error', error);
                }
            });
            socket.on('player_ready', async (data = {}) => {
                try {
                    const matchId = this.userToMatch.get(socket.data.userId);
                    if (!matchId) {
                        socket.emit('error', { message: 'Not in any match' });
                        return;
                    }
                    const match = this.matches.get(matchId);
                    if (!match) {
                        socket.emit('error', { message: 'Match not found' });
                        return;
                    }
                    const player = match.players.get(socket.data.userId);
                    if (player) {
                        player.isReady = data.ready !== false;
                        this.io.to(matchId).emit('player_ready', {
                            userId: socket.data.userId,
                            username: socket.data.username,
                            isReady: player.isReady
                        });
                        this.io.to(matchId).emit('player_list_updated', {
                            players: Array.from(match.players.values()).map(p => ({
                                userId: p.userId,
                                username: p.username,
                                firstName: p.firstName,
                                lastName: p.lastName,
                                isReady: p.isReady
                            }))
                        });
                        await store.set(`match:${matchId}`, JSON.stringify({
                            id: matchId,
                            quizId: match.quizId,
                            joinCode: match.joinCode,
                            status: match.status,
                            createdAt: match.createdAt,
                            players: Array.from(match.players.values()).map(p => ({
                                userId: p.userId,
                                username: p.username,
                                firstName: p.firstName,
                                lastName: p.lastName,
                                isReady: p.isReady
                            }))
                        }));
                        (0, logger_1.logInfo)('Player ready status updated', {
                            matchId,
                            userId: socket.data.userId,
                            isReady: player.isReady,
                            playerCount: match.players.size
                        });
                        const allReady = Array.from(match.players.values()).every(p => p.isReady);
                        if (allReady && match.players.size === match.maxPlayers) {
                            (0, logger_1.logInfo)('All players ready, starting match', { matchId });
                            this.startMatch(matchId);
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
                    if (!matchId)
                        return;
                    const match = this.matches.get(matchId);
                    if (!match || match.status !== 'IN_PROGRESS')
                        return;
                    const player = match.players.get(socket.data.userId);
                    if (!player)
                        return;
                    const currentQuestion = match.questions[match.currentQuestionIndex];
                    if (!currentQuestion || currentQuestion.id !== data.questionId)
                        return;
                    const correctOptionIds = currentQuestion.options
                        .filter((opt) => opt.isCorrect)
                        .map((opt) => opt.id);
                    const isCorrect = data.selectedOptions.length === correctOptionIds.length &&
                        data.selectedOptions.every(id => correctOptionIds.includes(id));
                    const basePoints = 100;
                    const timeBonus = Math.max(0, Math.floor((match.timeLimit - data.timeSpent) * 2));
                    const points = isCorrect ? basePoints + timeBonus : 0;
                    player.score += points;
                    player.answers.push({
                        questionId: data.questionId,
                        selectedOptions: data.selectedOptions,
                        isCorrect,
                        timeSpent: data.timeSpent,
                        points
                    });
                    socket.emit('answer_result', {
                        isCorrect,
                        points,
                        correctOptions: correctOptionIds,
                        totalScore: player.score
                    });
                    const allAnswered = Array.from(match.players.values()).every(p => p.answers.length > match.currentQuestionIndex);
                    (0, logger_1.logInfo)('Answer submission check:', {
                        matchId,
                        currentQuestionIndex: match.currentQuestionIndex,
                        totalQuestions: match.questions.length,
                        playerAnswers: Array.from(match.players.values()).map(p => ({
                            userId: p.userId,
                            username: p.username,
                            answersCount: p.answers.length,
                            currentScore: p.score
                        })),
                        allAnswered
                    });
                    if (allAnswered) {
                        if (match.currentQuestionIndex >= match.questions.length - 1) {
                            (0, logger_1.logInfo)('All players completed all questions - ending match', {
                                matchId,
                                finalQuestion: match.currentQuestionIndex + 1,
                                totalQuestions: match.questions.length
                            });
                            this.endMatch(matchId);
                        }
                        else {
                            (0, logger_1.logInfo)('Moving to next question - all players answered current question', {
                                matchId,
                                nextQuestionIndex: match.currentQuestionIndex + 1,
                                totalQuestions: match.questions.length
                            });
                            this.nextQuestion(matchId);
                        }
                    }
                    else {
                        (0, logger_1.logInfo)('Waiting for other players to answer', {
                            matchId,
                            playersWhoAnswered: Array.from(match.players.values())
                                .filter(p => p.answers.length > match.currentQuestionIndex)
                                .map(p => ({ userId: p.userId, username: p.username })),
                            playersWaiting: Array.from(match.players.values())
                                .filter(p => p.answers.length <= match.currentQuestionIndex)
                                .map(p => ({ userId: p.userId, username: p.username }))
                        });
                    }
                }
                catch (error) {
                    (0, logger_1.logError)('Submit answer error', error);
                }
            });
            socket.on('disconnect', () => {
                (0, logger_1.logInfo)('Client disconnected', { socketId: socket.id });
                if (socket.data.userId) {
                    const matchId = this.userToMatch.get(socket.data.userId);
                    if (matchId) {
                        const match = this.matches.get(matchId);
                        if (match) {
                            socket.to(matchId).emit('player_disconnected', {
                                userId: socket.data.userId,
                                username: socket.data.username
                            });
                        }
                    }
                }
            });
        });
    }
    async startMatch(matchId) {
        const match = this.matches.get(matchId);
        if (!match)
            return;
        (0, logger_1.logInfo)('Starting match with questions', {
            matchId,
            questionsCount: match.questions.length,
            questions: match.questions.map(q => ({ id: q.id, text: q.questionText.substring(0, 50) + '...' }))
        });
        if (!match.questions || match.questions.length === 0) {
            (0, logger_1.logError)('No questions found for match', new Error(`Match ${matchId} has no questions for quiz ${match.quizId}`));
            this.io.to(matchId).emit('error', {
                message: 'No questions available for this quiz. Please add questions to the quiz first.'
            });
            return;
        }
        match.status = 'IN_PROGRESS';
        match.currentQuestionIndex = 0;
        match.questionStartTime = Date.now();
        const currentQuestion = match.questions[0];
        if (!currentQuestion) {
            (0, logger_1.logError)('First question is undefined', new Error(`Match ${matchId} has undefined first question`));
            this.io.to(matchId).emit('error', {
                message: 'Unable to load the first question. Please try again.'
            });
            return;
        }
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
    async nextQuestion(matchId) {
        const match = this.matches.get(matchId);
        if (!match)
            return;
        match.currentQuestionIndex++;
        if (match.currentQuestionIndex >= match.questions.length) {
            this.endMatch(matchId);
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
        if (!match) {
            (0, logger_1.logError)('Attempted to end non-existent match', new Error(`Match ${matchId} not found`));
            return;
        }
        match.status = 'COMPLETED';
        const results = Array.from(match.players.values()).map(player => {
            const totalAnswers = player.answers.length;
            const correctAnswers = player.answers.filter(answer => answer.isCorrect).length;
            const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
            return {
                userId: player.userId,
                username: player.username,
                firstName: player.firstName,
                lastName: player.lastName,
                score: player.score,
                answers: player.answers,
                correctAnswers,
                totalAnswers,
                accuracy
            };
        });
        results.sort((a, b) => b.score - a.score);
        (0, logger_1.logInfo)('Match completed - final results calculated', {
            matchId,
            playerCount: results.length,
            results: results.map(r => ({
                userId: r.userId,
                username: r.username,
                score: r.score,
                correctAnswers: r.correctAnswers,
                totalAnswers: r.totalAnswers,
                accuracy: r.accuracy
            })),
            winner: results[0] ? {
                userId: results[0].userId,
                username: results[0].username,
                score: results[0].score,
                accuracy: results[0].accuracy
            } : null
        });
        const completionData = {
            results,
            winner: results[0] || null,
            matchId,
            completedAt: new Date().toISOString(),
            isFriendMatch: true
        };
        (0, logger_1.logInfo)('Broadcasting match completion to ALL players:', {
            matchId,
            roomPlayers: Array.from(match.players.values()).map(p => ({
                userId: p.userId,
                username: p.username,
                socketId: p.socketId
            })),
            completionData
        });
        this.io.to(matchId).emit('match_completed', completionData);
        setTimeout(() => {
            match.players.forEach(player => {
                this.userToMatch.delete(player.userId);
            });
            if (match.joinCode) {
                this.joinCodeToMatch.delete(match.joinCode);
            }
            this.matches.delete(matchId);
            (0, logger_1.logInfo)('Match cleanup completed', { matchId });
        }, 1000);
        (0, logger_1.logInfo)('Match completion broadcast sent', { matchId });
    }
}
app.post('/matches/friend', async (req, res) => {
    try {
        const { quizId, userId, username } = req.body;
        (0, logger_1.logInfo)('Friend match request received', { quizId, userId, username });
        const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const joinCode = Math.random().toString(36).substr(2, 6).toUpperCase();
        const matchInfo = {
            matchId,
            joinCode,
            quizId,
            creatorId: userId,
            creatorName: username,
            status: 'waiting',
            players: [{
                    userId,
                    username,
                    ready: false
                }],
            createdAt: new Date()
        };
        await store.set(`match:${matchId}`, JSON.stringify(matchInfo));
        await store.set(`joinCode:${joinCode}`, matchId);
        (0, logger_1.logInfo)('Friend match created', { matchId, joinCode, quizId, userId });
        res.json({
            success: true,
            data: {
                matchId,
                joinCode
            }
        });
    }
    catch (error) {
        (0, logger_1.logError)('Failed to handle friend match request', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process request'
        });
    }
});
let enhancedMatchService;
async function startServer() {
    await initializeStore();
    exports.enhancedMatchService = enhancedMatchService = new EnhancedMatchService(server);
    server.listen(port, '0.0.0.0', () => {
        const networkIP = process.env.NETWORK_IP || 'localhost';
        (0, logger_1.logInfo)(`Enhanced Match service started`, {
            port,
            host: '0.0.0.0',
            environment: process.env.NODE_ENV || 'development',
            networkAccess: `http://${networkIP}:${port}`,
            timestamp: new Date().toISOString(),
            store: isRedisConnected ? 'Redis' : 'In-Memory'
        });
    });
}
startServer().catch((error) => {
    (0, logger_1.logError)('Failed to start server', error);
    process.exit(1);
});
//# sourceMappingURL=matchServer-enhanced.js.map