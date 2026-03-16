const jwt = require('jsonwebtoken');
const { query } = require('../database/config');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    console.log('Auth middleware: Checking authentication for:', req.path);

    // Try to get token from cookies first (primary method)
    let token = req.cookies?.authToken;

    // Fallback to Authorization header for backward compatibility
    if (!token) {
      const authHeader = req.headers['authorization'];
      token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    }

    console.log('Auth middleware: Token:', token ? 'Token exists' : 'No token');

    if (!token) {
      console.log('Auth middleware: No token provided');
      return res.status(401).json({
        success: false,
        message: 'Access token required',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth middleware: Decoded token:', decoded);

    // Get user from database using userId from token
    const result = await query(
      'SELECT id, email, first_name, last_name, is_admin, is_verified FROM users WHERE id = $1',
      [decoded.userId],
    );
    console.log('Auth middleware: Database result:', result.rows);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

    // Add user info to request
    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }
  next();
};

// Middleware to check if user is verified
const requireVerified = (req, res, next) => {
  if (!req.user || !req.user.is_verified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required',
    });
  }
  next();
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    // Try to get token from cookies first (primary method)
    let token = req.cookies?.authToken;

    // Fallback to Authorization header for backward compatibility
    if (!token) {
      const authHeader = req.headers['authorization'];
      token = authHeader && authHeader.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await query(
        'SELECT id, email, first_name, last_name, is_admin, is_verified FROM users WHERE id = $1',
        [decoded.userId],
      );

      if (result.rows.length > 0) {
        req.user = result.rows[0];
      }
    }
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireVerified,
  optionalAuth,
};
