import axios from 'axios';

// Base API configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth tokens
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token from localStorage
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Handle unauthorized access - clear token and redirect to login
      localStorage.removeItem('authToken');
      console.error('Unauthorized access - token cleared');
      // You can add redirect logic here if needed
    } else if (error.response?.status === 500) {
      // Handle server errors
      console.error('Server error:', error.response?.data?.message || 'Internal server error');
    }
    return Promise.reject(error);
  }
);

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  total?: number;
  count?: number;
}

export interface ApiError {
  success: false;
  error: string;
  message: string;
}
