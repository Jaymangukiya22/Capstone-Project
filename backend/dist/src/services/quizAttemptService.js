"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quizAttemptService = exports.QuizAttemptService = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
var QuizAttemptStatus;
(function (QuizAttemptStatus) {
    QuizAttemptStatus["IN_PROGRESS"] = "IN_PROGRESS";
    QuizAttemptStatus["COMPLETED"] = "COMPLETED";
    QuizAttemptStatus["ABANDONED"] = "ABANDONED";
})(QuizAttemptStatus || (QuizAttemptStatus = {}));
const prisma = new client_1.PrismaClient();
class QuizAttemptService {
    async startQuizAttempt(data) {
        try {
            const quiz = await prisma.quiz.findUnique({
                where: { id: data.quizId, isActive: true },
                include: {
                    quizQuestions: {
                        include: {
                            question: {
                                include: {
                                    options: true
                                }
                            }
                        }
                    }
                }
            });
            if (!quiz) {
                throw new Error('Quiz not found or inactive');
            }
            if (quiz.quizQuestions.length === 0) {
                throw new Error('Quiz has no questions');
            }
            const attempt = await prisma.quizAttempt.create({
                data: {
                    userId: data.userId,
                    quizId: data.quizId,
                    totalQuestions: quiz.quizQuestions.length,
                    status: 'IN_PROGRESS'
                },
                include: {
                    quiz: {
                        select: {
                            id: true,
                            title: true,
                            timeLimit: true,
                            maxQuestions: true
                        }
                    },
                    user: {
                        select: {
                            id: true,
                            username: true
                        }
                    }
                }
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
            const attempt = await prisma.quizAttempt.findUnique({
                where: { id: data.attemptId },
                include: {
                    quiz: {
                        include: {
                            quizQuestions: {
                                where: {
                                    questionId: data.questionId
                                },
                                include: {
                                    question: {
                                        include: {
                                            options: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });
            if (!attempt || attempt.status !== 'IN_PROGRESS') {
                throw new Error('Quiz attempt not found or not in progress');
            }
            const quizQuestion = attempt.quiz.quizQuestions[0];
            if (!quizQuestion) {
                throw new Error('Question not found in this quiz');
            }
            const existingAnswer = await prisma.quizAnswer.findFirst({
                where: {
                    attemptId: data.attemptId,
                    questionId: data.questionId
                }
            });
            if (existingAnswer) {
                throw new Error('Answer already submitted for this question');
            }
            const correctOptionIds = quizQuestion.question.options
                .filter((opt) => opt.isCorrect)
                .map((opt) => opt.id);
            const isCorrect = data.selectedOptions.length === correctOptionIds.length &&
                data.selectedOptions.every(id => correctOptionIds.includes(id));
            const answer = await prisma.quizAnswer.create({
                data: {
                    attemptId: data.attemptId,
                    questionId: data.questionId,
                    selectedOptions: data.selectedOptions.map(String),
                    isCorrect,
                    timeSpent: data.timeSpent
                }
            });
            if (isCorrect) {
                await prisma.quizAttempt.update({
                    where: { id: data.attemptId },
                    data: {
                        correctAnswers: {
                            increment: 1
                        }
                    }
                });
            }
            (0, logger_1.logInfo)('Answer submitted', {
                attemptId: data.attemptId,
                questionId: data.questionId,
                isCorrect
            });
            return {
                answer,
                isCorrect,
                correctOptionIds: isCorrect ? undefined : correctOptionIds
            };
        }
        catch (error) {
            (0, logger_1.logError)('Failed to submit answer', error);
            throw error;
        }
    }
    async completeQuizAttempt(data) {
        try {
            const attempt = await prisma.quizAttempt.findUnique({
                where: {
                    id: data.attemptId,
                    userId: data.userId
                },
                include: {
                    answers: true,
                    quiz: true,
                    user: true
                }
            });
            if (!attempt || attempt.status !== 'IN_PROGRESS') {
                throw new Error('Quiz attempt not found or already completed');
            }
            const score = attempt.totalQuestions > 0
                ? Math.round((attempt.correctAnswers / attempt.totalQuestions) * 100)
                : 0;
            const totalTimeSpent = attempt.answers.reduce((sum, answer) => sum + (answer.timeSpent || 0), 0);
            const completedAttempt = await prisma.quizAttempt.update({
                where: { id: data.attemptId },
                data: {
                    status: 'COMPLETED',
                    score,
                    timeSpent: totalTimeSpent,
                    completedAt: new Date()
                },
                include: {
                    quiz: {
                        select: {
                            id: true,
                            title: true,
                            difficulty: true
                        }
                    },
                    user: {
                        select: {
                            id: true,
                            username: true
                        }
                    },
                    answers: {
                        include: {
                            attempt: false
                        }
                    }
                }
            });
            const isWin = score >= 70;
            await prisma.user.update({
                where: { id: data.userId },
                data: {
                    totalMatches: {
                        increment: 1
                    },
                    wins: isWin ? {
                        increment: 1
                    } : undefined
                }
            });
            (0, logger_1.logInfo)('Quiz attempt completed', {
                attemptId: data.attemptId,
                userId: data.userId,
                score,
                isWin
            });
            return {
                attempt: completedAttempt,
                summary: {
                    score,
                    correctAnswers: attempt.correctAnswers,
                    totalQuestions: attempt.totalQuestions,
                    timeSpent: totalTimeSpent,
                    isWin
                }
            };
        }
        catch (error) {
            (0, logger_1.logError)('Failed to complete quiz attempt', error);
            throw error;
        }
    }
    async getAttemptById(id, userId) {
        try {
            const attempt = await prisma.quizAttempt.findUnique({
                where: {
                    id,
                    userId
                },
                include: {
                    quiz: {
                        select: {
                            id: true,
                            title: true,
                            description: true,
                            difficulty: true,
                            timeLimit: true
                        }
                    },
                    answers: {
                        include: {}
                    }
                }
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
                prisma.quizAttempt.findMany({
                    where: { userId },
                    include: {
                        quiz: {
                            select: {
                                id: true,
                                title: true,
                                difficulty: true
                            }
                        }
                    },
                    orderBy: {
                        startedAt: 'desc'
                    },
                    skip,
                    take: limit
                }),
                prisma.quizAttempt.count({
                    where: { userId }
                })
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
            const where = {
                status: 'COMPLETED'
            };
            if (quizId) {
                where.quizId = quizId;
            }
            const topAttempts = await prisma.quizAttempt.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            firstName: true,
                            lastName: true
                        }
                    },
                    quiz: {
                        select: {
                            id: true,
                            title: true,
                            difficulty: true
                        }
                    }
                },
                orderBy: [
                    { score: 'desc' },
                    { timeSpent: 'asc' },
                    { completedAt: 'asc' }
                ],
                take: limit
            });
            return topAttempts.map((attempt, index) => ({
                rank: index + 1,
                user: attempt.user,
                quiz: attempt.quiz,
                score: attempt.score,
                timeSpent: attempt.timeSpent,
                completedAt: attempt.completedAt
            }));
        }
        catch (error) {
            (0, logger_1.logError)('Failed to get leaderboard', error);
            throw error;
        }
    }
    async getUserStats(userId) {
        try {
            const [user, attempts, recentAttempts] = await Promise.all([
                prisma.user.findUnique({
                    where: { id: userId },
                    select: {
                        id: true,
                        username: true,
                        eloRating: true,
                        totalMatches: true,
                        wins: true,
                        losses: true
                    }
                }),
                prisma.quizAttempt.findMany({
                    where: {
                        userId,
                        status: 'COMPLETED'
                    },
                    select: {
                        score: true,
                        timeSpent: true,
                        quiz: {
                            select: {
                                difficulty: true
                            }
                        }
                    }
                }),
                prisma.quizAttempt.findMany({
                    where: { userId },
                    include: {
                        quiz: {
                            select: {
                                title: true,
                                difficulty: true
                            }
                        }
                    },
                    orderBy: {
                        startedAt: 'desc'
                    },
                    take: 5
                })
            ]);
            if (!user) {
                throw new Error('User not found');
            }
            const completedAttempts = attempts.length;
            const averageScore = completedAttempts > 0
                ? attempts.reduce((sum, a) => sum + a.score, 0) / completedAttempts
                : 0;
            const difficultyStats = {
                EASY: attempts.filter((a) => a.quiz.difficulty === 'EASY').length,
                MEDIUM: attempts.filter((a) => a.quiz.difficulty === 'MEDIUM').length,
                HARD: attempts.filter((a) => a.quiz.difficulty === 'HARD').length
            };
            return {
                user,
                stats: {
                    completedAttempts,
                    averageScore: Math.round(averageScore * 100) / 100,
                    totalTimeSpent: attempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0),
                    difficultyStats
                },
                recentAttempts
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