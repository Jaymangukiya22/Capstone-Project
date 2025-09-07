"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const quizController_1 = require("../controllers/quizController");
const router = (0, express_1.Router)();
router.post('/', quizController_1.quizController.createQuiz.bind(quizController_1.quizController));
router.get('/', quizController_1.quizController.getAllQuizzes.bind(quizController_1.quizController));
router.get('/:id', quizController_1.quizController.getQuizById.bind(quizController_1.quizController));
router.put('/:id', quizController_1.quizController.updateQuiz.bind(quizController_1.quizController));
router.delete('/:id', quizController_1.quizController.deleteQuiz.bind(quizController_1.quizController));
router.get('/:id/stats', quizController_1.quizController.getQuizStats.bind(quizController_1.quizController));
exports.default = router;
//# sourceMappingURL=quizRoutes.js.map