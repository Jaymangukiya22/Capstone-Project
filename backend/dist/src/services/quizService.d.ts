declare enum Difficulty {
    EASY = "EASY",
    MEDIUM = "MEDIUM",
    HARD = "HARD"
}
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
    createQuiz(quizData: CreateQuizData): Promise<{
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
        quizQuestions: ({
            question: {
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
            };
        } & {
            id: number;
            createdAt: Date;
            order: number | null;
            quizId: number;
            questionId: number;
        })[];
        _count: {
            quizQuestions: number;
            attempts: number;
        };
    } & {
        description: string | null;
        id: number;
        title: string;
        categoryId: number;
        difficulty: import(".prisma/client").$Enums.Difficulty;
        timeLimit: number | null;
        maxQuestions: number | null;
        isActive: boolean;
        createdById: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    assignQuestionsToQuiz(data: AssignQuestionsData): Promise<import(".prisma/client").Prisma.BatchPayload>;
    searchQuizzes(filters: QuizSearchFilters): Promise<{
        quizzes: ({
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
            _count: {
                quizQuestions: number;
                attempts: number;
            };
        } & {
            description: string | null;
            id: number;
            title: string;
            categoryId: number;
            difficulty: import(".prisma/client").$Enums.Difficulty;
            timeLimit: number | null;
            maxQuestions: number | null;
            isActive: boolean;
            createdById: number;
            createdAt: Date;
            updatedAt: Date;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    getQuizById(id: number): Promise<({
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
        quizQuestions: ({
            question: {
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
            };
        } & {
            id: number;
            createdAt: Date;
            order: number | null;
            quizId: number;
            questionId: number;
        })[];
        _count: {
            quizQuestions: number;
            attempts: number;
        };
    } & {
        description: string | null;
        id: number;
        title: string;
        categoryId: number;
        difficulty: import(".prisma/client").$Enums.Difficulty;
        timeLimit: number | null;
        maxQuestions: number | null;
        isActive: boolean;
        createdById: number;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
    getQuizForPlay(id: number, userId: number): Promise<{
        quizQuestions: ({
            question: {
                options: {
                    id: number;
                    optionText: string;
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
            };
        } & {
            id: number;
            createdAt: Date;
            order: number | null;
            quizId: number;
            questionId: number;
        })[];
        category: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            parentId: number | null;
        };
        description: string | null;
        id: number;
        title: string;
        categoryId: number;
        difficulty: import(".prisma/client").$Enums.Difficulty;
        timeLimit: number | null;
        maxQuestions: number | null;
        isActive: boolean;
        createdById: number;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    updateQuiz(id: number, data: Partial<CreateQuizData>): Promise<{
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
        quizQuestions: ({
            question: {
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
            };
        } & {
            id: number;
            createdAt: Date;
            order: number | null;
            quizId: number;
            questionId: number;
        })[];
        _count: {
            quizQuestions: number;
            attempts: number;
        };
    } & {
        description: string | null;
        id: number;
        title: string;
        categoryId: number;
        difficulty: import(".prisma/client").$Enums.Difficulty;
        timeLimit: number | null;
        maxQuestions: number | null;
        isActive: boolean;
        createdById: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteQuiz(id: number): Promise<boolean>;
    getQuizStats(id: number): Promise<{
        id: number;
        title: string;
        description: string | null;
        difficulty: import(".prisma/client").$Enums.Difficulty;
        timeLimit: number | null;
        maxQuestions: number | null;
        categoryId: number;
        totalQuestions: number;
        totalAttempts: number;
        completedAttempts: number;
        averageScore: number;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    getPopularQuizzes(limit?: number): Promise<({
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
        _count: {
            quizQuestions: number;
            attempts: number;
        };
    } & {
        description: string | null;
        id: number;
        title: string;
        categoryId: number;
        difficulty: import(".prisma/client").$Enums.Difficulty;
        timeLimit: number | null;
        maxQuestions: number | null;
        isActive: boolean;
        createdById: number;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
}
export declare const quizService: QuizService;
export {};
//# sourceMappingURL=quizService.d.ts.map