import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const API_BASE_URL = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/api`
  : 'http://localhost:5000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true, // Send httpOnly cookies automatically
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach token from localStorage if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && token !== 'authenticated_via_cookie') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }
    return Promise.reject(error);
  },
);

export default apiClient;
