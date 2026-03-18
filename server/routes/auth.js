const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../database/config');
const { authenticateToken, requireVerified } = require('../middleware/auth');
const { validateRegistration, validateLogin } = require('../middleware/validation');

const router = express.Router();

// Test route to verify auth routes are working
router.get('/test', (req, res) => {
  console.log('🧪 Auth test route hit');
  res.json({ message: 'Auth routes are working!', timestamp: new Date().toISOString() });
});

// @route   POST /api/auth/setup-database
// @desc    Setup database tables and seed data (for production setup)
// @access  Public (temporary endpoint for setup)
router.post('/setup-database', async (req, res) => {
  try {
    console.log('🔧 Starting database setup...');

    // Import setup and seed functions
    const setupDatabase = require('../database/setup');
    const seedDatabase = require('../database/seed');

    // Run database setup
    await setupDatabase();
    console.log('✅ Database setup completed');

    // Run database seeding
    await seedDatabase();
    console.log('✅ Database seeding completed');

    res.json({
      success: true,
      message: 'Database setup and seeding completed successfully!',
      adminCredentials: {
        email: 'admin@frashcart.in',
        password: 'admin123',
      },
    });

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    res.status(500).json({
      success: false,
      message: 'Database setup failed',
      error: error.message,
    });
  }
});

// @route   POST /api/auth/register
// @desc    Register a new user with phone + password (simplified for produce vendor)
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { phone, password, name } = req.body;

    // Validate required fields
    if (!phone || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Phone, password, and name are required',
      });
    }

    // Check if phone already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE phone = $1',
      [phone],
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Phone number already registered',
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await query(`
      INSERT INTO users (phone, password_hash, name, is_admin, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id, phone, name, is_admin, created_at
    `, [phone, passwordHash, name, false]);

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, is_admin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          is_admin: user.is_admin,
        },
        token,
      },
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user with phone + password & get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Validate required fields
    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone and password are required',
      });
    }

    // Check if user exists
    const result = await query(`
      SELECT id, phone, password_hash, name, is_admin
      FROM users WHERE phone = $1
    `, [phone]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone or password',
      });
    }

    const user = result.rows[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone or password',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, is_admin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          is_admin: user.is_admin,
        },
        token,
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT id, phone, name, is_admin, created_at, updated_at
      FROM users WHERE id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: {
        user: result.rows[0],
      },
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone } = req.body;

    // Update user profile
    const result = await query(`
      UPDATE users 
      SET name = COALESCE($1, name),
          phone = COALESCE($2, phone),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, name, phone, is_admin, created_at, updated_at
    `, [name, phone, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: result.rows[0],
      },
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long',
      });
    }

    // Get current user with password
    const userResult = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      current_password,
      userResult.rows[0].password_hash,
    );

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, req.user.id],
    );

    res.json({
      success: true,
      message: 'Password changed successfully',
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    // Generate new JWT token
    const token = jwt.sign(
      { userId: req.user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
    );

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: { token },
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful',
  });
});

module.exports = router;
