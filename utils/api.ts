/// <reference types="vite/client" />
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors
    if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
      console.error('Network error - is the server running?');
      return Promise.reject({
        ...error,
        message: 'Cannot connect to server. Please check if the backend is running.',
        isNetworkError: true
      });
    }
    
    // Handle 401 - Unauthorized
    if (error.response?.status === 401) {
      console.error('Unauthorized - token may be invalid or expired');
      // Optionally clear token and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    
    // Handle 403 - Forbidden
    if (error.response?.status === 403) {
      console.error('Forbidden - insufficient permissions');
    }
    
    // Handle 500 - Server errors
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response?.data);
    }
    
    return Promise.reject(error);
  }
);

export interface SignupData {
  name: string;
  email: string;
  password: string;
  role: 'patient' | 'doctor' | 'admin';
  mobile?: string;
  gender?: string;
}

export interface LoginData {
  email: string;
  password: string;
  role: 'patient' | 'doctor' | 'admin';
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    userId: string;
    email: string;
    name: string;
    role: string;
    token?: string;
    status?: string;
  };
}

export const authAPI = {
  signup: async (data: SignupData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/signup', data);
    if (response.data.success && response.data.data.token) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data));
    }
    return response.data;
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    if (response.data.success && response.data.data.token) {
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data));
    }
    return response.data;
  },

  getPendingDoctors: async () => {
    const response = await api.get('/auth/pending-doctors');
    return response.data;
  },

  approveDoctor: async (doctorId: string) => {
    const response = await api.post('/auth/approve-doctor', { doctorId });
    return response.data;
  },
};

export default api;















