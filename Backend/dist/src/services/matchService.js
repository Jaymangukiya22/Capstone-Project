"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchService = exports.MatchService = void 0;
const uuid_1 = require("uuid");
const models_1 = require("../models");
const redis_1 = require("../config/redis");
const logger_1 = require("../utils/logger");
const jsonwebtoken_1 = require("jsonwebtoken");
class MatchService {
    constructor(io) {
        this.io = null;
        this.matches = new Map();
        this.userToMatch = new Map();
        this.joinCodeToMatch = new Map();
        if (io) {
            this.io = io;
            this.setupSocketHandlers();
        }
    }
    setSocketServer(io) {
        this.io = io;
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
            const quizQuestions = await models_1.QuizQuestion.findAll({
                where: { quizId },
                include: [{
                        model: models_1.QuestionBankItem,
                        as: 'question',
                        include: [{
                                model: models_1.QuestionBankOption,
                                as: 'options'
                            }]
                    }],
                order: [['orderIndex', 'ASC']]
            });
            if (!quizQuestions || quizQuestions.length === 0) {
                return [];
            }
            return quizQuestions.map((qq) => ({
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
        }
        catch (error) {
            (0, logger_1.logError)('Failed to load quiz questions', error);
            return [];
        }
    }
    setupSocketHandlers() {
        if (!this.io)
            return;
        this.io.on('connection', (socket) => {
            (0, logger_1.logInfo)('Client connected', { socketId: socket.id });
            socket.on('authenticate', async (data) => {
                try {
                    let userId;
                    let username;
                    if (typeof data === 'string') {
                        const decoded = jsonwebtoken_1.default.verify(data, process.env.JWT_SECRET);
                        const user = await models_1.User.findByPk(decoded.userId, {
                            attributes: ['id', 'username', 'isActive']
                        });
                        if (!user || !user.isActive) {
                            socket.emit('auth_error', { message: 'Invalid token or user inactive' });
                            return;
                        }
                        userId = user.id;
                        username = user.username;
                    }
                    else {
                        userId = data.userId || 1;
                        username = data.username || `Player${userId}`;
                        try {
                            const user = await models_1.User.findByPk(userId, {
                                attributes: ['id', 'username', 'email', 'isActive']
                            });
                            if (user) {
                                username = user.email || user.username;
                            }
                        }
                        catch (error) {
                            (0, logger_1.logInfo)('Using fallback user data', { userId, username });
                        }
                    }
                    socket.data.userId = userId;
                    socket.data.username = username;
                    const userData = { id: userId, username };
                    socket.emit('authenticated', { user: userData });
                    (0, logger_1.logInfo)('User authenticated', {
                        userId,
                        username,
                        socketId: socket.id,
                        authType: typeof data === 'string' ? 'JWT' : 'Direct'
                    });
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
                    const { matchId, joinCode } = await this.createMatch(data.quizId, socket.data.userId, data.maxPlayers);
                    socket.join(matchId);
                    socket.emit('match_created', { matchId, joinCode });
                    (0, logger_1.logInfo)('Match created', { matchId: matchId, userId: socket.data.userId });
                }
                catch (error) {
                    socket.emit('error', { message: 'Failed to create match' });
                    (0, logger_1.logError)('Create match error', error);
                }
            });
            socket.on('create_friend_match', async (data) => {
                try {
                    if (!socket.data.userId) {
                        socket.emit('error', { message: 'Not authenticated' });
                        return;
                    }
                    const { matchId, joinCode } = await this.createFriendMatch(data.quizId, socket.data.userId);
                    socket.join(matchId);
                    const match = this.matches.get(matchId);
                    if (match && match.players.has(socket.data.userId)) {
                        const creator = match.players.get(socket.data.userId);
                        creator.username = socket.data.username || `Player${socket.data.userId}`;
                        creator.socketId = socket.id;
                        this.userToMatch.set(socket.data.userId, matchId);
                        (0, logger_1.logInfo)('Updated creator info', {
                            userId: socket.data.userId,
                            username: creator.username,
                            socketId: socket.id,
                            userToMatchMapped: this.userToMatch.has(socket.data.userId)
                        });
                    }
                    socket.emit('friend_match_created', { matchId, joinCode });
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
                    const matchId = this.joinCodeToMatch.get(data.joinCode.toUpperCase());
                    if (!matchId) {
                        socket.emit('error', { message: 'Match not found with code: ' + data.joinCode });
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
                        const playerList = Array.from(match.players.values()).map(p => ({
                            userId: p.userId,
                            username: p.username,
                            isReady: p.isReady
                        }));
                        (0, logger_1.logInfo)('Sending player list update', {
                            playerCount: playerList.length,
                            players: playerList
                        });
                        this.io?.to(matchId).emit('player_list_updated', {
                            players: playerList
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
                    (0, logger_1.logInfo)('Player ready request', {
                        userId: socket.data.userId,
                        username: socket.data.username,
                        userToMatchSize: this.userToMatch.size,
                        hasMapping: this.userToMatch.has(socket.data.userId)
                    });
                    const matchId = this.userToMatch.get(socket.data.userId);
                    if (!matchId) {
                        (0, logger_1.logError)('Player ready failed - not in match', new Error(`User ${socket.data.userId} not found in userToMatch mapping`));
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
                        this.io?.to(matchId).emit('player_ready', {
                            userId: socket.data.userId,
                            username: socket.data.username
                        });
                        const allReady = Array.from(match.players.values()).every(p => p.isReady);
                        const minPlayers = match.matchType === 'FRIEND_1V1' ? 2 : 2;
                        (0, logger_1.logInfo)('Checking match start conditions', {
                            matchId,
                            allReady,
                            playerCount: match.players.size,
                            minPlayers
                        });
                        if (allReady && match.players.size >= minPlayers) {
                            (0, logger_1.logInfo)('All players ready, starting match', {
                                matchId,
                                playerCount: match.players.size,
                                minPlayers
                            });
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
                    await this.submitAnswer(matchId, socket.data.userId, data);
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
    async createSoloMatch(userId, quizId, aiOpponentId) {
        const match = await this.createMatch(quizId, userId, 2);
        return match.matchId;
    }
    async createMatch(quizId, userId, maxPlayers = 10) {
        const quiz = await models_1.Quiz.findOne({
            where: { id: quizId, isActive: true }
        });
        if (!quiz) {
            throw new Error('Quiz not found');
        }
        const matchId = (0, uuid_1.v4)();
        const joinCode = this.generateJoinCode();
        const questions = await this.loadQuizQuestions(quizId);
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
            createdAt: new Date(),
            joinCode,
            matchType: 'MULTIPLAYER'
        };
        const creator = {
            userId,
            username: '',
            socketId: '',
            score: 0,
            currentQuestionIndex: 0,
            isReady: false,
            isAI: false,
            answers: []
        };
        match.players.set(userId, creator);
        this.matches.set(matchId, match);
        this.userToMatch.set(userId, matchId);
        this.joinCodeToMatch.set(joinCode, matchId);
        await redis_1.redis.setEx(`match:${matchId}`, 3600, JSON.stringify({
            id: matchId,
            quizId,
            joinCode,
            status: match.status,
            createdAt: match.createdAt
        }));
        return { matchId, joinCode };
    }
    async createFriendMatch(quizId, userId) {
        const quiz = await models_1.Quiz.findOne({
            where: { id: quizId, isActive: true }
        });
        if (!quiz) {
            throw new Error('Quiz not found');
        }
        const matchId = (0, uuid_1.v4)();
        const joinCode = this.generateJoinCode();
        const questions = await this.loadQuizQuestions(quizId);
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
            maxPlayers: 2,
            timeLimit: quiz.timeLimit || 30,
            questions,
            createdAt: new Date(),
            joinCode,
            matchType: 'FRIEND_1V1'
        };
        const creator = {
            userId,
            username: '',
            socketId: '',
            score: 0,
            currentQuestionIndex: 0,
            isReady: false,
            isAI: false,
            answers: []
        };
        match.players.set(userId, creator);
        this.matches.set(matchId, match);
        this.userToMatch.set(userId, matchId);
        this.joinCodeToMatch.set(joinCode, matchId);
        await redis_1.redis.setEx(`match:${matchId}`, 3600, JSON.stringify({
            id: matchId,
            quizId,
            joinCode,
            matchType: 'FRIEND_1V1',
            status: match.status,
            createdAt: match.createdAt
        }));
        (0, logger_1.logInfo)('Friend match created', { matchId, joinCode, quizId });
        return { matchId, joinCode };
    }
    async joinMatch(matchId, userId, socketId) {
        const match = this.matches.get(matchId);
        if (!match || match.status !== 'WAITING' || match.players.size >= match.maxPlayers) {
            return false;
        }
        let username = `TestUser${userId}`;
        try {
            const user = await models_1.User.findByPk(userId, {
                attributes: ['username', 'email']
            });
            if (user) {
                username = user.email || user.username;
            }
        }
        catch (error) {
            (0, logger_1.logInfo)('Using fallback username for user', { userId, username });
        }
        const player = {
            userId,
            username,
            socketId,
            score: 0,
            currentQuestionIndex: 0,
            isReady: false,
            isAI: false,
            answers: []
        };
        match.players.set(userId, player);
        this.userToMatch.set(userId, matchId);
        (0, logger_1.logInfo)('Player joined match', { matchId, userId, username, playerCount: match.players.size });
        return true;
    }
    async startMatch(matchId) {
        const match = this.matches.get(matchId);
        if (!match) {
            (0, logger_1.logError)('Cannot start match - match not found', new Error(`Match ${matchId} not found`));
            return;
        }
        if (match.questions.length === 0) {
            (0, logger_1.logError)('Cannot start match - no questions loaded', new Error(`Match ${matchId} has no questions`));
            this.io?.to(matchId).emit('error', { message: 'No questions available for this quiz' });
            return;
        }
        (0, logger_1.logInfo)('Starting match', {
            matchId,
            playerCount: match.players.size,
            questionCount: match.questions.length,
            quizTitle: match.quiz.title
        });
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
        (0, logger_1.logInfo)('Sending match_started event', {
            matchId,
            questionId: currentQuestion.id,
            questionText: currentQuestion.questionText,
            optionCount: currentQuestion.options.length,
            totalQuestions: match.questions.length
        });
        this.io?.to(matchId).emit('match_started', {
            question: questionForPlayers,
            questionIndex: 0,
            totalQuestions: match.questions.length
        });
        this.startAIResponseTimer(match, 0);
        setTimeout(() => {
            this.nextQuestion(matchId);
        }, match.timeLimit * 1000);
        (0, logger_1.logInfo)('Match started successfully', { matchId, players: match.players.size });
    }
    async submitAnswer(matchId, userId, answerData) {
        const match = this.matches.get(matchId);
        if (!match || match.status !== 'IN_PROGRESS')
            return;
        const player = match.players.get(userId);
        if (!player)
            return;
        const currentQuestion = match.questions[match.currentQuestionIndex];
        if (!currentQuestion || currentQuestion.id !== answerData.questionId)
            return;
        const correctOptionIds = currentQuestion.options
            .filter((opt) => opt.isCorrect)
            .map((opt) => opt.id);
        const isCorrect = answerData.selectedOptions.length === correctOptionIds.length &&
            answerData.selectedOptions.every(id => correctOptionIds.includes(id));
        const basePoints = 100;
        const timeBonus = Math.max(0, Math.floor((match.timeLimit - answerData.timeSpent) * 2));
        const points = isCorrect ? basePoints + timeBonus : 0;
        player.score += points;
        player.answers.push({
            questionId: answerData.questionId,
            selectedOptions: answerData.selectedOptions,
            isCorrect,
            timeSpent: answerData.timeSpent,
            points
        });
        this.io?.to(player.socketId).emit('answer_result', {
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
        this.io?.to(matchId).emit('next_question', {
            question: questionForPlayers,
            questionIndex: match.currentQuestionIndex,
            totalQuestions: match.questions.length
        });
        this.startAIResponseTimer(match, match.currentQuestionIndex);
        setTimeout(() => {
            this.nextQuestion(matchId);
        }, match.timeLimit * 1000);
    }
    async endMatch(matchId) {
        const match = this.matches.get(matchId);
        if (!match)
            return;
        match.status = 'COMPLETED';
        const results = Array.from(match.players.values()).map(player => ({
            userId: player.userId,
            username: player.username,
            score: player.score,
            answers: player.answers
        }));
        results.sort((a, b) => b.score - a.score);
        this.io?.to(matchId).emit('match_completed', {
            results,
            winner: results[0],
            matchId
        });
        match.players.forEach(player => {
            this.userToMatch.delete(player.userId);
        });
        if (match.joinCode) {
            this.joinCodeToMatch.delete(match.joinCode);
        }
        this.matches.delete(matchId);
        (0, logger_1.logInfo)('Match completed', { matchId, results });
    }
    startAIResponseTimer(match, questionIndex) {
    }
    getMatchById(matchId) {
        return this.matches.get(matchId);
    }
    getAvailableMatches() {
        const availableMatches = [];
        this.matches.forEach((match, matchId) => {
            if (match.status === 'WAITING' && match.players.size < match.maxPlayers) {
                availableMatches.push({
                    id: matchId,
                    quizId: match.quizId,
                    quiz: match.quiz,
                    playerCount: match.players.size,
                    maxPlayers: match.maxPlayers,
                    status: match.status,
                    createdAt: match.createdAt
                });
            }
        });
        return availableMatches;
    }
    getActiveMatches() {
        return this.getAvailableMatches();
    }
}
exports.MatchService = MatchService;
exports.matchService = new MatchService();
//# sourceMappingURL=matchService.js.map