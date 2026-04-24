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

// Prevent refresh token loop: track if we're already refreshing
let isRefreshing = false;
let refreshPromise = null;

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

// Response interceptor — handle 401 with automatic token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 responses with automatic token refresh
    if (error.response?.status === 401 && originalRequest) {
      // Prevent refresh loop: don't try to refresh if we're already refreshing the /refresh endpoint
      if (originalRequest.url.includes('/auth/refresh') || originalRequest.url.includes('/auth/logout')) {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      // If we're already refreshing, wait for the refresh to complete, then retry
      if (isRefreshing) {
        return refreshPromise.then(
          (newToken) => {
            // Update the original request with new token
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return apiClient(originalRequest);
          },
          () => {
            // Refresh failed, reject original request
            useAuthStore.getState().logout();
            return Promise.reject(error);
          },
        );
      }

      // Mark that we're refreshing and create refresh promise
      isRefreshing = true;
      refreshPromise = new Promise(async (resolve, reject) => {
        try {
          // Attempt to refresh token
          const refreshResponse = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            {},
            {
              withCredentials: true, // Send httpOnly cookies
              timeout: apiTimeoutMs,
            },
          );

          if (refreshResponse.data?.success && refreshResponse.data?.data?.token) {
            const newToken = refreshResponse.data.data.token;
            // Update localStorage with new token
            localStorage.setItem('token', newToken);
            // Update Zustand store
            useAuthStore.setState({ token: newToken });
            // Resolve with new token
            resolve(newToken);
          } else {
            reject(new Error('Invalid refresh response'));
          }
        } catch (refreshError) {
          // Refresh failed, logout user
          try {
            await useAuthStore.getState().logout();
          } catch (logoutError) {
            console.warn('Logout during refresh error failed:', logoutError?.message);
          }
          reject(refreshError);
        } finally {
          // Reset refresh state
          isRefreshing = false;
          refreshPromise = null;
        }
      });

      return refreshPromise.then(
        (newToken) => {
          // Update original request with new token and retry
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return apiClient(originalRequest);
        },
        () => {
          // Refresh failed, reject original request
          return Promise.reject(error);
        },
      );
    }

    return Promise.reject(error);
  },
);

export default apiClient;
