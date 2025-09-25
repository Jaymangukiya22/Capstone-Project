import { Difficulty } from '../models/QuestionBankItem';
export interface CreateQuestionData {
    categoryId: number;
    createdById: number;
    questionText: string;
    difficulty?: Difficulty;
    options: {
        optionText: string;
        isCorrect: boolean;
    }[];
}
export interface UpdateQuestionData {
    questionText?: string;
    difficulty?: Difficulty;
    options?: {
        optionText: string;
        isCorrect: boolean;
    }[];
}
export interface QuestionFilters {
    categoryId?: number;
    difficulty?: Difficulty;
    search?: string;
    page?: number;
    limit?: number;
}
export declare class QuestionService {
    createQuestion(data: CreateQuestionData): Promise<any>;
    getQuestionsByCategory(categoryId: number, page?: number, limit?: number): Promise<any>;
    getQuestionById(id: number): Promise<any>;
    updateQuestion(id: number, data: UpdateQuestionData): Promise<any>;
    deleteQuestion(id: number): Promise<boolean>;
    searchQuestions(filters: QuestionFilters): Promise<any>;
    getRandomQuestions(categoryId?: number, difficulty?: Difficulty, count?: number): Promise<any>;
    addQuestionToQuiz(quizId: number, questionText: string, options: any[]): Promise<any>;
    getQuestionsByQuizId(quizId: number): Promise<any>;
    getQuestionStats(quizId: number): Promise<any>;
}
export declare const questionService: QuestionService;
//# sourceMappingURL=questionService.d.ts.map