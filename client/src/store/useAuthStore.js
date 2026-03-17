import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import authProviderService, { AUTH_PROVIDER } from '../services/authProviderService';

/**
 * Auth Store - Phone-based OTP authentication
 * 
 * Flow:
 * 1. requestOTP(phone) - Send OTP to phone
 * 2. verifyOTP(userId, otp) - Verify OTP and login
 * 3. Session persists via httpOnly cookie
 */
export const useAuthStore = create(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        otpSessionId: null, // For tracking OTP verification flow
        authProvider: AUTH_PROVIDER,

        // Check auth status on app load (uses httpOnly cookie)
        checkAuth: async () => {
          try {
            set({ isLoading: true });
            const response = await api.get('/auth/me');
            const user = response.data?.data?.user;
            if (user) {
              set({ user, token: 'authenticated_via_cookie', isAuthenticated: true, isLoading: false, error: null });
            } else {
              set({ user: null, token: null, isAuthenticated: false, isLoading: false });
            }
          } catch {
            set({ user: null, token: null, isAuthenticated: false, isLoading: false });
          }
        },

        /**
         * Request OTP for phone number
         * User provides phone, gets OTP sent via SMS
         */
        requestOTP: async (phone) => {
          try {
            set({ isLoading: true, error: null });
            const result = await authProviderService.requestOTP(phone);

            if (result?.success) {
              set({ 
                otpSessionId: result.userId || phone,
                isLoading: false,
                error: null
              });
              toast.success('OTP sent! Check your phone.');
              return {
                success: true,
                ...result,
                userId: result.userId || phone,
              };
            }
            throw new Error(result?.message || 'Failed to send OTP');
          } catch (error) {
            const msg = error.response?.data?.message || error.message || 'Failed to send OTP';
            set({ isLoading: false, error: msg });
            toast.error(msg);
            return { success: false, message: msg };
          }
        },

        /**
         * Verify OTP and complete login
         * User provides the 6-digit OTP they received
         */
        verifyOTP: async (otpContext, otp) => {
          try {
            set({ isLoading: true, error: null });
            const result = await authProviderService.verifyOTP(otpContext, otp);

            if (result?.success) {
              const user = result.user;
              set({ 
                user, 
                token: 'authenticated_via_cookie',
                isAuthenticated: true,
                isLoading: false,
                error: null,
                otpSessionId: null
              });
              toast.success('Welcome! Logged in successfully.');
              return { success: true, user };
            }
            throw new Error(result?.message || 'OTP verification failed');
          } catch (error) {
            const msg = error.response?.data?.message || error.message || 'OTP verification failed';
            set({ isLoading: false, error: msg });
            toast.error(msg);
            return { success: false, message: msg };
          }
        },

        /**
         * Update user profile (name, address, etc)
         */
        updateProfile: async (profileData) => {
          try {
            set({ isLoading: true });
            const response = await api.put('/auth/profile', profileData);
            const user = response.data?.data?.user;
            if (user) {
              set((state) => ({ user: { ...state.user, ...user }, isLoading: false }));
              toast.success('Profile updated successfully!');
              return { success: true };
            }
            throw new Error('Profile update failed');
          } catch (error) {
            const msg = error.response?.data?.message || error.message || 'Profile update failed';
            set({ isLoading: false });
            toast.error(msg);
            return { success: false, message: msg };
          }
        },

        logout: async () => {
          try {
            await api.post('/auth/logout', {});
          } catch {
            // Ignore logout API errors
          }
          await authProviderService.reset();
          set({ user: null, token: null, isAuthenticated: false, error: null, otpSessionId: null });
          localStorage.removeItem('token');
          toast.success('Logged out successfully');
        },
      }),
      {
        name: 'auth-storage', // localStorage key
      }
    )
  )
);

export default useAuthStore;
