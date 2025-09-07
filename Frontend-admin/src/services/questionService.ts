import { apiClient } from './api';
import type { ApiResponse } from './api';
import type { Question, CreateQuestionDto, UpdateQuestionDto } from '../types/api';

/**
 * Question Service - Handles all Question CRUD operations
 */
export class QuestionService {
  private readonly endpoint = '/questions';

  /**
   * Get questions by quiz ID
   */
  async getQuestionsByQuizId(quizId: number): Promise<Question[]> {
    try {
      const response = await apiClient.get<ApiResponse<Question[]>>(`${this.endpoint}/quiz/${quizId}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching questions for quiz ${quizId}:`, error);
      throw error;
    }
  }

  /**
   * Get question by ID
   */
  async getQuestionById(id: number): Promise<Question> {
    try {
      const response = await apiClient.get<ApiResponse<Question>>(`${this.endpoint}/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching question ${id}:`, error);
      throw error;
    }
  }

  /**
   * Add question to quiz
   */
  async addQuestionToQuiz(quizId: number, questionData: CreateQuestionDto): Promise<Question> {
    try {
      const response = await apiClient.post<ApiResponse<Question>>(`${this.endpoint}/quiz/${quizId}`, questionData);
      return response.data.data;
    } catch (error) {
      console.error(`Error adding question to quiz ${quizId}:`, error);
      throw error;
    }
  }

  /**
   * Update existing question
   */
  async updateQuestion(id: number, questionData: UpdateQuestionDto): Promise<Question> {
    try {
      const response = await apiClient.put<ApiResponse<Question>>(`${this.endpoint}/${id}`, questionData);
      return response.data.data;
    } catch (error) {
      console.error(`Error updating question ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete question
   */
  async deleteQuestion(id: number): Promise<void> {
    try {
      await apiClient.delete(`${this.endpoint}/${id}`);
    } catch (error) {
      console.error(`Error deleting question ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get question statistics for a quiz
   */
  async getQuestionStats(quizId: number): Promise<any> {
    try {
      const response = await apiClient.get<ApiResponse<any>>(`${this.endpoint}/quiz/${quizId}/stats`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching question stats for quiz ${quizId}:`, error);
      throw error;
    }
  }

  /**
   * Bulk create questions for a quiz
   */
  async bulkCreateQuestions(quizId: number, questions: CreateQuestionDto[]): Promise<Question[]> {
    try {
      const createdQuestions: Question[] = [];
      
      for (const questionData of questions) {
        const question = await this.addQuestionToQuiz(quizId, questionData);
        createdQuestions.push(question);
      }
      
      return createdQuestions;
    } catch (error) {
      console.error(`Error bulk creating questions for quiz ${quizId}:`, error);
      throw error;
    }
  }

  /**
   * Validate question data before submission
   */
  validateQuestionData(questionData: CreateQuestionDto): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!questionData.questionText || questionData.questionText.trim().length === 0) {
      errors.push('Question text is required');
    }

    if (!questionData.options || questionData.options.length < 2) {
      errors.push('At least 2 options are required');
    }

    if (questionData.options && questionData.options.length > 4) {
      errors.push('Maximum 4 options are allowed');
    }

    if (questionData.options) {
      const correctAnswers = questionData.options.filter(option => option.isCorrect);
      if (correctAnswers.length === 0) {
        errors.push('At least one option must be marked as correct');
      }

      const emptyOptions = questionData.options.filter(option => !option.optionText || option.optionText.trim().length === 0);
      if (emptyOptions.length > 0) {
        errors.push('All options must have text');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const questionService = new QuestionService();
