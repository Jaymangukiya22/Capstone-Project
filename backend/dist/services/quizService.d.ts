import { Quiz, Difficulty } from '@prisma/client';
export declare class QuizService {
    createQuiz(title: string, description: string | undefined, categoryId: number, difficulty?: Difficulty, timeLimit?: number): Promise<Quiz>;
    getQuizById(id: number): Promise<any | null>;
    getAllQuizzes(categoryId?: number): Promise<Quiz[]>;
    updateQuiz(id: number, title?: string, description?: string, categoryId?: number, difficulty?: Difficulty, timeLimit?: number): Promise<Quiz>;
    deleteQuiz(id: number): Promise<void>;
    getQuizzesByCategory(categoryId: number): Promise<Quiz[]>;
    getQuizStats(id: number): Promise<any>;
}
export declare const quizService: QuizService;
//# sourceMappingURL=quizService.d.ts.map