const jwt = require('jsonwebtoken');
const { query } = require('../database/config');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    // Fall back to httpOnly cookie if no Authorization header
    if (!token) {
      token = req.cookies?.authToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database using userId from token
    const result = await query(
      'SELECT id, phone, name, is_admin FROM users WHERE id = $1',
      [decoded.id],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

    // Add user info to request
    const u = result.rows[0];
    req.user = { id: u.id, phone: u.phone, name: u.name, is_admin: u.is_admin };
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
        'SELECT id, phone, name, is_admin FROM users WHERE id = $1',
        [decoded.id],
      );

      if (result.rows.length > 0) {
        const u = result.rows[0];
        req.user = { id: u.id, phone: u.phone, name: u.name, is_admin: u.is_admin };
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
  optionalAuth,
};
