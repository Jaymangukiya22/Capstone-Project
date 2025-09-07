import { Prisma as PrismaTypes, Quiz as PrismaQuiz, Question as PrismaQuestion, Option as PrismaOption, Category } from '@prisma/client';
type Quiz = PrismaTypes.QuizGetPayload<{
    include: {
        questions: {
            include: {
                options: true;
            };
        };
    };
}>;
type QuestionWithOptions = PrismaQuestion & {
    options: PrismaOption[];
};
type QuizWithRelations = Omit<PrismaQuiz, 'questions'> & {
    questions?: QuestionWithOptions[];
    category?: Category;
};
export interface CreateQuizData {
    title: string;
    description?: string;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    timeLimit?: number | null;
    questions?: Array<{
        questionText: string;
        options: Array<{
            optionText: string;
            isCorrect: boolean;
        }>;
    }>;
    categoryId?: number;
}
export declare class QuizService {
    createQuiz(quizData: Omit<CreateQuizData, 'categoryId'>, categoryId?: number): Promise<QuizWithRelations>;
    getAllQuizzes(filters?: {
        difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
        categoryId?: number;
        limit?: number;
        offset?: number;
    }): Promise<{
        quizzes: Quiz[];
        total: number;
    }>;
    getQuizById(id: number): Promise<QuizWithRelations | null>;
    updateQuiz(id: number, data: Partial<CreateQuizData>): Promise<QuizWithRelations>;
    deleteQuiz(id: number): Promise<boolean>;
    updateQuestionCount(quizId: number): Promise<number>;
    getQuizStats(id: number): Promise<any>;
}
export declare const quizService: QuizService;
export {};
//# sourceMappingURL=quizService.d.ts.map