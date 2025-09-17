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
    startQuizAttempt(data: StartQuizAttemptData): Promise<{
        quiz: {
            id: number;
            title: string;
            timeLimit: number | null;
            maxQuestions: number | null;
        };
        user: {
            id: number;
            username: string;
        };
    } & {
        id: number;
        quizId: number;
        status: import(".prisma/client").$Enums.QuizAttemptStatus;
        timeSpent: number | null;
        userId: number;
        score: number;
        totalQuestions: number;
        correctAnswers: number;
        startedAt: Date;
        completedAt: Date | null;
    }>;
    submitAnswer(data: SubmitAnswerData): Promise<{
        answer: {
            id: number;
            questionId: number;
            isCorrect: boolean;
            selectedOptions: string[];
            timeSpent: number | null;
            attemptId: number;
            answeredAt: Date;
        };
        isCorrect: boolean;
        correctOptionIds: number[] | undefined;
    }>;
    completeQuizAttempt(data: CompleteQuizAttemptData): Promise<{
        attempt: {
            quiz: {
                id: number;
                title: string;
                difficulty: import(".prisma/client").$Enums.Difficulty;
            };
            user: {
                id: number;
                username: string;
            };
            answers: ({} & {
                id: number;
                questionId: number;
                isCorrect: boolean;
                selectedOptions: string[];
                timeSpent: number | null;
                attemptId: number;
                answeredAt: Date;
            })[];
        } & {
            id: number;
            quizId: number;
            status: import(".prisma/client").$Enums.QuizAttemptStatus;
            timeSpent: number | null;
            userId: number;
            score: number;
            totalQuestions: number;
            correctAnswers: number;
            startedAt: Date;
            completedAt: Date | null;
        };
        summary: {
            score: number;
            correctAnswers: number;
            totalQuestions: number;
            timeSpent: number;
            isWin: boolean;
        };
    }>;
    getAttemptById(id: number, userId: number): Promise<({
        quiz: {
            description: string | null;
            id: number;
            title: string;
            difficulty: import(".prisma/client").$Enums.Difficulty;
            timeLimit: number | null;
        };
        answers: ({} & {
            id: number;
            questionId: number;
            isCorrect: boolean;
            selectedOptions: string[];
            timeSpent: number | null;
            attemptId: number;
            answeredAt: Date;
        })[];
    } & {
        id: number;
        quizId: number;
        status: import(".prisma/client").$Enums.QuizAttemptStatus;
        timeSpent: number | null;
        userId: number;
        score: number;
        totalQuestions: number;
        correctAnswers: number;
        startedAt: Date;
        completedAt: Date | null;
    }) | null>;
    getUserAttempts(userId: number, page?: number, limit?: number): Promise<{
        attempts: {
            id: number;
            quizId: number;
            status: import(".prisma/client").$Enums.QuizAttemptStatus;
            timeSpent: number | null;
            userId: number;
            score: number;
            totalQuestions: number;
            correctAnswers: number;
            startedAt: Date;
            completedAt: Date | null;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    getLeaderboard(quizId?: number, limit?: number): Promise<{
        rank: number;
        user: {
            id: number;
            username: string;
            firstName: string | null;
            lastName: string | null;
        };
        quiz: {
            id: number;
            title: string;
            difficulty: import(".prisma/client").$Enums.Difficulty;
        };
        score: number;
        timeSpent: number | null;
        completedAt: Date | null;
    }[]>;
    getUserStats(userId: number): Promise<{
        user: {
            id: number;
            username: string;
            eloRating: number;
            totalMatches: number;
            wins: number;
            losses: number;
        };
        stats: {
            completedAttempts: number;
            averageScore: number;
            totalTimeSpent: number;
            difficultyStats: {
                EASY: number;
                MEDIUM: number;
                HARD: number;
            };
        };
        recentAttempts: {
            id: number;
            quizId: number;
            status: import(".prisma/client").$Enums.QuizAttemptStatus;
            timeSpent: number | null;
            userId: number;
            score: number;
            totalQuestions: number;
            correctAnswers: number;
            startedAt: Date;
            completedAt: Date | null;
        }[];
    }>;
}
export declare const quizAttemptService: QuizAttemptService;
//# sourceMappingURL=quizAttemptService.d.ts.map