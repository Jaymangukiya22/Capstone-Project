import { apiClient } from './api';
import type { ApiResponse } from './api';

// Question Bank Types
export interface QuestionBankItem {
  id: number;
  questionText: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  categoryId: number;
  createdById: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  options: QuestionBankOption[];
  category?: {
    id: number;
    name: string;
  };
}

export interface QuestionBankOption {
  id: number;
  questionId: number;
  optionText: string;
  isCorrect: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuestionBankDto {
  questionText: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  categoryId: number;
  options: {
    optionText: string;
    isCorrect: boolean;
  }[];
}

export interface UpdateQuestionBankDto {
  questionText?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  categoryId?: number;
  options?: {
    optionText: string;
    isCorrect: boolean;
  }[];
}

export interface ExcelUploadResult {
  summary: {
    totalRows: number;
    successfulImports: number;
    failedImports: number;
    categoryDistribution: { [categoryName: string]: number };
  };
  errors: string[];
  importedQuestions: QuestionBankItem[];
}

/**
 * Question Bank Service - Handles all Question Bank CRUD operations
 */
export class QuestionBankService {
  private readonly endpoint = '/question-bank';

  /**
   * Get all questions with pagination and filtering
   */
  async getAllQuestions(params?: {
    page?: number;
    limit?: number;
    categoryId?: number;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    isActive?: boolean;
    search?: string;
  }): Promise<{ questions: QuestionBankItem[]; pagination?: any }> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.categoryId) queryParams.append('categoryId', params.categoryId.toString());
      if (params?.difficulty) queryParams.append('difficulty', params.difficulty);
      if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
      if (params?.search) queryParams.append('search', params.search);

      const url = queryParams.toString() ? `${this.endpoint}?${queryParams}` : this.endpoint;
      const response = await apiClient.get<ApiResponse<any>>(url);
      
      console.log('📦 Raw API response for getAllQuestions:', response.data);
      
      // Handle different response structures
      if (response.data.data && response.data.data.questions) {
        // Structure: { data: { questions: [...], pagination: {...} } }
        return {
          questions: response.data.data.questions || [],
          pagination: response.data.data.pagination
        };
      } else if (response.data.data && Array.isArray(response.data.data)) {
        // Structure: { data: [...] }
        return {
          questions: response.data.data || [],
          pagination: (response.data as any).pagination
        };
      } else {
        // Fallback
        console.warn('⚠️ Unexpected response structure in getAllQuestions:', response.data);
        return {
          questions: [],
          pagination: null
        };
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      throw error;
    }
  }

  /**
   * Get question by ID
   */
  async getQuestionById(id: number): Promise<QuestionBankItem> {
    try {
      const response = await apiClient.get<ApiResponse<any>>(`${this.endpoint}/${id}`);
      // Backend returns data: { question: {...} }
      return response.data.data.question || response.data.data;
    } catch (error) {
      console.error(`Error fetching question ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create new question
   */
  async createQuestion(questionData: CreateQuestionBankDto): Promise<QuestionBankItem> {
    try {
      console.log('🔄 Creating question with data:', questionData);
      const response = await apiClient.post<ApiResponse<any>>(this.endpoint, questionData);
      console.log('✅ Question created successfully:', response.data);
      // Backend returns data: { question: {...} }
      return response.data.data.question || response.data.data;
    } catch (error) {
      console.error('❌ Error creating question:', error);
      throw error;
    }
  }

  /**
   * Update existing question
   */
  async updateQuestion(id: number, questionData: UpdateQuestionBankDto): Promise<QuestionBankItem> {
    try {
      console.log(`🔄 Updating question ${id} with data:`, questionData);
      const response = await apiClient.put<ApiResponse<any>>(`${this.endpoint}/${id}`, questionData);
      console.log(`✅ Question ${id} updated successfully:`, response.data);
      // Backend returns data: { question: {...} }
      return response.data.data.question || response.data.data;
    } catch (error) {
      console.error(`❌ Error updating question ${id}:`, error);
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
   * Search questions
   */
  async searchQuestions(params: {
    q: string;
    categoryId?: number;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    page?: number;
    limit?: number;
  }): Promise<{ questions: QuestionBankItem[]; pagination?: any }> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('q', params.q);
      if (params.categoryId) queryParams.append('categoryId', params.categoryId.toString());
      if (params.difficulty) queryParams.append('difficulty', params.difficulty);
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());

      const response = await apiClient.get<ApiResponse<any>>(`${this.endpoint}/search?${queryParams}`);
      
      // Handle nested response structure
      if (response.data.data && response.data.data.questions) {
        return {
          questions: response.data.data.questions || [],
          pagination: response.data.data.pagination
        };
      }
      
      return {
        questions: response.data.data || [],
        pagination: (response.data as any).pagination
      };
    } catch (error) {
      console.error('Error searching questions:', error);
      throw error;
    }
  }

  /**
   * Get questions by category
   */
  async getQuestionsByCategory(categoryId: number): Promise<QuestionBankItem[]> {
    try {
      const response = await apiClient.get<ApiResponse<{ questions: QuestionBankItem[]; pagination?: any }>>(`${this.endpoint}/category/${categoryId}?limit=1000`);
      console.log('🔍 API Response for category', categoryId, ':', response.data);
      
      // Handle the nested structure: response.data.data.questions
      if (response.data && response.data.data && response.data.data.questions) {
        console.log(`✅ Found ${response.data.data.questions.length} questions for category ${categoryId}`);
        return response.data.data.questions;
      }
      
      // Fallback for direct array
      if (Array.isArray(response.data.data)) {
        console.log(`✅ Found ${response.data.data.length} questions for category ${categoryId} (direct array)`);
        return response.data.data;
      }
      
      console.warn('⚠️ Unexpected API response structure:', response.data);
      console.warn('📊 No questions found for category', categoryId);
      return [];
    } catch (error: any) {
      console.error(`❌ Error fetching questions for category ${categoryId}:`, error);
      // Don't throw error, just return empty array so UI can show "no questions"
      if (error.response?.status === 404 || error.response?.status === 500) {
        console.log(`📭 Category ${categoryId} has no questions yet`);
        return [];
      }
      throw error;
    }
  }

  /**
   * Download Excel template
   */
  async downloadTemplate(): Promise<Blob> {
    try {
      const response = await apiClient.get(`${this.endpoint}/template`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading template:', error);
      throw error;
    }
  }

  /**
   * Upload Excel file with questions
   */
  async uploadExcel(
    file: File,
    categoryId: number,
    includeSubcategories = false,
    subcategoryDepth = 10
  ): Promise<ExcelUploadResult> {
    try {
      console.log('🔄 Uploading Excel file:', {
        fileName: file.name,
        fileSize: file.size,
        categoryId,
        includeSubcategories,
        subcategoryDepth
      });
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('categoryId', categoryId.toString());
      formData.append('includeSubcategories', includeSubcategories.toString());
      formData.append('subcategoryDepth', subcategoryDepth.toString());

      const response = await apiClient.post<ApiResponse<ExcelUploadResult>>(
        `${this.endpoint}/upload-excel`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log('✅ Excel upload successful:', response.data);
      return response.data.data as ExcelUploadResult;
    } catch (error) {
      console.error('❌ Error uploading Excel file:', error);
      throw error;
    }
  }

  /**
   * Bulk create questions
   */
  async bulkCreateQuestions(questions: CreateQuestionBankDto[]): Promise<QuestionBankItem[]> {
    try {
      const response = await apiClient.post<ApiResponse<QuestionBankItem[]>>(`${this.endpoint}/bulk`, {
        questions
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Error bulk creating questions:', error);
      throw error;
    }
  }

  /**
   * Validate question data before submission
   */
  validateQuestionData(questionData: CreateQuestionBankDto): { isValid: boolean; errors: string[] } {
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

    if (!questionData.categoryId) {
      errors.push('Category is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const questionBankService = new QuestionBankService();
