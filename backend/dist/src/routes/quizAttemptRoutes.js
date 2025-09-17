"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const quizAttemptController_1 = require("../controllers/quizAttemptController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../utils/validation");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.post('/start', auth_1.requirePlayer, (0, validation_1.validateRequest)(validation_2.startQuizSchema), quizAttemptController_1.startQuizAttempt);
router.post('/:attemptId/answer', auth_1.requirePlayer, (0, validation_1.validateRequest)(validation_2.submitAnswerSchema), quizAttemptController_1.submitAnswer);
router.post('/:attemptId/complete', auth_1.requirePlayer, (0, validation_1.validateRequest)(validation_2.completeQuizSchema), quizAttemptController_1.completeQuizAttempt);
router.get('/:id', auth_1.requirePlayer, quizAttemptController_1.getAttemptById);
router.get('/user/history', auth_1.requirePlayer, quizAttemptController_1.getUserAttempts);
router.get('/user/stats', auth_1.requirePlayer, quizAttemptController_1.getUserStats);
router.get('/leaderboard', quizAttemptController_1.getLeaderboard);
exports.default = router;
//# sourceMappingURL=quizAttemptRoutes.js.map