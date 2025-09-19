import { apiClient } from './api';
import type { ApiResponse } from './api';
import type { Category, CreateCategoryDto, UpdateCategoryDto } from '../types/api';

/**
 * Category Service - Handles all Category CRUD operations
 */
export class CategoryService {
  private readonly endpoint = '/categories';

  /**
   * Get all categories with pagination and filtering
   */
  async getAllCategories(params?: {
    page?: number;
    limit?: number;
    parentId?: number | null;
    includeChildren?: boolean;
    depth?: number;
    isActive?: boolean;
    search?: string;
  }): Promise<{ categories: Category[]; pagination?: any }> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.parentId !== undefined) {
        queryParams.append('parentId', params.parentId === null ? 'null' : params.parentId.toString());
      }
      if (params?.includeChildren) queryParams.append('includeChildren', 'true');
      if (params?.depth) queryParams.append('depth', params.depth.toString());
      if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
      if (params?.search) queryParams.append('search', params.search);

      const url = queryParams.toString() ? `${this.endpoint}?${queryParams}` : this.endpoint;
      const response = await apiClient.get<ApiResponse<Category[]>>(url);
      
      return {
        categories: response.data.data,
        pagination: response.data.pagination
      };
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: number, includeChildren = false, depth = 1): Promise<Category> {
    try {
      const queryParams = new URLSearchParams();
      if (includeChildren) queryParams.append('includeChildren', 'true');
      if (depth > 1) queryParams.append('depth', depth.toString());
      
      const url = queryParams.toString() ? `${this.endpoint}/${id}?${queryParams}` : `${this.endpoint}/${id}`;
      const response = await apiClient.get<ApiResponse<Category>>(url);
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
  async getCategoryHierarchy(maxDepth = 5): Promise<Category[]> {
    try {
      const response = await apiClient.get<ApiResponse<Category[]>>(`${this.endpoint}?hierarchy=true&depth=${maxDepth}&limit=1000`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching category hierarchy:', error);
      throw error;
    }
  }

  /**
   * Get subcategories for a parent category
   */
  async getSubcategories(parentId: number, depth = 1): Promise<Category[]> {
    try {
      const response = await apiClient.get<ApiResponse<Category[]>>(`${this.endpoint}/${parentId}/subcategories?depth=${depth}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching subcategories for parent ${parentId}:`, error);
      throw error;
    }
  }

  /**
   * Get category path (breadcrumb)
   */
  async getCategoryPath(id: number): Promise<Category[]> {
    try {
      const response = await apiClient.get<ApiResponse<Category[]>>(`${this.endpoint}/${id}/path`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching category path for ${id}:`, error);
      throw error;
    }
  }

  /**
   * Search categories
   */
  async searchCategories(params: {
    q: string;
    isActive?: boolean;
    includeChildren?: boolean;
    depth?: number;
  }): Promise<Category[]> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('q', params.q);
      if (params.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
      if (params.includeChildren) queryParams.append('includeChildren', 'true');
      if (params.depth) queryParams.append('depth', params.depth.toString());

      const response = await apiClient.get<ApiResponse<Category[]>>(`${this.endpoint}/search?${queryParams}`);
      return response.data.data;
    } catch (error) {
      console.error('Error searching categories:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const categoryService = new CategoryService();
