// Dynamic API configuration that works for local, network, and Cloudflare tunnel access
const getApiBaseUrl = (): string => {
  const { protocol, hostname } = window.location;
  
  // Check if we're running through Cloudflare tunnel
  if (hostname.includes('quizdash.dpdns.org')) {
    return 'https://api.quizdash.dpdns.org/api';
  }
  
  // Check if we're running through Tunnelmole (legacy support)
  if (hostname.includes('tunnelmole.net')) {
    return `${protocol}//${hostname}/api`;
  }
  
  // Check if we're running through LocalTunnel (legacy support)
  if (hostname.includes('loca.lt')) {
    return `${protocol}//${hostname}/api`;
  }
  
  // If accessing from localhost, use nginx load balancer
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:8090/api';
  }
  
  // For network access (LAN), use nginx load balancer port
  if (hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
    return `${protocol}//${hostname}:8090/api`;
  }
  
  // Default: use current hostname with nginx port
  return `${protocol}//${hostname}:8090/api`;
};

const getWebSocketUrl = (): string => {
  // FIXED VERSION: ALWAYS USE LOCALHOST FOR WEBSOCKET IN DEVELOPMENT
  if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
    console.log('🔌 Using local WebSocket: ws://localhost:3001');
    return 'ws://localhost:3001';
  }
  
  const { protocol, hostname } = window.location;
  
  // Check if we're running through Cloudflare tunnel
  if (hostname.includes('quizdash.dpdns.org')) {
    return 'wss://match.quizdash.dpdns.org';
  }
  
  // Check if we're running through Tunnelmole (legacy support)
  if (hostname.includes('tunnelmole.net')) {
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${hostname}/socket.io`;
  }
  
  // Check if we're running through LocalTunnel (legacy support)
  if (hostname.includes('loca.lt')) {
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${hostname}/socket.io`;
  }
  
  // For network access
  return `ws://${hostname}:3001`;
};

export const API_BASE_URL = getApiBaseUrl();
export const WEBSOCKET_URL = getWebSocketUrl();

// Log the URLs being used (for debugging)
console.log('🌐 API Base URL:', API_BASE_URL);
console.log('🔌 WebSocket URL:', WEBSOCKET_URL);

// API client for making HTTP requests
import axios from 'axios';
import { toast } from '../lib/toast';

const getApiErrorMessage = (error: any): string => {
  const dataMessage = error?.response?.data?.message;
  if (typeof dataMessage === 'string' && dataMessage.length > 0) return dataMessage;

  const dataError = error?.response?.data?.error;
  if (typeof dataError === 'string' && dataError.length > 0) return dataError;

  const status = error?.response?.status;
  if (status === 0 || status === undefined) {
    return 'Network error. Please check your connection and try again.';
  }
  if (status >= 500) return 'Server error. Please try again in a moment.';
  if (status === 404) return 'Requested resource was not found.';
  if (status === 403) return 'You do not have permission to perform this action.';

  const fallback = error?.message;
  if (typeof fallback === 'string' && fallback.length > 0) return fallback;
  return 'Request failed. Please try again.';
};

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
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 Auth token found and added to request:', config.url);
    } else {
      console.warn('⚠️ No auth token found in localStorage for request:', config.url);
      console.warn('📋 Available localStorage keys:', Object.keys(localStorage));
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
    const friendlyMessage = getApiErrorMessage(error);

    if (error.response?.status === 401) {
      // Unauthorized - clear all auth data and redirect to login
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('quizmaster_user');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('userId');
      
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login';
      }
    }

    if (error && typeof error === 'object') {
      (error as any).friendlyMessage = friendlyMessage;
    }

    const shouldToast = !(error?.config as any)?.skipErrorToast;
    const isAuthRedirect = error.response?.status === 401;
    if (shouldToast && !isAuthRedirect) {
      toast({
        title: 'Error',
        description: friendlyMessage,
        variant: 'destructive',
      });
    }

    return Promise.reject(error);
  }
);

// Export types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  pagination?: any;
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
