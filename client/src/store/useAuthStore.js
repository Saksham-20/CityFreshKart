import { create } from 'zustand';
import api from '../services/api';

const useAuthStore = create((set, get) => ({
  // State
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  bootstrapping: true,
  error: null,

  // Initialize auth from localStorage
  initialize: async () => {
    set({ bootstrapping: true });
    try {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');

      if (token && user) {
        try {
          set({ token, user: JSON.parse(user), isAuthenticated: true });
          const response = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const meUser = response.data?.data?.user;
          if (!meUser) {
            throw new Error('Invalid token');
          }
          localStorage.setItem('user', JSON.stringify(meUser));
          set({ user: meUser, token, isAuthenticated: true });
        } catch (error) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          set({ token: null, user: null, isAuthenticated: false });
        }
      }
    } finally {
      set({ bootstrapping: false });
    }
  },

  refreshCurrentUser: async () => {
    try {
      const token = get().token || localStorage.getItem('token');
      if (!token) return { success: false };
      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = response.data?.data?.user;
      if (!user) return { success: false };
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, isAuthenticated: true });
      return { success: true, user };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || error.message };
    }
  },

  // Register with phone + password
  register: async (phone, password, name) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/auth/register', {
        phone,
        password,
        name: name || '',
      });

      if (response.data.success && response.data.data) {
        const { user, token } = response.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        set({
          user,
          token,
          isAuthenticated: true,
          loading: false,
          error: null,
        });
        return { success: true, user };
      }
      throw new Error(response.data.message || 'Registration failed');
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      set({ error: message, loading: false });
      return { success: false, message };
    }
  },

  // Login with phone + password
  login: async (phone, password) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/auth/login', {
        phone,
        password,
      });

      if (response.data.success && response.data.data) {
        const { user, token } = response.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        set({
          user,
          token,
          isAuthenticated: true,
          loading: false,
          error: null,
        });
        return { success: true, user };
      }
      throw new Error(response.data.message || 'Login failed');
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      set({ error: message, loading: false });
      return { success: false, message };
    }
  },

  loginWithGoogle: async (idToken) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/auth/google', { idToken });
      if (response.data.success && response.data.data) {
        const { user, token } = response.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        set({
          user,
          token,
          isAuthenticated: true,
          loading: false,
          error: null,
        });
        return { success: true, user };
      }
      throw new Error(response.data.message || 'Google login failed');
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      set({ error: message, loading: false });
      return { success: false, message };
    }
  },

  forgotPasswordStart: async (phone) => {
    set({ error: null });
    try {
      const response = await api.post('/auth/forgot-password/start', { phone });
      return {
        success: Boolean(response.data?.success),
        message: response.data?.message || 'Phone verified',
        data: response.data?.data || null,
      };
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      set({ error: message });
      return { success: false, message, errorCode: error.response?.data?.errorCode };
    }
  },

  forgotPasswordWithEmail: async (phone, email) => {
    set({ error: null });
    try {
      const response = await api.post('/auth/forgot-password/email', { phone, email });
      return {
        success: Boolean(response.data?.success),
        message: response.data?.message || 'OTP sent',
        data: response.data?.data || null,
      };
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      set({ error: message });
      return {
        success: false,
        message,
        retryAfterSeconds: error.response?.data?.retryAfterSeconds,
        errorCode: error.response?.data?.errorCode,
      };
    }
  },

  verifyResetOtp: async (phone, email, otp) => {
    set({ error: null });
    try {
      const response = await api.post('/auth/verify-reset-otp', { phone, email, otp });
      const resetToken = response.data?.data?.resetToken;
      if (!response.data?.success || !resetToken) {
        throw new Error(response.data?.message || 'OTP verification failed');
      }
      return { success: true, resetToken, message: response.data?.message || 'OTP verified' };
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      set({ error: message });
      return {
        success: false,
        message,
        attemptsRemaining: error.response?.data?.attemptsRemaining,
      };
    }
  },

  resetPasswordWithOtp: async (phone, email, resetToken, newPassword) => {
    set({ error: null });
    try {
      const response = await api.post('/auth/reset-password', {
        phone,
        email,
        resetToken,
        newPassword,
      });
      return {
        success: Boolean(response.data?.success),
        message: response.data?.message || 'Password reset successful',
      };
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      set({ error: message });
      return { success: false, message };
    }
  },

  linkGoogleAccount: async (idToken) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/auth/link/google', { idToken });
      const user = response.data?.data?.user;
      if (!response.data?.success || !user) {
        throw new Error(response.data?.message || 'Failed to link Google account');
      }
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, loading: false, error: null });
      return { success: true, user };
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      set({ error: message, loading: false });
      return { success: false, message };
    }
  },

  unlinkGoogleAccount: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.delete('/auth/link/google');
      const user = response.data?.data?.user;
      if (!response.data?.success || !user) {
        throw new Error(response.data?.message || 'Failed to unlink Google account');
      }
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, loading: false, error: null });
      return { success: true, user };
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      set({ error: message, loading: false });
      return { success: false, message };
    }
  },

  // Update user phone number (for Google users and checkout)
  updateUserPhone: async (phone) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put('/auth/phone', { phone });
      if (response.data.success && response.data.data?.user) {
        const user = response.data.data.user;
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, loading: false, error: null });
        return { success: true, user };
      }
      throw new Error(response.data?.message || 'Failed to update phone number');
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      set({ error: message, loading: false });
      return { success: false, message };
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  // Update user profile
  updateProfile: async (userData) => {
    set({ loading: true, error: null });
    try {
      const token = get().token;
      const response = await api.put('/users/profile', userData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const updatedUser = response.data.data;
        localStorage.setItem('user', JSON.stringify(updatedUser));
        set({ user: updatedUser, loading: false, error: null });
        return { success: true };
      }
      throw new Error(response.data.message || 'Update failed');
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      set({ error: message, loading: false });
      return { success: false, message };
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));

export { useAuthStore };
