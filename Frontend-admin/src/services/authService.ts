import { apiClient } from './api';
import type { ApiResponse } from './api';

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: 'ADMIN' | 'PLAYER';
}

export interface AuthData {
  user: User;
  token: string;
  refreshToken: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  eloRating?: number;
  totalMatches?: number;
  wins?: number;
  losses?: number;
  createdAt?: string;
  lastLoginAt?: string;
}

/**
 * Authentication Service - Handles user authentication
 */
export class AuthService {
  private readonly endpoint = '/auth';

  /**
   * Login user
   */
  async login(credentials: LoginRequest): Promise<AuthData> {
    try {
      const response = await apiClient.post<ApiResponse<AuthData>>(`${this.endpoint}/login`, credentials);
      
      if (!response.data || !response.data.data) {
        throw new Error('Invalid response from server');
      }
      
      const authData = response.data.data;
      
      // Store token and user data in localStorage
      if (authData.token) {
        localStorage.setItem('authToken', authData.token);
        localStorage.setItem('refreshToken', authData.refreshToken);
        
        const userJson = JSON.stringify(authData.user);
        
        // Store in multiple keys to ensure persistence
        localStorage.setItem('user', userJson);
        localStorage.setItem('quizmaster_user', userJson);
        localStorage.setItem('currentUser', userJson);
        localStorage.setItem('userId', authData.user.id.toString());
      }
      
      return authData;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Register new user
   */
  async register(userData: RegisterRequest): Promise<AuthData> {
    try {
      const response = await apiClient.post<ApiResponse<AuthData>>(`${this.endpoint}/register`, userData);
      
      // Store token and user data in localStorage
      if (response.data.data.token) {
        localStorage.setItem('authToken', response.data.data.token);
        localStorage.setItem('refreshToken', response.data.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }
      
      return response.data.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<User> {
    try {
      const response = await apiClient.get<User>(`${this.endpoint}/profile`);
      return response.data;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('quizmaster_user');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userId');
  }

  /**
   * Check if user is authenticated (has both token AND user data)
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getCurrentUser();
    return !!token && !!user;
  }

  /**
   * Get current user from localStorage
   */
  getCurrentUser(): User | null {
    // Try multiple keys - check user first
    let userStr = localStorage.getItem('user');
    
    if (!userStr) {
      // Only log and try other keys if user key is empty
      userStr = localStorage.getItem('quizmaster_user');
      
      if (!userStr) {
        userStr = localStorage.getItem('currentUser');
      }
    }
    
    if (userStr) {
      try {
        const parsedUser = JSON.parse(userStr);
        return parsedUser;
      } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
      }
    }
    
    return null;
  }

  /**
   * Get auth token
   */
  getToken(): string | null {
    return localStorage.getItem('authToken');
  }
}

// Export singleton instance
export const authService = new AuthService();
