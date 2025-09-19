import { useState, useEffect, useCallback } from 'react';
import { quizService } from '@/services/quizService';
import type { Quiz, CreateQuizDto, UpdateQuizDto } from '@/types/api';

export interface UseQuizzesOptions {
  categoryId?: number;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  autoFetch?: boolean;
}

export interface UseQuizzesReturn {
  quizzes: Quiz[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchQuizzes: (filters?: any) => Promise<void>;
  createQuiz: (data: CreateQuizDto) => Promise<Quiz>;
  updateQuiz: (id: number, data: UpdateQuizDto) => Promise<Quiz>;
  deleteQuiz: (id: number) => Promise<void>;
  getQuizById: (id: number) => Promise<Quiz>;
  getQuizzesByCategory: (categoryId: number) => Promise<Quiz[]>;
  
  // Utility
  refreshQuizzes: () => Promise<void>;
  clearError: () => void;
}

export function useQuizzes(options: UseQuizzesOptions = {}): UseQuizzesReturn {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { categoryId, difficulty, autoFetch = true } = options;

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchQuizzes = useCallback(async (filters?: any) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await quizService.getAllQuizzes({
        categoryId,
        difficulty,
        limit: 1000, // Set high limit to get all quizzes
        ...filters
      });
      
      // Ensure we have a valid array
      const quizzesArray = Array.isArray(result.quizzes) ? result.quizzes : [];
      console.log('🎯 Quizzes received in hook:', result);
      console.log('🎯 Processed quizzes array:', quizzesArray);
      setQuizzes(quizzesArray);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch quizzes';
      setError(errorMessage);
      console.error('Error fetching quizzes:', err);
    } finally {
      setLoading(false);
    }
  }, [categoryId, difficulty]);

  const createQuiz = useCallback(async (data: CreateQuizDto): Promise<Quiz> => {
    try {
      setError(null);
      const newQuiz = await quizService.createQuiz(data);
      
      // Add to local state
      setQuizzes(prev => [newQuiz, ...prev]);
      
      return newQuiz;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create quiz';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const updateQuiz = useCallback(async (id: number, data: UpdateQuizDto): Promise<Quiz> => {
    try {
      setError(null);
      const updatedQuiz = await quizService.updateQuiz(id, data);
      
      // Update in local state
      setQuizzes(prev => prev.map(q => 
        q.id === id ? updatedQuiz : q
      ));
      
      return updatedQuiz;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update quiz';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const deleteQuiz = useCallback(async (id: number): Promise<void> => {
    try {
      setError(null);
      await quizService.deleteQuiz(id);
      
      // Remove from local state
      setQuizzes(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete quiz';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getQuizById = useCallback(async (id: number): Promise<Quiz> => {
    try {
      setError(null);
      return await quizService.getQuizById(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch quiz';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getQuizzesByCategory = useCallback(async (categoryId: number): Promise<Quiz[]> => {
    try {
      setLoading(true);
      setError(null);
      const categoryQuizzes = await quizService.getQuizzesByCategory(categoryId);
      setQuizzes(categoryQuizzes);
      return categoryQuizzes;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch quizzes by category';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshQuizzes = useCallback(async () => {
    await fetchQuizzes();
  }, [fetchQuizzes]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchQuizzes();
    }
  }, [autoFetch, fetchQuizzes]);

  return {
    quizzes,
    loading,
    error,
    
    // Actions
    fetchQuizzes,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    getQuizById,
    getQuizzesByCategory,
    
    // Utility
    refreshQuizzes,
    clearError,
  };
}
