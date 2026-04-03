import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { getPublicApiOrigin } from '../utils/publicOrigin';

const API_BASE_URL = `${getPublicApiOrigin()}/api`;
const parsedTimeoutMs = parseInt(process.env.REACT_APP_API_TIMEOUT_MS, 10);
const apiTimeoutMs = Number.isFinite(parsedTimeoutMs) && parsedTimeoutMs > 0 ? parsedTimeoutMs : 60000;

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: apiTimeoutMs,
  withCredentials: true, // Send httpOnly cookies automatically
});

// Request interceptor — attach token from localStorage if available
apiClient.interceptors.request.use((config) => {
  // Let the browser/axios set multipart boundaries for FormData requests.
  if (config.data instanceof FormData && config.headers) {
    delete config.headers['Content-Type'];
  } else if (config.headers && !config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }

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
