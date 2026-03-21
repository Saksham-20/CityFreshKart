import { create } from 'zustand';
import api from '../services/api';

const useAuthStore = create((set, get) => ({
  // State
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  error: null,

  // Initialize auth from localStorage
  initialize: async () => {
    set({ loading: true });
    try {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');

      if (token && user) {
        try {
          set({ token, user: JSON.parse(user), isAuthenticated: true });
          const response = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!response.data.data) {
            throw new Error('Invalid token');
          }
        } catch (error) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          set({ token: null, user: null, isAuthenticated: false });
        }
      }
    } finally {
      set({ loading: false });
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
