"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quizAttemptService = exports.QuizAttemptService = void 0;
const models_1 = require("../models");
const logger_1 = require("../utils/logger");
class QuizAttemptService {
    async startQuizAttempt(data) {
        try {
            const quiz = await models_1.Quiz.findOne({
                where: { id: data.quizId, isActive: true }
            });
            if (!quiz) {
                throw new Error('Quiz not found or inactive');
            }
            const attempt = await models_1.QuizAttempt.create({
                userId: data.userId,
                quizId: data.quizId,
                totalQuestions: 0,
                status: models_1.AttemptStatus.IN_PROGRESS,
                startedAt: new Date()
            });
            (0, logger_1.logInfo)('Quiz attempt started', {
                attemptId: attempt.id,
                userId: data.userId,
                quizId: data.quizId
            });
            return attempt;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to start quiz attempt', error);
            throw error;
        }
    }
    async submitAnswer(data) {
        try {
            const attempt = await models_1.QuizAttempt.findByPk(data.attemptId, {
                include: [
                    { model: models_1.Quiz, as: 'quiz' }
                ]
            });
            if (!attempt || attempt.status !== models_1.AttemptStatus.IN_PROGRESS) {
                throw new Error('Invalid attempt or attempt not in progress');
            }
            const answer = await models_1.QuizAttemptAnswer.create({
                attemptId: data.attemptId,
                questionId: data.questionId,
                selectedOptions: data.selectedOptions,
                timeSpent: data.timeSpent || 0,
                isCorrect: false,
                submittedAt: new Date()
            });
            (0, logger_1.logInfo)('Answer submitted', {
                attemptId: data.attemptId,
                questionId: data.questionId
            });
            return answer;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to submit answer', error);
            throw error;
        }
    }
    async completeQuizAttempt(data) {
        try {
            const attempt = await models_1.QuizAttempt.findOne({
                where: {
                    id: data.attemptId,
                    userId: data.userId
                },
                include: [
                    {
                        model: models_1.QuizAttemptAnswer,
                        as: 'answers',
                        include: [
                            {
                                model: models_1.QuestionBankItem,
                                as: 'question',
                                include: [
                                    {
                                        model: models_1.QuestionBankOption,
                                        as: 'options'
                                    }
                                ]
                            }
                        ]
                    },
                    { model: models_1.Quiz, as: 'quiz' }
                ]
            });
            if (!attempt) {
                throw new Error('Attempt not found');
            }
            let correctAnswers = 0;
            let totalQuestions = 0;
            let totalTimeSpent = 0;
            for (const answer of attempt.answers) {
                totalQuestions++;
                const correctOptionIds = answer.question.options
                    .filter(opt => opt.isCorrect)
                    .map(opt => opt.id);
                const userSelectedIds = answer.selectedOptions || [];
                const isCorrect = correctOptionIds.length === userSelectedIds.length &&
                    correctOptionIds.every(id => userSelectedIds.includes(id));
                if (isCorrect) {
                    correctAnswers++;
                }
                await models_1.QuizAttemptAnswer.update({
                    isCorrect
                }, {
                    where: { id: answer.id }
                });
                totalTimeSpent += answer.timeSpent || 0;
            }
            const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
            await models_1.QuizAttempt.update({
                status: models_1.AttemptStatus.COMPLETED,
                completedAt: new Date(),
                score,
                correctAnswers,
                totalQuestions,
                timeSpent: totalTimeSpent
            }, {
                where: { id: data.attemptId }
            });
            (0, logger_1.logInfo)('Quiz attempt completed', {
                attemptId: data.attemptId,
                score,
                correctAnswers,
                totalQuestions,
                timeSpent: totalTimeSpent
            });
            const completedAttempt = await models_1.QuizAttempt.findByPk(data.attemptId, {
                include: [
                    { model: models_1.Quiz, as: 'quiz' },
                    { model: models_1.QuizAttemptAnswer, as: 'answers' }
                ]
            });
            return completedAttempt;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to complete quiz attempt', error);
            throw error;
        }
    }
    async getAttemptById(id, userId) {
        try {
            const attempt = await models_1.QuizAttempt.findOne({
                where: { id, userId },
                include: [
                    { model: models_1.Quiz, as: 'quiz' },
                    { model: models_1.User, as: 'user', attributes: ['id', 'username'] },
                    { model: models_1.QuizAttemptAnswer, as: 'answers' }
                ]
            });
            return attempt;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to get attempt by ID', error);
            throw error;
        }
    }
    async getUserAttempts(userId, page = 1, limit = 20) {
        try {
            const skip = (page - 1) * limit;
            const [attempts, total] = await Promise.all([
                models_1.QuizAttempt.findAll({
                    where: { userId },
                    include: [
                        { model: models_1.Quiz, as: 'quiz' }
                    ],
                    order: [['createdAt', 'DESC']],
                    offset: skip,
                    limit
                }),
                models_1.QuizAttempt.count({ where: { userId } })
            ]);
            return {
                attempts,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        }
        catch (error) {
            (0, logger_1.logError)('Failed to get user attempts', error);
            throw error;
        }
    }
    async getLeaderboard(quizId, limit = 10) {
        try {
            const where = { status: models_1.AttemptStatus.COMPLETED };
            if (quizId) {
                where.quizId = quizId;
            }
            const attempts = await models_1.QuizAttempt.findAll({
                where,
                include: [
                    { model: models_1.User, as: 'user', attributes: ['id', 'username'] },
                    { model: models_1.Quiz, as: 'quiz', attributes: ['id', 'title'] }
                ],
                order: [['score', 'DESC']],
                limit
            });
            return attempts;
        }
        catch (error) {
            (0, logger_1.logError)('Failed to get leaderboard', error);
            throw error;
        }
    }
    async getUserStats(userId) {
        try {
            const [totalAttempts, completedAttempts, avgScore] = await Promise.all([
                models_1.QuizAttempt.count({ where: { userId } }),
                models_1.QuizAttempt.count({
                    where: {
                        userId,
                        status: models_1.AttemptStatus.COMPLETED
                    }
                }),
                models_1.QuizAttempt.findOne({
                    where: {
                        userId,
                        status: models_1.AttemptStatus.COMPLETED
                    },
                    attributes: [
                        [models_1.QuizAttempt.sequelize.fn('AVG', models_1.QuizAttempt.sequelize.col('score')), 'avgScore']
                    ]
                })
            ]);
            return {
                totalAttempts,
                completedAttempts,
                averageScore: avgScore ? parseFloat(avgScore.dataValues.avgScore) || 0 : 0
            };
        }
        catch (error) {
            (0, logger_1.logError)('Failed to get user stats', error);
            throw error;
        }
    }
}
exports.QuizAttemptService = QuizAttemptService;
exports.quizAttemptService = new QuizAttemptService();
//# sourceMappingURL=quizAttemptService.js.map