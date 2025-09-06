export interface Category {
  id: string;
  name: string;
  description?: string;
  subcategories: Subcategory[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Subcategory {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  quizzes: Quiz[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Quiz {
  id: string;
  name: string;
  description?: string;
  mode: QuizMode;
  subcategoryId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type QuizMode = "1v1" | "play-with-friend" | "multiplayer";

export interface Stats {
  totalCategories: number;
  totalSubcategories: number;
  totalQuizzes: number;
  recentlyAdded: number;
}
