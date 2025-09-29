import { QuizAttempt, QuizAttemptAnswer } from '../models';
export interface StartQuizAttemptData {
    userId: number;
    quizId: number;
}
export interface SubmitAnswerData {
    attemptId: number;
    questionId: number;
    selectedOptions: number[];
    timeSpent?: number;
}
export interface CompleteQuizAttemptData {
    attemptId: number;
    userId: number;
}
export declare class QuizAttemptService {
    startQuizAttempt(data: StartQuizAttemptData): Promise<QuizAttempt>;
    submitAnswer(data: SubmitAnswerData): Promise<QuizAttemptAnswer>;
    completeQuizAttempt(data: CompleteQuizAttemptData): Promise<QuizAttempt | null>;
    getAttemptById(id: number, userId: number): Promise<QuizAttempt | null>;
    getUserAttempts(userId: number, page?: number, limit?: number): Promise<{
        attempts: QuizAttempt[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    getLeaderboard(quizId?: number, limit?: number): Promise<QuizAttempt[]>;
    getUserStats(userId: number): Promise<{
        totalAttempts: number;
        completedAttempts: number;
        averageScore: number;
    }>;
}
export declare const quizAttemptService: QuizAttemptService;
//# sourceMappingURL=quizAttemptService.d.ts.map