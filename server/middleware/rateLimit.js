const rateLimit = require('express-rate-limit');

const defaultAuthWindowMs = 15 * 60 * 1000;
const parsedAuthWindow = parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10);
const authWindowMs = Number.isFinite(parsedAuthWindow) && parsedAuthWindow > 0
  ? parsedAuthWindow
  : defaultAuthWindowMs;

const parsedAuthMax = parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10);
const authMax = Number.isFinite(parsedAuthMax) && parsedAuthMax > 0
  ? parsedAuthMax
  : (process.env.NODE_ENV === 'production' ? 50 : 1000);

// General API rate limiting (relaxed in development/test for automated testing)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 500 : 10000,
  message: {
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Stricter rate limiting for auth endpoints (failed attempts only in production)
const authLimiter = rateLimit({
  windowMs: authWindowMs,
  max: authMax,
  skipSuccessfulRequests: true,
  message: {
    message: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for file uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 uploads per hour
  message: {
    message: 'Too many file uploads, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for checkout/payment endpoints (relaxed in development/test)
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 3 : 1000,
  message: {
    message: 'Too many checkout attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  authLimiter,
  uploadLimiter,
  checkoutLimiter,
};
