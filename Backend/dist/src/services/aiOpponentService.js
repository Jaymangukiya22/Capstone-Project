"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiOpponentService = exports.AIOpponentService = void 0;
const enums_1 = require("../types/enums");
const logger_1 = require("../utils/logger");
const AI_OPPONENTS = [
    {
        id: 'rookie-bot',
        name: 'Rookie Bot',
        difficulty: 'easy',
        responseTimeRange: { min: 8, max: 15 },
        accuracyRate: 60,
        avatar: '🤖'
    },
    {
        id: 'smart-bot',
        name: 'Smart Bot',
        difficulty: 'medium',
        responseTimeRange: { min: 5, max: 12 },
        accuracyRate: 75,
        avatar: '🧠'
    },
    {
        id: 'genius-bot',
        name: 'Genius Bot',
        difficulty: 'hard',
        responseTimeRange: { min: 3, max: 8 },
        accuracyRate: 90,
        avatar: '🚀'
    }
];
class AIOpponentService {
    getAIOpponents() {
        return AI_OPPONENTS;
    }
    getAIOpponent(id) {
        return AI_OPPONENTS.find(opponent => opponent.id === id) || null;
    }
    selectAIOpponentByDifficulty(quizDifficulty) {
        const difficultyMap = {
            [enums_1.Difficulty.EASY]: 'rookie-bot',
            [enums_1.Difficulty.MEDIUM]: 'smart-bot',
            [enums_1.Difficulty.HARD]: 'genius-bot'
        };
        const opponentId = difficultyMap[quizDifficulty];
        return this.getAIOpponent(opponentId) || AI_OPPONENTS[1];
    }
    async generateAIResponse(question, opponent, timeLimit = 30) {
        const { min, max } = opponent.responseTimeRange;
        let responseTime = this.randomBetween(min, max);
        const difficultyMultiplier = {
            [enums_1.Difficulty.EASY]: 0.8,
            [enums_1.Difficulty.MEDIUM]: 1.0,
            [enums_1.Difficulty.HARD]: 1.3
        };
        responseTime *= difficultyMultiplier[question.difficulty];
        responseTime = Math.min(responseTime, timeLimit - 1);
        const willAnswerCorrectly = Math.random() * 100 < opponent.accuracyRate;
        let selectedOptionId;
        let isCorrect;
        if (willAnswerCorrectly) {
            const correctOption = question.options.find(opt => opt.isCorrect);
            selectedOptionId = correctOption?.id || question.options[0].id;
            isCorrect = true;
        }
        else {
            const incorrectOptions = question.options.filter(opt => !opt.isCorrect);
            if (incorrectOptions.length > 0) {
                const randomIndex = Math.floor(Math.random() * incorrectOptions.length);
                selectedOptionId = incorrectOptions[randomIndex].id;
                isCorrect = false;
            }
            else {
                selectedOptionId = question.options[0].id;
                isCorrect = question.options[0].isCorrect;
            }
        }
        await this.delay(responseTime * 1000);
        (0, logger_1.logInfo)(`AI ${opponent.name} responded to question ${question.id}`, {
            responseTime,
            isCorrect,
            selectedOptionId
        });
        return {
            selectedOptionId,
            responseTime,
            isCorrect
        };
    }
    calculateAIScore(responses, basePointsPerQuestion = 100, timeBonus = true) {
        let totalScore = 0;
        for (const response of responses) {
            if (response.isCorrect) {
                let questionScore = basePointsPerQuestion;
                if (timeBonus) {
                    const timeBonusMultiplier = Math.max(0.1, 1 - (response.responseTime / 30));
                    questionScore += Math.floor(basePointsPerQuestion * 0.5 * timeBonusMultiplier);
                }
                totalScore += questionScore;
            }
        }
        return totalScore;
    }
    generateAIStats(responses) {
        const totalQuestions = responses.length;
        const correctAnswers = responses.filter(r => r.isCorrect).length;
        const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
        const averageResponseTime = totalQuestions > 0
            ? responses.reduce((sum, r) => sum + r.responseTime, 0) / totalQuestions
            : 0;
        const totalScore = this.calculateAIScore(responses);
        return {
            totalQuestions,
            correctAnswers,
            accuracy: Math.round(accuracy * 100) / 100,
            averageResponseTime: Math.round(averageResponseTime * 100) / 100,
            totalScore
        };
    }
    randomBetween(min, max) {
        return Math.random() * (max - min) + min;
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.AIOpponentService = AIOpponentService;
exports.aiOpponentService = new AIOpponentService();
//# sourceMappingURL=aiOpponentService.js.map