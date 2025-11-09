import { apiClient } from './api';
import type { ApiResponse } from './api';
import type { Quiz, CreateQuizDto, UpdateQuizDto, QuizStats } from '../types/api';

/**
 * Quiz Service - Handles all Quiz CRUD operations
 */
export class QuizService {
  private readonly endpoint = '/quizzes';

  /**
   * Get all quizzes
   */
  async getAllQuizzes(filters?: {
    categoryId?: number;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    limit?: number;
    offset?: number;
  }): Promise<{ quizzes: Quiz[]; total: number }> {
    try {
      const params = new URLSearchParams();
      if (filters?.categoryId) params.append('categoryId', filters.categoryId.toString());
      if (filters?.difficulty) params.append('difficulty', filters.difficulty);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const response = await apiClient.get<ApiResponse<any>>(
        `${this.endpoint}${params.toString() ? '?' + params.toString() : ''}`
      );
      
      return {
        quizzes: response.data.data.quizzes || [],
        total: response.data.data.pagination?.total || 0
      };
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      throw error;
    }
  }

  /**
   * Get quiz by ID
   */
  async getQuizById(id: number): Promise<Quiz> {
    try {
      const response = await apiClient.get<ApiResponse<Quiz>>(`${this.endpoint}/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching quiz ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create new quiz
   */
  async createQuiz(quizData: CreateQuizDto): Promise<Quiz> {
    try {
      const response = await apiClient.post<ApiResponse<{ quiz: Quiz }>>(this.endpoint, quizData);
      if (!response.data.data) {
        throw new Error('No data returned from server');
      }
      return response.data.data.quiz;
    } catch (error) {
      console.error('Error creating quiz:', error);
      throw error;
    }
  }

  /**
   * Update existing quiz
   */
  async updateQuiz(id: number, quizData: UpdateQuizDto): Promise<Quiz> {
    try {
      const response = await apiClient.put<ApiResponse<{ quiz: Quiz }>>(`${this.endpoint}/${id}`, quizData);
      if (!response.data.data) {
        throw new Error('No data returned from server');
      }
      return response.data.data.quiz;
    } catch (error) {
      console.error(`Error updating quiz ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete quiz
   */
  async deleteQuiz(id: number): Promise<void> {
    try {
      await apiClient.delete(`${this.endpoint}/${id}`);
    } catch (error) {
      console.error(`Error deleting quiz ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get quiz statistics
   */
  async getQuizStats(id: number): Promise<QuizStats> {
    try {
      const response = await apiClient.get<ApiResponse<QuizStats>>(`${this.endpoint}/${id}/stats`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching quiz stats for ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get quizzes by category
   */
  async getQuizzesByCategory(categoryId: number): Promise<Quiz[]> {
    try {
      const response = await apiClient.get<ApiResponse<Quiz[]>>(`${this.endpoint}?categoryId=${categoryId}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching quizzes for category ${categoryId}:`, error);
      throw error;
    }
  }

  /**
   * Get quizzes by difficulty
   */
  async getQuizzesByDifficulty(difficulty: 'EASY' | 'MEDIUM' | 'HARD'): Promise<Quiz[]> {
    try {
      const response = await apiClient.get<ApiResponse<Quiz[]>>(`${this.endpoint}?difficulty=${difficulty}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching ${difficulty} quizzes:`, error);
      throw error;
    }
  }

  /**
   * Assign questions to a quiz
   */
  async assignQuestionsToQuiz(quizId: number, questionIds: number[]): Promise<any> {
    try {
      const response = await apiClient.post<ApiResponse<any>>(
        `${this.endpoint}/${quizId}/questions`,
        { questionIds }
      );
      return response.data.data;
    } catch (error) {
      console.error(`Error assigning questions to quiz ${quizId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const quizService = new QuizService();
