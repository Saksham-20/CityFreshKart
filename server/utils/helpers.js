const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/jwt');

// Generate random string
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate random number between min and max
const generateRandomNumber = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Hash password using bcrypt
const hashPassword = async (password) => {
  const bcrypt = require('bcrypt');
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Compare password with hash
const comparePassword = async (password, hash) => {
  const bcrypt = require('bcrypt');
  return await bcrypt.compare(password, hash);
};

// Generate JWT token
const generateToken = (payload, secret, expiresIn = '24h') => {
  return jwt.sign(payload, secret ?? getJwtSecret(), { expiresIn });
};

// Verify JWT token
const verifyToken = (token, secret) => {
  try {
    return jwt.verify(token, secret ?? getJwtSecret());
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Decode JWT token without verification
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    throw new Error('Invalid token format');
  }
};

// Generate order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `ORD-${timestamp.slice(-8)}-${random}`;
};

// Generate SKU
const generateSKU = (category, brand, productId) => {
  const categoryCode = category.substring(0, 3).toUpperCase();
  const brandCode = brand.substring(0, 3).toUpperCase();
  const paddedId = productId.toString().padStart(4, '0');
  return `${categoryCode}-${brandCode}-${paddedId}`;
};

// Format currency
const formatCurrency = (amount, currency = 'INR', locale = 'en-IN') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

// Format date
const formatDate = (date, format = 'YYYY-MM-DD') => {
  const d = new Date(date);

  if (format === 'YYYY-MM-DD') {
    return d.toISOString().split('T')[0];
  } else if (format === 'MM/DD/YYYY') {
    return d.toLocaleDateString('en-US');
  } else if (format === 'DD/MM/YYYY') {
    return d.toLocaleDateString('en-GB');
  } else if (format === 'relative') {
    return getRelativeTime(d);
  }

  return d.toISOString();
};

// Get relative time (e.g., "2 hours ago")
const getRelativeTime = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(diffInSeconds / 31536000);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }
};

// Sanitize HTML content
const sanitizeHtml = (html) => {
  // Basic HTML sanitization - in production, use a library like DOMPurify
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};

// Truncate text
const truncateText = (text, length = 100, suffix = '...') => {
  if (text.length <= length) return text;
  return text.substring(0, length) + suffix;
};

// Slugify text (convert to URL-friendly string)
const slugify = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number
const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

// Validate credit card number (Luhn algorithm)
const isValidCreditCard = (cardNumber) => {
  const cleanNumber = cardNumber.replace(/\s/g, '');
  if (!/^\d+$/.test(cleanNumber)) return false;

  let sum = 0;
  let isEven = false;

  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber.charAt(i));

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
};

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Generate pagination info
const generatePagination = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    itemsPerPage: limit,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null,
    startIndex: (page - 1) * limit + 1,
    endIndex: Math.min(page * limit, total),
  };
};

// Deep clone object
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
};

// Debounce function
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function
const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Generate UUID v4
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Check if object is empty
const isEmpty = (obj) => {
  if (obj == null) return true;
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
  if (obj instanceof Map || obj instanceof Set) return obj.size === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
};

// Get nested object property safely
const getNestedProperty = (obj, path, defaultValue = undefined) => {
  const keys = path.split('.');
  let result = obj;

  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return defaultValue;
    }
  }

  return result;
};

// Set nested object property safely
const setNestedProperty = (obj, path, value) => {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
  return obj;
};

module.exports = {
  generateRandomString,
  generateRandomNumber,
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  decodeToken,
  generateOrderNumber,
  generateSKU,
  formatCurrency,
  formatDate,
  getRelativeTime,
  sanitizeHtml,
  truncateText,
  slugify,
  isValidEmail,
  isValidPhone,
  isValidCreditCard,
  calculateDistance,
  generatePagination,
  deepClone,
  debounce,
  throttle,
  generateUUID,
  isEmpty,
  getNestedProperty,
  setNestedProperty,
};
