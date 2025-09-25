import { Difficulty } from '../types/enums';
export interface AIOpponent {
    id: string;
    name: string;
    difficulty: 'easy' | 'medium' | 'hard';
    responseTimeRange: {
        min: number;
        max: number;
    };
    accuracyRate: number;
    avatar?: string;
}
export interface AIResponse {
    selectedOptionId: number;
    responseTime: number;
    isCorrect: boolean;
}
export interface QuestionWithOptions {
    id: number;
    questionText: string;
    difficulty: Difficulty;
    options: {
        id: number;
        optionText: string;
        isCorrect: boolean;
    }[];
}
export declare class AIOpponentService {
    getAIOpponents(): AIOpponent[];
    getAIOpponent(id: string): AIOpponent | null;
    selectAIOpponentByDifficulty(quizDifficulty: Difficulty): AIOpponent;
    generateAIResponse(question: QuestionWithOptions, opponent: AIOpponent, timeLimit?: number): Promise<AIResponse>;
    calculateAIScore(responses: AIResponse[], basePointsPerQuestion?: number, timeBonus?: boolean): number;
    generateAIStats(responses: AIResponse[]): {
        totalQuestions: number;
        correctAnswers: number;
        accuracy: number;
        averageResponseTime: number;
        totalScore: number;
    };
    private randomBetween;
    private delay;
}
export declare const aiOpponentService: AIOpponentService;
//# sourceMappingURL=aiOpponentService.d.ts.map