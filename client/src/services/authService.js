import { getPublicApiOrigin } from '../utils/publicOrigin';

const apiRoot = () => `${getPublicApiOrigin()}/api`;

class AuthService {
  async login(credentials) {
    try {
      const response = await fetch(`${apiRoot()}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Essential for sending/receiving cookies
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();
      
      // Token is now stored as httpOnly cookie by server
      // No need to store in localStorage
      localStorage.setItem('user', JSON.stringify(data.data.user));

      return data;
    } catch (error) {
      throw error;
    }
  }

  async register(userData) {
    try {
      const response = await fetch(`${apiRoot()}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Essential for sending/receiving cookies
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async loginWithGoogle(idToken) {
    const response = await fetch(`${apiRoot()}/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ idToken }),
    });

    const data = await response.json();
    if (!response.ok || !data?.success) {
      throw new Error(data?.message || 'Google login failed');
    }

    localStorage.setItem('user', JSON.stringify(data.data.user));
    return data;
  }

  async logout() {
    try {
      // Call server to clear httpOnly cookie
      await fetch(`${apiRoot()}/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Essential for sending/receiving cookies
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }

  async refreshToken() {
    try {
      const response = await fetch(`${apiRoot()}/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // Essential for sending/receiving cookies
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      // Token is refreshed via httpOnly cookie by server
      // Update user info if needed
      if (data.data && data.data.user) {
        localStorage.setItem('user', JSON.stringify(data.data.user));
      }

      return data;
    } catch (error) {
      // If refresh fails, clear storage and redirect to login
      this.logout();
      throw error;
    }
  }

  async updateProfile(profileData) {
    try {
      const response = await fetch(`${apiRoot()}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Profile update failed');
      }

      const data = await response.json();
      
      // Update stored user data
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { ...currentUser, ...data.data.user };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      return data;
    } catch (error) {
      throw error;
    }
  }

  async changePassword(passwordData) {
    try {
      const response = await fetch(`${apiRoot()}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(passwordData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Password change failed');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async forgotPassword(email) {
    try {
      const response = await fetch(`${apiRoot()}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Password reset request failed');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async resetPassword(token, newPassword) {
    try {
      const response = await fetch(`${apiRoot()}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Password reset failed');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async verifyEmail(token) {
    try {
      const response = await fetch(`${apiRoot()}/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Email verification failed');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  async resendVerificationEmail(email) {
    try {
      const response = await fetch(`${apiRoot()}/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Verification email resend failed');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  // Utility methods
  getToken() {
    return localStorage.getItem('token');
  }

  getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated() {
    const token = this.getToken();
    return !!token;
  }

  isTokenExpired(token) {
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch (error) {
      return true;
    }
  }
}

export default new AuthService();
