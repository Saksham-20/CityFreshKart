import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

const AuthContext = createContext();

// Action types
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  REGISTER_START: 'REGISTER_START',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_FAILURE: 'REGISTER_FAILURE',
  UPDATE_PROFILE: 'UPDATE_PROFILE',
  REFRESH_TOKEN: 'REFRESH_TOKEN',
  SET_LOADING: 'SET_LOADING'
};

// Initial state
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null
};

// Reducer function
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
    case AUTH_ACTIONS.REGISTER_START:
      return {
        ...state,
        isLoading: true,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
    case AUTH_ACTIONS.REGISTER_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
    case AUTH_ACTIONS.REGISTER_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      };

    case AUTH_ACTIONS.UPDATE_PROFILE:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
        isLoading: false
      };

    case AUTH_ACTIONS.REFRESH_TOKEN:
      return {
        ...state,
        token: action.payload.token
      };

    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };

    default:
      return state;
  }
};

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

        // Call server to check authentication (cookie sent automatically)
        const response = await api.get('/auth/me');

        if (response.data && response.data.data && response.data.data.user) {
          dispatch({
            type: AUTH_ACTIONS.LOGIN_SUCCESS,
            payload: {
              user: response.data.data.user,
              token: 'authenticated_via_cookie'
            }
          });
        } else {
          dispatch({ type: AUTH_ACTIONS.LOGOUT });
        }
      } catch (error) {
        // Token is invalid or expired, no user is logged in
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
      } finally {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    };

    checkAuthStatus();
  }, []);

  // Login function
  const login = async (phone, password) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });

      const response = await api.post('/auth/login', { phone, password });

      if (response.data && response.data.data && response.data.data.user) {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            user: response.data.data.user,
            token: 'authenticated_via_cookie'
          }
        });
        toast.success('Login successful!');
        return { success: true, user: response.data.data.user };
      } else {
        const errorMessage = response.data?.message || 'Login failed';
        dispatch({
          type: AUTH_ACTIONS.LOGIN_FAILURE,
          payload: errorMessage
        });
        toast.error(errorMessage);
        return { success: false, message: errorMessage };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: errorMessage
      });
      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.REGISTER_START });

      const response = await api.post('/auth/register', userData);

      if (response.data && response.data.data && response.data.data.user) {
        // User is created but email verification is required
        dispatch({
          type: AUTH_ACTIONS.LOGOUT  // Don't auto-login
        });
        toast.success('Registration successful! Please verify your email to complete signup.');
        return { success: true, user: response.data.data.user, requiresEmailVerification: true };
      } else {
        const errorMessage = response.data?.message || 'Registration failed';
        dispatch({
          type: AUTH_ACTIONS.REGISTER_FAILURE,
          payload: errorMessage
        });
        toast.error(errorMessage);
        return { success: false, message: errorMessage };
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.message || 'Network error. Please try again.';
      dispatch({
        type: AUTH_ACTIONS.REGISTER_FAILURE,
        payload: errorMessage
      });
      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Call logout endpoint to clear server-side cookie
      await api.post('/auth/logout');
    } catch (error) {
      console.log('Logout API call failed, but continuing with local logout');
    } finally {
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      toast.success('Logged out successfully');
    }
  };

  // Update profile function
  const updateProfile = async (profileData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

      const response = await api.put('/auth/profile', profileData);

      if (response.data && response.data.data && response.data.data.user) {
        dispatch({
          type: AUTH_ACTIONS.UPDATE_PROFILE,
          payload: response.data.data.user
        });
        toast.success('Profile updated successfully!');
        return { success: true };
      } else {
        toast.error(response.data?.message || 'Profile update failed');
        return { success: false, message: response.data?.message };
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Network error. Please try again.');
      return { success: false, message: 'Network error' };
    }
  };

  // Change password function
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await api.put('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });

      if (response.data) {
        toast.success('Password changed successfully!');
        return { success: true };
      } else {
        toast.error(response.data?.message || 'Password change failed');
        return { success: false, message: response.data?.message };
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('Network error. Please try again.');
      return { success: false, message: 'Network error' };
    }
  };

  // Refresh token function
  const refreshToken = async () => {
    try {
      const response = await api.post('/auth/refresh', {});

      if (response.data) {
        // Cookie is automatically refreshed by server
        dispatch({
          type: AUTH_ACTIONS.REFRESH_TOKEN,
          payload: { token: 'authenticated_via_cookie' }
        });
        return { success: true };
      } else {
        // Token refresh failed, logout user
        logout();
        return { success: false };
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      logout();
      return { success: false };
    }
  };

  // Check if user is admin
  const isAdmin = () => {
    return state.user?.is_admin || false;
  };

  // Check if user is verified
  const isVerified = () => {
    return state.user?.is_verified || false;
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    refreshToken,
    isAdmin,
    isVerified
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
