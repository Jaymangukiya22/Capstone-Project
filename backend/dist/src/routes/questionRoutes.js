"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const questionController_1 = require("../controllers/questionController");
const router = (0, express_1.Router)();
router.post('/', questionController_1.questionController.createQuestion.bind(questionController_1.questionController));
router.post('/quiz/:quizId', questionController_1.questionController.addQuestionToQuiz.bind(questionController_1.questionController));
router.get('/quiz/:quizId', questionController_1.questionController.getQuestionsByQuizId.bind(questionController_1.questionController));
router.get('/quiz/:quizId/stats', questionController_1.questionController.getQuestionStats.bind(questionController_1.questionController));
router.get('/:id', questionController_1.questionController.getQuestionById.bind(questionController_1.questionController));
router.put('/:id', questionController_1.questionController.updateQuestion.bind(questionController_1.questionController));
router.delete('/:id', questionController_1.questionController.deleteQuestion.bind(questionController_1.questionController));
exports.default = router;
//# sourceMappingURL=questionRoutes.js.map