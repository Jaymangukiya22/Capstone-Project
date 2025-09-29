"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const quizAttemptController_1 = require("../controllers/quizAttemptController");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../utils/validation");
const router = (0, express_1.Router)();
router.post('/', (0, validation_1.validateRequest)(validation_2.startQuizSchema), quizAttemptController_1.startQuizAttempt);
router.post('/start', (0, validation_1.validateRequest)(validation_2.startQuizSchema), quizAttemptController_1.startQuizAttempt);
router.post('/:attemptId/answer', (0, validation_1.validateRequest)(validation_2.submitAnswerSchema), quizAttemptController_1.submitAnswer);
router.post('/:attemptId/complete', (0, validation_1.validateRequest)(validation_2.completeQuizSchema), quizAttemptController_1.completeQuizAttempt);
router.get('/', quizAttemptController_1.getUserAttempts);
router.get('/:id', quizAttemptController_1.getAttemptById);
router.get('/user/history', quizAttemptController_1.getUserAttempts);
router.get('/user/stats', quizAttemptController_1.getUserStats);
router.get('/leaderboard', quizAttemptController_1.getLeaderboard);
exports.default = router;
//# sourceMappingURL=quizAttemptRoutes.js.map