import { Question } from '@prisma/client';
export interface CreateQuestionData {
    quizId: number;
    questionText: string;
    options: {
        optionText: string;
        isCorrect: boolean;
    }[];
}
export declare class QuestionService {
    createQuestion(data: CreateQuestionData): Promise<Question>;
    addQuestionToQuiz(quizId: number, questionText: string, options: {
        optionText: string;
        isCorrect: boolean;
    }[]): Promise<Question>;
    getQuestionsByQuizId(quizId: number): Promise<Question[]>;
    getQuestionById(id: number): Promise<Question | null>;
    updateQuestion(id: number, questionText?: string, options?: {
        optionText: string;
        isCorrect: boolean;
    }[]): Promise<Question>;
    deleteQuestion(id: number): Promise<void>;
    getQuestionStats(quizId: number): Promise<any>;
}
export declare const questionService: QuestionService;
//# sourceMappingURL=questionService.d.ts.map