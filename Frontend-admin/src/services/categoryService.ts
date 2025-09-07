import { apiClient } from './api';
import type { ApiResponse } from './api';
import type { Category, CreateCategoryDto, UpdateCategoryDto } from '../types/api';

/**
 * Category Service - Handles all Category CRUD operations
 */
export class CategoryService {
  private readonly endpoint = '/categories';

  /**
   * Get all categories
   */
  async getAllCategories(): Promise<Category[]> {
    try {
      const response = await apiClient.get<ApiResponse<Category[]>>(this.endpoint);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: number): Promise<Category> {
    try {
      const response = await apiClient.get<ApiResponse<Category>>(`${this.endpoint}/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching category ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create new category
   */
  async createCategory(categoryData: CreateCategoryDto): Promise<Category> {
    try {
      const response = await apiClient.post<ApiResponse<Category>>(this.endpoint, categoryData);
      return response.data.data;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  /**
   * Update existing category
   */
  async updateCategory(id: number, categoryData: UpdateCategoryDto): Promise<Category> {
    try {
      const response = await apiClient.put<ApiResponse<Category>>(`${this.endpoint}/${id}`, categoryData);
      return response.data.data;
    } catch (error) {
      console.error(`Error updating category ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete category
   */
  async deleteCategory(id: number): Promise<void> {
    try {
      await apiClient.delete(`${this.endpoint}/${id}`);
    } catch (error) {
      console.error(`Error deleting category ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get category hierarchy (root categories with children)
   */
  async getCategoryHierarchy(): Promise<Category[]> {
    try {
      const response = await apiClient.get<ApiResponse<Category[]>>(`${this.endpoint}?hierarchy=true`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching category hierarchy:', error);
      throw error;
    }
  }

  /**
   * Get subcategories for a parent category
   */
  async getSubcategories(parentId: number): Promise<Category[]> {
    try {
      const response = await apiClient.get<ApiResponse<Category[]>>(`${this.endpoint}?parentId=${parentId}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching subcategories for parent ${parentId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const categoryService = new CategoryService();
