// Export all services for easy importing
export { categoryService } from './categoryService';
export { quizService } from './quizService';
export { questionService } from './questionService';
export { apiClient } from './api';

// Export types
export type { ApiResponse, ApiError } from './api';
export type {
  Category,
  Quiz,
  Question,
  Option,
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateQuizDto,
  UpdateQuizDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  QuizStats,
  CategoryStats
} from '../types/api';
