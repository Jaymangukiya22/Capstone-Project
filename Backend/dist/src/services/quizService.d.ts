import { Quiz, Difficulty, QuizQuestion } from '../models';
export interface CreateQuizData {
    title: string;
    description?: string;
    difficulty?: Difficulty;
    timeLimit?: number;
    maxQuestions?: number;
    categoryId: number;
    createdById: number;
}
export interface AssignQuestionsData {
    quizId: number;
    questionIds: number[];
}
export interface QuizSearchFilters {
    difficulty?: Difficulty;
    categoryId?: number;
    search?: string;
    page?: number;
    limit?: number;
}
export declare class QuizService {
    createQuiz(quizData: CreateQuizData): Promise<Quiz | null>;
    assignQuestionsToQuiz(data: AssignQuestionsData): Promise<QuizQuestion[]>;
    searchQuizzes(filters: QuizSearchFilters): Promise<{
        quizzes: Quiz[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    getQuizById(id: number): Promise<Quiz | null>;
    getQuizForPlay(id: number, userId: number): Promise<any>;
    updateQuiz(id: number, data: Partial<CreateQuizData>): Promise<Quiz | null>;
    deleteQuiz(id: number): Promise<boolean>;
    getQuizStats(id: number): Promise<{
        quiz: Quiz;
        stats: {
            totalAttempts: number;
            averageScore: number;
            completionRate: number;
            popularityRank: number;
        };
    }>;
    getPopularQuizzes(limit?: number): Promise<Quiz[]>;
}
export declare const quizService: QuizService;
//# sourceMappingURL=quizService.d.ts.map