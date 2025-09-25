import { QuestionBankItem, Difficulty } from '../models';
export interface CreateQuestionBankItemData {
    questionText: string;
    categoryId: number;
    difficulty: Difficulty;
    createdById: number;
    options: {
        optionText: string;
        isCorrect: boolean;
    }[];
}
export interface BulkImportData {
    categoryId: number;
    createdById: number;
    questions: {
        questionText: string;
        difficulty: Difficulty;
        options: {
            optionText: string;
            isCorrect: boolean;
        }[];
    }[];
}
export declare class QuestionBankService {
    createQuestion(data: CreateQuestionBankItemData): Promise<QuestionBankItem>;
    getQuestionsByCategory(categoryId: number, page?: number, limit?: number): Promise<{
        questions: QuestionBankItem[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    getAllQuestions(page?: number, limit?: number, difficulty?: Difficulty): Promise<{
        questions: QuestionBankItem[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    getQuestionById(id: number): Promise<QuestionBankItem | null>;
    updateQuestion(id: number, data: Partial<CreateQuestionBankItemData>): Promise<QuestionBankItem | null>;
    deleteQuestion(id: number): Promise<boolean>;
    bulkImport(data: BulkImportData): Promise<{
        imported: number;
        questions: QuestionBankItem[];
    }>;
    parseExcelFile(buffer: Buffer): Promise<any[]>;
    searchQuestions(query: string, categoryId?: number, difficulty?: Difficulty): Promise<QuestionBankItem[]>;
}
//# sourceMappingURL=questionBankService.d.ts.map