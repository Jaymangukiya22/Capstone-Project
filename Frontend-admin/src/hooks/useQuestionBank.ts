import { useState, useEffect, useCallback } from 'react';
import { questionBankService } from '@/services/questionBankService';
import type { 
  QuestionBankItem, 
  CreateQuestionBankDto, 
  UpdateQuestionBankDto,
  ExcelUploadResult 
} from '@/services/questionBankService';

export interface UseQuestionBankOptions {
  categoryId?: number;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  autoFetch?: boolean;
}

export interface UseQuestionBankReturn {
  questions: QuestionBankItem[];
  loading: boolean;
  error: string | null;
  pagination: any;
  
  // Actions
  fetchQuestions: (params?: any) => Promise<void>;
  createQuestion: (data: CreateQuestionBankDto) => Promise<QuestionBankItem>;
  updateQuestion: (id: number, data: UpdateQuestionBankDto) => Promise<QuestionBankItem>;
  deleteQuestion: (id: number) => Promise<void>;
  searchQuestions: (query: string, options?: any) => Promise<QuestionBankItem[]>;
  getQuestionsByCategory: (categoryId: number) => Promise<QuestionBankItem[]>;
  
  // Excel operations
  downloadTemplate: () => Promise<Blob>;
  uploadExcel: (file: File, categoryId: number, includeSubcategories?: boolean, subcategoryDepth?: number) => Promise<ExcelUploadResult>;
  
  // Utility
  refreshQuestions: () => Promise<void>;
  clearError: () => void;
  validateQuestion: (data: CreateQuestionBankDto) => { isValid: boolean; errors: string[] };
}

export function useQuestionBank(options: UseQuestionBankOptions = {}): UseQuestionBankReturn {
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<any>(null);

  const { categoryId, difficulty, autoFetch = true } = options;

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchQuestions = useCallback(async (params?: any) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await questionBankService.getAllQuestions({
        categoryId,
        difficulty,
        ...params
      });
      
      setQuestions(result.questions);
      setPagination(result.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch questions';
      setError(errorMessage);
      console.error('Error fetching questions:', err);
    } finally {
      setLoading(false);
    }
  }, [categoryId, difficulty]);

  const createQuestion = useCallback(async (data: CreateQuestionBankDto): Promise<QuestionBankItem> => {
    try {
      setError(null);
      
      // Validate question data
      const validation = questionBankService.validateQuestionData(data);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }
      
      const newQuestion = await questionBankService.createQuestion(data);
      
      // Add to local state
      setQuestions(prev => [newQuestion, ...prev]);
      
      return newQuestion;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create question';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const updateQuestion = useCallback(async (id: number, data: UpdateQuestionBankDto): Promise<QuestionBankItem> => {
    try {
      setError(null);
      const updatedQuestion = await questionBankService.updateQuestion(id, data);
      
      // Update in local state
      setQuestions(prev => prev.map(q => 
        q.id === id ? updatedQuestion : q
      ));
      
      return updatedQuestion;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update question';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const deleteQuestion = useCallback(async (id: number): Promise<void> => {
    try {
      setError(null);
      await questionBankService.deleteQuestion(id);
      
      // Remove from local state
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete question';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const searchQuestions = useCallback(async (query: string, options: any = {}): Promise<QuestionBankItem[]> => {
    try {
      setLoading(true);
      setError(null);
      const result = await questionBankService.searchQuestions({
        q: query,
        ...options
      });
      setQuestions(result.questions);
      setPagination(result.pagination);
      return result.questions;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search questions';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getQuestionsByCategory = useCallback(async (categoryId: number): Promise<QuestionBankItem[]> => {
    try {
      setLoading(true);
      setError(null);
      const categoryQuestions = await questionBankService.getQuestionsByCategory(categoryId);
      setQuestions(categoryQuestions);
      return categoryQuestions;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch questions by category';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadTemplate = useCallback(async (): Promise<Blob> => {
    try {
      setError(null);
      return await questionBankService.downloadTemplate();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download template';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const uploadExcel = useCallback(async (
    file: File,
    categoryId: number,
    includeSubcategories = false,
    subcategoryDepth = 10
  ): Promise<ExcelUploadResult> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await questionBankService.uploadExcel(
        file,
        categoryId,
        includeSubcategories,
        subcategoryDepth
      );
      
      // Refresh questions after upload
      await fetchQuestions();
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload Excel file';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchQuestions]);

  const refreshQuestions = useCallback(async () => {
    await fetchQuestions();
  }, [fetchQuestions]);

  const validateQuestion = useCallback((data: CreateQuestionBankDto) => {
    return questionBankService.validateQuestionData(data);
  }, []);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchQuestions();
    }
  }, [autoFetch, fetchQuestions]);

  return {
    questions,
    loading,
    error,
    pagination,
    
    // Actions
    fetchQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    searchQuestions,
    getQuestionsByCategory,
    
    // Excel operations
    downloadTemplate,
    uploadExcel,
    
    // Utility
    refreshQuestions,
    clearError,
    validateQuestion,
  };
}
