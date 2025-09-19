import { useState, useEffect, useCallback } from 'react';
import { categoryService } from '@/services/categoryService';
import type { Category, CreateCategoryDto, UpdateCategoryDto } from '@/types/api';

export interface UseCategoriesOptions {
  includeChildren?: boolean;
  depth?: number;
  autoFetch?: boolean;
}

export interface UseCategoriesReturn {
  categories: Category[];
  loading: boolean;
  error: string | null;
  pagination: any;
  
  // Actions
  fetchCategories: (params?: any) => Promise<void>;
  createCategory: (data: CreateCategoryDto) => Promise<Category>;
  updateCategory: (id: number, data: UpdateCategoryDto) => Promise<Category>;
  deleteCategory: (id: number) => Promise<void>;
  getCategoryById: (id: number, includeChildren?: boolean, depth?: number) => Promise<Category>;
  getCategoryHierarchy: (maxDepth?: number) => Promise<Category[]>;
  searchCategories: (query: string, options?: any) => Promise<Category[]>;
  
  // Utility
  refreshCategories: () => Promise<void>;
  clearError: () => void;
}

export function useCategories(options: UseCategoriesOptions = {}): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<any>(null);

  const { includeChildren = false, depth = 1, autoFetch = true } = options;

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchCategories = useCallback(async (params?: any) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await categoryService.getAllCategories({
        includeChildren,
        depth,
        ...params
      });
      
      setCategories(result.categories);
      setPagination(result.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch categories';
      setError(errorMessage);
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  }, [includeChildren, depth]);

  const createCategory = useCallback(async (data: CreateCategoryDto): Promise<Category> => {
    try {
      setError(null);
      const newCategory = await categoryService.createCategory(data);
      
      // Refresh categories after creation
      await fetchCategories();
      
      return newCategory;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create category';
      setError(errorMessage);
      throw err;
    }
  }, [fetchCategories]);

  const updateCategory = useCallback(async (id: number, data: UpdateCategoryDto): Promise<Category> => {
    try {
      setError(null);
      const updatedCategory = await categoryService.updateCategory(id, data);
      
      // Update the category in the local state
      setCategories(prev => prev.map(cat => 
        cat.id === id ? updatedCategory : cat
      ));
      
      return updatedCategory;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update category';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const deleteCategory = useCallback(async (id: number): Promise<void> => {
    try {
      setError(null);
      await categoryService.deleteCategory(id);
      
      // Remove the category from local state
      setCategories(prev => prev.filter(cat => cat.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete category';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getCategoryById = useCallback(async (
    id: number, 
    includeChildren = false, 
    depth = 1
  ): Promise<Category> => {
    try {
      setError(null);
      return await categoryService.getCategoryById(id, includeChildren, depth);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch category';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getCategoryHierarchy = useCallback(async (maxDepth = 5): Promise<Category[]> => {
    try {
      setLoading(true);
      setError(null);
      const hierarchy = await categoryService.getCategoryHierarchy(maxDepth);
      console.log('🔍 Hierarchy received in hook:', hierarchy);
      setCategories(hierarchy);
      return hierarchy;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch category hierarchy';
      setError(errorMessage);
      console.error('❌ Error in getCategoryHierarchy:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchCategories = useCallback(async (query: string, options: any = {}): Promise<Category[]> => {
    try {
      setLoading(true);
      setError(null);
      const results = await categoryService.searchCategories({
        q: query,
        ...options
      });
      setCategories(results);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search categories';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshCategories = useCallback(async () => {
    await fetchCategories();
  }, [fetchCategories]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchCategories();
    }
  }, [autoFetch, fetchCategories]);

  return {
    categories,
    loading,
    error,
    pagination,
    
    // Actions
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    getCategoryHierarchy,
    searchCategories,
    
    // Utility
    refreshCategories,
    clearError,
  };
}
