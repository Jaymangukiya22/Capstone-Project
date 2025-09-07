export interface CreateQuestionData {
    quizId: number;
    questionText: string;
    options: {
        optionText: string;
        isCorrect: boolean;
    }[];
}
export declare class QuestionService {
    createQuestion(data: CreateQuestionData): Promise<any>;
    addQuestionToQuiz(quizId: number, questionText: string, options: {
        optionText: string;
        isCorrect: boolean;
    }[]): Promise<any>;
    getQuestionsByQuizId(quizId: number): Promise<any[]>;
    getQuestionById(id: number): Promise<any | null>;
    updateQuestion(id: number, questionText?: string, options?: {
        optionText: string;
        isCorrect: boolean;
    }[]): Promise<any>;
    deleteQuestion(id: number): Promise<boolean>;
    getQuestionStats(quizId: number): Promise<any>;
}
export declare const questionService: QuestionService;
//# sourceMappingURL=questionService.d.ts.map