// Dynamic API configuration that works for local, network, and tunnel access
const getApiBaseUrl = (): string => {
  const { protocol, hostname } = window.location;
  
  // Check if we're running through Tunnelmole
  if (hostname.includes('tunnelmole.net')) {
    return `${protocol}//${hostname}/api`;
  }
  
  // Check if we're running through LocalTunnel (legacy support)
  if (hostname.includes('loca.lt')) {
    return `${protocol}//${hostname}/api`;
  }
  
  // If accessing from localhost, use localhost for backend
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8090/api';
  }
  
  // For network access, use the same hostname but different port
  return `${protocol}//${hostname}:8090/api`;
};

const getWebSocketUrl = (): string => {
  const { protocol, hostname } = window.location;
  
  // Check if we're running through Tunnelmole
  if (hostname.includes('tunnelmole.net')) {
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${hostname}/socket.io`;
  }
  
  // Check if we're running through LocalTunnel (legacy support)
  if (hostname.includes('loca.lt')) {
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${hostname}/socket.io`;
  }
  
  // If accessing from localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'ws://localhost:8090/socket.io';
  }
  
  // For network access
  return `ws://${hostname}:8090/socket.io`;
};

export const API_BASE_URL = getApiBaseUrl();
export const WEBSOCKET_URL = getWebSocketUrl();

// Log the URLs being used (for debugging)
console.log('🌐 API Base URL:', API_BASE_URL);
console.log('🔌 WebSocket URL:', WEBSOCKET_URL);

// API client for making HTTP requests
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies for authentication
});

// Add auth token to requests if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Export types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  response?: {
    data?: {
      error?: string;
      message?: string;
    };
    status?: number;
  };
  message?: string;
}

export default API_BASE_URL;
