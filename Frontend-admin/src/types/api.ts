// Updated types to match backend Prisma schema

export interface Category {
  id: number;
  name: string;
  description?: string;
  parentId?: number | null;
  parent?: Category | null;
  children?: Category[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  quizzes?: Quiz[];
}

export interface Quiz {
  id: number;
  title: string;
  description?: string;
  categoryId: number;
  category?: Category;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  timeLimit?: number;
  createdAt: string;
  updatedAt: string;
  questions?: Question[];
}

export interface Question {
  id: number;
  quizId: number;
  quiz?: Quiz;
  questionText: string;
  createdAt: string;
  updatedAt: string;
  options: Option[];
}

export interface Option {
  id: number;
  questionId: number;
  question?: Question;
  optionText: string;
  isCorrect: boolean;
  createdAt: string;
  updatedAt: string;
}

// Create/Update DTOs
export interface CreateCategoryDto {
  name: string;
  description?: string;
  parentId?: number | null;
  isActive?: boolean;
}

export interface UpdateCategoryDto {
  name?: string;
  description?: string;
  parentId?: number | null;
  isActive?: boolean;
}

export interface CreateQuizDto {
  title: string;
  description?: string;
  categoryId: number;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  timeLimit?: number;
}

export interface UpdateQuizDto {
  title?: string;
  description?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  timeLimit?: number;
}

export interface CreateQuestionDto {
  questionText: string;
  options: {
    optionText: string;
    isCorrect: boolean;
  }[];
}

export interface UpdateQuestionDto {
  questionText?: string;
  options?: {
    optionText: string;
    isCorrect: boolean;
  }[];
}

// Stats interface
export interface QuizStats {
  totalQuestions: number;
  averageTimeLimit: number;
  difficultyDistribution: {
    EASY: number;
    MEDIUM: number;
    HARD: number;
  };
}

export interface CategoryStats {
  totalCategories: number;
  totalSubcategories: number;
  totalQuizzes: number;
  recentlyAdded: number;
}
