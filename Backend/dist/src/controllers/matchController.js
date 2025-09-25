"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMatchHistory = exports.getAvailableMatches = exports.getMatch = exports.joinMatch = exports.createMultiplayerMatch = exports.createSoloMatch = exports.getAIOpponents = void 0;
const matchService_1 = require("../services/matchService");
const aiOpponentService_1 = require("../services/aiOpponentService");
const logger_1 = require("../utils/logger");
const getAIOpponents = async (req, res) => {
    try {
        const aiOpponents = aiOpponentService_1.aiOpponentService.getAIOpponents();
        res.json({
            success: true,
            data: aiOpponents,
            message: 'AI opponents retrieved successfully'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Error fetching AI opponents', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch AI opponents',
            message: 'An error occurred while fetching AI opponents'
        });
    }
};
exports.getAIOpponents = getAIOpponents;
const createSoloMatch = async (req, res) => {
    try {
        const { quizId, aiOpponentId } = req.body;
        const userId = req.user?.id || 1;
        if (!quizId) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields',
                message: 'Quiz ID is required'
            });
            return;
        }
        const matchId = await matchService_1.matchService.createSoloMatch(userId, parseInt(quizId), aiOpponentId);
        res.status(201).json({
            success: true,
            data: { matchId },
            message: 'Solo match created successfully'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Error creating solo match', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create solo match',
            message: error instanceof Error ? error.message : 'An error occurred while creating the match'
        });
    }
};
exports.createSoloMatch = createSoloMatch;
const createMultiplayerMatch = async (req, res) => {
    try {
        const { quizId, maxPlayers = 10 } = req.body;
        const userId = req.user?.id || 1;
        if (!quizId) {
            res.status(400).json({
                success: false,
                error: 'Missing required fields',
                message: 'Quiz ID is required'
            });
            return;
        }
        const matchId = await matchService_1.matchService.createMatch(userId, parseInt(quizId), maxPlayers);
        res.status(201).json({
            success: true,
            data: { matchId },
            message: 'Multiplayer match created successfully'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Error creating multiplayer match', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create multiplayer match',
            message: error instanceof Error ? error.message : 'An error occurred while creating the match'
        });
    }
};
exports.createMultiplayerMatch = createMultiplayerMatch;
const joinMatch = async (req, res) => {
    try {
        const { matchId } = req.params;
        const userId = req.user?.id || 1;
        if (!matchId) {
            res.status(400).json({
                success: false,
                error: 'Missing match ID',
                message: 'Match ID is required'
            });
            return;
        }
        const success = await matchService_1.matchService.joinMatch(matchId, userId, '');
        if (success) {
            res.json({
                success: true,
                data: { matchId },
                message: 'Successfully joined match'
            });
        }
        else {
            res.status(400).json({
                success: false,
                error: 'Failed to join match',
                message: 'Match not found, full, or already started'
            });
        }
    }
    catch (error) {
        (0, logger_1.logError)('Error joining match', error);
        res.status(500).json({
            success: false,
            error: 'Failed to join match',
            message: error instanceof Error ? error.message : 'An error occurred while joining the match'
        });
    }
};
exports.joinMatch = joinMatch;
const getMatch = async (req, res) => {
    try {
        const { matchId } = req.params;
        if (!matchId) {
            res.status(400).json({
                success: false,
                error: 'Missing match ID',
                message: 'Match ID is required'
            });
            return;
        }
        const match = matchService_1.matchService.getMatchById(matchId);
        if (!match) {
            res.status(404).json({
                success: false,
                error: 'Match not found',
                message: 'The specified match does not exist'
            });
            return;
        }
        const playersArray = Array.from(match.players.values()).map(player => ({
            userId: player.userId,
            username: player.username,
            score: player.score,
            isReady: player.isReady,
            isAI: player.isAI,
            aiOpponent: player.isAI ? {
                id: player.aiOpponent?.id,
                name: player.aiOpponent?.name,
                difficulty: player.aiOpponent?.difficulty,
                avatar: player.aiOpponent?.avatar
            } : undefined
        }));
        res.json({
            success: true,
            data: {
                id: match.id,
                quizId: match.quizId,
                quiz: {
                    id: match.quiz.id,
                    title: match.quiz.title,
                    description: match.quiz.description,
                    difficulty: match.quiz.difficulty,
                    timeLimit: match.quiz.timeLimit
                },
                players: playersArray,
                status: match.status,
                currentQuestionIndex: match.currentQuestionIndex,
                maxPlayers: match.maxPlayers,
                timeLimit: match.timeLimit,
                createdAt: match.createdAt
            },
            message: 'Match details retrieved successfully'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Error fetching match details', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch match details',
            message: 'An error occurred while fetching match details'
        });
    }
};
exports.getMatch = getMatch;
const getAvailableMatches = async (req, res) => {
    try {
        const matches = matchService_1.matchService.getAvailableMatches();
        res.json({
            success: true,
            data: matches,
            message: 'Available matches retrieved successfully'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Error fetching available matches', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch available matches',
            message: 'An error occurred while fetching available matches'
        });
    }
};
exports.getAvailableMatches = getAvailableMatches;
const getMatchHistory = async (req, res) => {
    try {
        const userId = req.user?.id || 1;
        const { page = 1, limit = 20 } = req.query;
        res.json({
            success: true,
            data: {
                matches: [],
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: 0,
                    totalMatches: 0,
                    hasNext: false,
                    hasPrev: false
                }
            },
            message: 'Match history retrieved successfully'
        });
    }
    catch (error) {
        (0, logger_1.logError)('Error fetching match history', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch match history',
            message: 'An error occurred while fetching match history'
        });
    }
};
exports.getMatchHistory = getMatchHistory;
//# sourceMappingURL=matchController.js.map