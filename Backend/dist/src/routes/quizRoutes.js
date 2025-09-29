"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const quizController_1 = require("../controllers/quizController");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../utils/validation");
const router = (0, express_1.Router)();
router.get('/search', quizController_1.searchQuizzes);
router.get('/popular', quizController_1.getPopularQuizzes);
router.get('/', quizController_1.searchQuizzes);
router.get('/:id', quizController_1.getQuizById);
router.get('/:id/play', quizController_1.getQuizForPlay);
router.get('/:id/stats', quizController_1.getQuizStats);
router.post('/', (0, validation_1.validateRequest)(validation_2.createQuizSchema), quizController_1.createQuiz);
router.put('/:id', (0, validation_1.validateRequest)(validation_2.createQuizSchema), quizController_1.updateQuiz);
router.delete('/:id', quizController_1.deleteQuiz);
router.post('/:id/questions', (0, validation_1.validateRequest)(validation_2.assignQuestionsSchema), quizController_1.assignQuestionsToQuiz);
exports.default = router;
//# sourceMappingURL=quizRoutes.js.map