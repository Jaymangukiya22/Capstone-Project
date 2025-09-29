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
      
      console.log('🔍 Login API Response:', response.data);
      console.log('🔍 User Data from API:', response.data.data.user);
      
      // Store token and user data in localStorage
      if (response.data.data.token) {
        localStorage.setItem('authToken', response.data.data.token);
        localStorage.setItem('refreshToken', response.data.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        
        console.log('✅ User data stored in localStorage:', JSON.stringify(response.data.data.user));
      }
      
      return response.data.data;
    } catch (error) {
      console.error('Login error:', error);
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
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem('authToken');
    return !!token;
  }

  /**
   * Get current user from localStorage
   */
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    console.log('🔍 Raw user string from localStorage:', userStr);
    
    if (userStr) {
      try {
        const parsedUser = JSON.parse(userStr);
        console.log('🔍 Parsed user data:', parsedUser);
        return parsedUser;
      } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
      }
    }
    console.log('❌ No user data found in localStorage');
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
