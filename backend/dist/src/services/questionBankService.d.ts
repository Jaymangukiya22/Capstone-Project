import { Difficulty } from '@prisma/client';
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
    createQuestion(data: CreateQuestionBankItemData): Promise<{
        category: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            parentId: number | null;
        };
        createdBy: {
            id: number;
            username: string;
        };
        options: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            questionId: number;
            optionText: string;
            isCorrect: boolean;
        }[];
    } & {
        id: number;
        categoryId: number;
        difficulty: import(".prisma/client").$Enums.Difficulty;
        isActive: boolean;
        createdById: number;
        createdAt: Date;
        updatedAt: Date;
        questionText: string;
    }>;
    getQuestionsByCategory(categoryId: number, page?: number, limit?: number): Promise<{
        questions: ({
            category: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                parentId: number | null;
            };
            createdBy: {
                id: number;
                username: string;
            };
            options: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                questionId: number;
                optionText: string;
                isCorrect: boolean;
            }[];
        } & {
            id: number;
            categoryId: number;
            difficulty: import(".prisma/client").$Enums.Difficulty;
            isActive: boolean;
            createdById: number;
            createdAt: Date;
            updatedAt: Date;
            questionText: string;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    getAllQuestions(page?: number, limit?: number, difficulty?: Difficulty): Promise<{
        questions: ({
            category: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                parentId: number | null;
            };
            createdBy: {
                id: number;
                username: string;
            };
            options: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                questionId: number;
                optionText: string;
                isCorrect: boolean;
            }[];
        } & {
            id: number;
            categoryId: number;
            difficulty: import(".prisma/client").$Enums.Difficulty;
            isActive: boolean;
            createdById: number;
            createdAt: Date;
            updatedAt: Date;
            questionText: string;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    getQuestionById(id: number): Promise<({
        category: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            parentId: number | null;
        };
        createdBy: {
            id: number;
            username: string;
        };
        options: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            questionId: number;
            optionText: string;
            isCorrect: boolean;
        }[];
    } & {
        id: number;
        categoryId: number;
        difficulty: import(".prisma/client").$Enums.Difficulty;
        isActive: boolean;
        createdById: number;
        createdAt: Date;
        updatedAt: Date;
        questionText: string;
    }) | null>;
    updateQuestion(id: number, data: Partial<CreateQuestionBankItemData>): Promise<{
        category: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            parentId: number | null;
        };
        createdBy: {
            id: number;
            username: string;
        };
        options: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            questionId: number;
            optionText: string;
            isCorrect: boolean;
        }[];
    } & {
        id: number;
        categoryId: number;
        difficulty: import(".prisma/client").$Enums.Difficulty;
        isActive: boolean;
        createdById: number;
        createdAt: Date;
        updatedAt: Date;
        questionText: string;
    }>;
    deleteQuestion(id: number): Promise<boolean>;
    bulkImport(data: BulkImportData): Promise<{
        imported: number;
        questions: ({
            category: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                parentId: number | null;
            };
            createdBy: {
                id: number;
                username: string;
            };
            options: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                questionId: number;
                optionText: string;
                isCorrect: boolean;
            }[];
        } & {
            id: number;
            categoryId: number;
            difficulty: import(".prisma/client").$Enums.Difficulty;
            isActive: boolean;
            createdById: number;
            createdAt: Date;
            updatedAt: Date;
            questionText: string;
        })[];
    }>;
    parseExcelFile(buffer: Buffer): Promise<any[]>;
    searchQuestions(query: string, categoryId?: number, difficulty?: Difficulty): Promise<({
        category: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            parentId: number | null;
        };
        createdBy: {
            id: number;
            username: string;
        };
        options: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            questionId: number;
            optionText: string;
            isCorrect: boolean;
        }[];
    } & {
        id: number;
        categoryId: number;
        difficulty: import(".prisma/client").$Enums.Difficulty;
        isActive: boolean;
        createdById: number;
        createdAt: Date;
        updatedAt: Date;
        questionText: string;
    })[]>;
}
//# sourceMappingURL=questionBankService.d.ts.map