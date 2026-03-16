// Get API URL from environment variables
const API_BASE_URL = process.env.REACT_APP_API_URL 
  ? `${process.env.REACT_APP_API_URL}/api`
  : 'http://localhost:5001/api';

// Enhanced debugging for development only
if (process.env.NODE_ENV === 'development') {
  console.log('=== API SERVICE DEBUG ===');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
  console.log('Final API_BASE_URL:', API_BASE_URL);
  console.log('Current window.location:', window.location.href);
  console.log('========================');
}

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('API Service: Constructor - baseURL set to:', this.baseURL);
    }
    
    // Additional fallback check
    if (this.baseURL && !this.baseURL.includes('/api')) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('API Service: baseURL missing /api, adding it');
      }
      this.baseURL = this.baseURL + '/api';
    }
  }

  // Get auth token from localStorage (for backward compatibility)
  getAuthToken() {
    return localStorage.getItem('token');
  }

  // Set auth token in localStorage (deprecated - use httpOnly cookies instead)
  setAuthToken(token) {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  // Get headers for requests
  getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
    };

    // Note: Authorization header is kept for backward compatibility
    // Cookies (httpOnly) are sent automatically with credentials: 'include'
    if (includeAuth) {
      const token = this.getAuthToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    return headers;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    console.log('🌐 API: Making request to:', url);
    
    const config = {
      headers: this.getHeaders(options.includeAuth !== false),
      credentials: 'include', // Essential for sending httpOnly cookies
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      console.log('🌐 API: Response status:', response.status);
      
      // Handle different response statuses
      if (response.status === 401) {
        // Unauthorized - clear token but let AuthContext handle the redirect
        this.setAuthToken(null);
        const error = new Error('Unauthorized access');
        error.status = 401;
        throw error;
      }

      if (response.status === 403) {
        throw new Error('Access forbidden');
      }

      if (response.status === 404) {
        throw new Error('Resource not found');
      }

      if (response.status >= 500) {
        throw new Error('Server error occurred');
      }

      // Parse response
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const error = new Error(data.message || `HTTP error! status: ${response.status}`);
        error.response = { data };
        error.status = response.status;
        throw error;
      }

      return { data };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('API request failed:', error);
      }
      throw error;
    }
  }

  // GET request
  async get(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'GET',
      ...options,
    });
  }

  // POST request
  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  // PUT request
  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    });
  }

  // PATCH request
  async patch(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...options,
    });
  }

  // DELETE request
  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      ...options,
    });
  }

  // Upload file
  async upload(endpoint, formData, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.getAuthToken()}`,
        // Don't set Content-Type for FormData
      },
      body: formData,
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload failed with status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// Create and export a single instance
const apiService = new ApiService();
export default apiService;
