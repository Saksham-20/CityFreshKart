// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    PROFILE: '/auth/profile',
    UPDATE_PROFILE: '/auth/profile',
    CHANGE_PASSWORD: '/auth/change-password',
  },
  PRODUCTS: {
    LIST: '/products',
    DETAIL: '/products/:id',
    SEARCH: '/products/search',
    CATEGORIES: '/products/categories',
  },
  CART: {
    GET: '/cart',
    ADD: '/cart/add',
    UPDATE: '/cart/update',
    REMOVE: '/cart/remove',
    CLEAR: '/cart/clear',
  },
  ORDERS: {
    LIST: '/orders',
    CREATE: '/orders',
    DETAIL: '/orders/:id',
    UPDATE: '/orders/:id',
  },
  USERS: {
    LIST: '/users',
    DETAIL: '/users/:id',
    UPDATE: '/users/:id',
    DELETE: '/users/:id',
  },
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    PRODUCTS: '/admin/products',
    ORDERS: '/admin/orders',
    USERS: '/admin/users',
    ANALYTICS: '/admin/analytics',
  },
  RAZORPAY: {
    CREATE_ORDER: '/razorpay/create-order',
    VERIFY_PAYMENT: '/razorpay/verify-payment',
  },
};

// Application Constants
export const APP_CONSTANTS = {
  APP_NAME: process.env.REACT_APP_APP_NAME || 'CityFreshKart',
  APP_VERSION: '1.0.0',
  DEFAULT_CURRENCY: process.env.REACT_APP_DEFAULT_CURRENCY || 'USD',
  DEFAULT_LANGUAGE: process.env.REACT_APP_DEFAULT_LANGUAGE || 'en',
  MAX_FILE_SIZE: parseInt(process.env.REACT_APP_MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
  SUPPORTED_IMAGE_TYPES: (process.env.REACT_APP_SUPPORTED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp').split(','),
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 12,
    MAX_PAGE_SIZE: 100,
  },
};

// Product Constants
export const PRODUCT_CONSTANTS = {
  CATEGORIES: [
    'Rings',
    'Necklaces',
    'Earrings',
    'Bracelets',
    'Watches',
    'Accessories',
  ],
  SORT_OPTIONS: [
    { value: 'newest', label: 'Newest First' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'popularity', label: 'Most Popular' },
  ],
  RATING_OPTIONS: [
    { value: 5, label: '5+ stars' },
    { value: 4, label: '4+ stars' },
    { value: 3, label: '3+ stars' },
    { value: 2, label: '2+ stars' },
    { value: 1, label: '1+ stars' },
  ],
};

// Order Constants
export const ORDER_CONSTANTS = {
  STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PROCESSING: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded',
  },
  PAYMENT_STATUS: {
    PENDING: 'pending',
    PAID: 'paid',
    FAILED: 'failed',
    REFUNDED: 'refunded',
  },
  SHIPPING_METHODS: [
    { id: 'standard', name: 'Standard Shipping', price: 5.99, days: '3-5 business days' },
    { id: 'express', name: 'Express Shipping', price: 12.99, days: '1-2 business days' },
    { id: 'overnight', name: 'Overnight Shipping', price: 24.99, days: 'Next business day' },
  ],
};

// User Constants
export const USER_CONSTANTS = {
  ROLES: {
    USER: 'user',
    ADMIN: 'admin',
    MODERATOR: 'moderator',
  },
  GENDERS: [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
    { value: 'prefer-not-to-say', label: 'Prefer not to say' },
  ],
};

// Validation Constants
export const VALIDATION_CONSTANTS = {
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: false,
  },
  EMAIL: {
    MAX_LENGTH: 254,
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
  },
  PHONE: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 15,
  },
};

// Error Messages
export const ERROR_MESSAGES = {
  GENERAL: {
    SOMETHING_WENT_WRONG: 'Something went wrong. Please try again.',
    NETWORK_ERROR: 'Network error. Please check your connection.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
    FORBIDDEN: 'Access denied.',
    NOT_FOUND: 'The requested resource was not found.',
    VALIDATION_ERROR: 'Please check your input and try again.',
  },
  AUTH: {
    INVALID_CREDENTIALS: 'Invalid email or password.',
    EMAIL_EXISTS: 'An account with this email already exists.',
    WEAK_PASSWORD: 'Password is too weak. Please choose a stronger password.',
    PASSWORDS_DONT_MATCH: 'Passwords do not match.',
    INVALID_TOKEN: 'Invalid or expired token.',
  },
  PRODUCTS: {
    NOT_FOUND: 'Product not found.',
    OUT_OF_STOCK: 'This product is currently out of stock.',
    INVALID_QUANTITY: 'Invalid quantity selected.',
  },
  CART: {
    EMPTY_CART: 'Your cart is empty.',
    ITEM_NOT_FOUND: 'Item not found in cart.',
    INSUFFICIENT_STOCK: 'Insufficient stock available.',
  },
  ORDERS: {
    NOT_FOUND: 'Order not found.',
    CANNOT_CANCEL: 'This order cannot be cancelled.',
    ALREADY_PROCESSED: 'This order has already been processed.',
  },
};

// Success Messages
export const SUCCESS_MESSAGES = {
  AUTH: {
    LOGIN_SUCCESS: 'Successfully logged in!',
    REGISTER_SUCCESS: 'Account created successfully!',
    LOGOUT_SUCCESS: 'Successfully logged out!',
    PROFILE_UPDATED: 'Profile updated successfully!',
    PASSWORD_CHANGED: 'Password changed successfully!',
  },
  CART: {
    ITEM_ADDED: 'Item added to cart!',
    ITEM_REMOVED: 'Item removed from cart!',
    CART_CLEARED: 'Cart cleared successfully!',
    QUANTITY_UPDATED: 'Quantity updated successfully!',
  },
  ORDERS: {
    ORDER_CREATED: 'Order placed successfully!',
    ORDER_CANCELLED: 'Order cancelled successfully!',
  },
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'token',
  USER_DATA: 'userData',
  CART_ITEMS: 'cartItems',
  THEME: 'theme',
  LANGUAGE: 'language',
};

// Theme Constants
export const THEME_CONSTANTS = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
};

// Breakpoints
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
};
