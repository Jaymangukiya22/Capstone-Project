"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const matchController_1 = require("../controllers/matchController");
const validation_1 = require("../middleware/validation");
const joi_1 = require("joi");
const router = (0, express_1.Router)();
const createSoloMatchSchema = joi_1.default.object({
    quizId: joi_1.default.number().integer().positive().required(),
    aiOpponentId: joi_1.default.string().optional()
});
const createMultiplayerMatchSchema = joi_1.default.object({
    quizId: joi_1.default.number().integer().positive().required(),
    maxPlayers: joi_1.default.number().integer().min(2).max(10).default(10)
});
router.get('/ai-opponents', matchController_1.getAIOpponents);
router.post('/solo', (0, validation_1.validateRequest)(createSoloMatchSchema), matchController_1.createSoloMatch);
router.post('/multiplayer', (0, validation_1.validateRequest)(createMultiplayerMatchSchema), matchController_1.createMultiplayerMatch);
router.get('/available', matchController_1.getAvailableMatches);
router.post('/:matchId/join', matchController_1.joinMatch);
router.get('/:matchId', matchController_1.getMatch);
router.get('/history/user', matchController_1.getMatchHistory);
exports.default = router;
//# sourceMappingURL=matchRoutes.js.map