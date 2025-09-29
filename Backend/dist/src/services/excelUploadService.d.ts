import { QuestionBankItem } from '../models';
export interface ExcelQuestionRow {
    question: string;
    option1: string;
    option2: string;
    option3?: string;
    option4?: string;
    correctAnswers: string;
    difficulty?: string;
    category?: string;
}
export interface UploadOptions {
    categoryId: number;
    includeSubcategories: boolean;
    subcategoryDepth?: number;
    createdById: number;
}
export interface UploadResult {
    totalRows: number;
    successfulImports: number;
    failedImports: number;
    errors: string[];
    importedQuestions: QuestionBankItem[];
    categoryDistribution: {
        [categoryName: string]: number;
    };
}
export declare class ExcelUploadService {
    private categoryService;
    constructor();
    importQuestionsFromExcel(fileBuffer: Buffer, options: UploadOptions): Promise<UploadResult>;
    private normalizeCorrectAnswer;
    private validateHeaders;
    private parseQuestionRows;
    private createHeaderMap;
    private getCellValue;
    private validateQuestion;
    private getTargetCategories;
    private flattenCategories;
    private importQuestions;
    generateTemplate(): Buffer;
}
export declare const excelUploadService: ExcelUploadService;
//# sourceMappingURL=excelUploadService.d.ts.map