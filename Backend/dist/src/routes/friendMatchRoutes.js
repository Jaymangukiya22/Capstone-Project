"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const logger_1 = require("../utils/logger");
const httpClient = {
    async get(url) {
        const response = await fetch(url);
        if (!response.ok) {
            const error = new Error(`HTTP ${response.status}`);
            error.response = { status: response.status };
            throw error;
        }
        return { data: await response.json() };
    },
    async post(url, data) {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = new Error(`HTTP ${response.status}`);
            error.response = { status: response.status };
            throw error;
        }
        return { data: await response.json() };
    }
};
const router = (0, express_1.Router)();
const MATCH_SERVICE_URL = process.env.MATCH_SERVICE_URL || 'http://localhost:3001';
router.post('/', async (req, res) => {
    try {
        const { quizId, userId: bodyUserId, username: bodyUsername } = req.body;
        const userId = bodyUserId || req.user?.id || 1;
        const username = bodyUsername || req.user?.username || `User${userId}`;
        if (!quizId) {
            return res.status(400).json({
                success: false,
                error: 'Quiz ID is required'
            });
        }
        const response = await httpClient.post(`${MATCH_SERVICE_URL}/matches/friend`, {
            quizId,
            userId,
            username
        });
        const matchData = response.data?.data || response.data;
        if (!matchData?.matchId || !matchData?.joinCode) {
            throw new Error('Invalid response from match service');
        }
        (0, logger_1.logInfo)('Friend match created via API', {
            quizId,
            userId,
            matchId: matchData.matchId,
            joinCode: matchData.joinCode
        });
        return res.json({
            success: true,
            data: {
                matchId: matchData.matchId,
                joinCode: matchData.joinCode,
                message: `Share this code with your friend: ${matchData.joinCode}`,
                websocketUrl: `ws://${process.env.NETWORK_IP || 'localhost'}:3001`
            }
        });
    }
    catch (error) {
        (0, logger_1.logError)('Failed to create friend match', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create friend match'
        });
    }
});
router.get('/code/:joinCode', async (req, res) => {
    try {
        const { joinCode } = req.params;
        if (!joinCode || joinCode.length !== 6) {
            return res.status(400).json({
                success: false,
                error: 'Valid 6-character join code is required'
            });
        }
        const response = await httpClient.get(`${MATCH_SERVICE_URL}/matches/code/${joinCode}`);
        return res.json({
            success: true,
            data: {
                match: response.data.data.match,
                websocketUrl: `ws://localhost:3001`
            }
        });
    }
    catch (error) {
        if (error.response?.status === 404) {
            return res.status(404).json({
                success: false,
                error: 'No match found with that join code'
            });
        }
        (0, logger_1.logError)('Failed to find match by code', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to find match by code'
        });
    }
});
router.get('/', async (req, res) => {
    try {
        const response = await httpClient.get(`${MATCH_SERVICE_URL}/matches`);
        return res.json({
            success: true,
            data: response.data.data
        });
    }
    catch (error) {
        (0, logger_1.logError)('Failed to get active matches', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to get active matches'
        });
    }
});
router.get('/:matchId', async (req, res) => {
    try {
        const { matchId } = req.params;
        const response = await httpClient.get(`${MATCH_SERVICE_URL}/matches/${matchId}`);
        return res.json({
            success: true,
            data: response.data.data
        });
    }
    catch (error) {
        if (error.response?.status === 404) {
            return res.status(404).json({
                success: false,
                error: 'Match not found'
            });
        }
        (0, logger_1.logError)('Failed to get match details', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to get match details'
        });
    }
});
exports.default = router;
//# sourceMappingURL=friendMatchRoutes.js.map