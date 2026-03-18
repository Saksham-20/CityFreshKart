const express = require('express');
const router = express.Router();
const otpService = require('../services/otpService');
const { isFirebaseAdminConfigured, verifyFirebaseIdToken } = require('../services/firebaseAdmin');
const { syncUserByPhone, createAppSessionToken } = require('../services/authSessionService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const pool = require('../database/config');

const setAuthCookie = (res, token) => {
  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
};

/**
 * @route   POST /api/auth/request-otp
 * @desc    Request OTP for phone number (new user or existing)
 * @access  Public
 */
router.post('/request-otp', authLimiter, async (req, res) => {
  try {
    const { phone } = req.body;

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

    const result = await otpService.requestOTP(phone);

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
    console.error('Request OTP error:', error);
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

    const result = await otpService.verifyOTP(userId, otp);

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone or password',
      });
    }

    setAuthCookie(res, result.token);

    res.json({
      success: true,
      message: 'Logged in successfully',
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
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'OTP verification failed'
    });
  }
});

/**
 * @route   POST /api/auth/provider-session
 * @desc    Exchange a verified provider token for the app JWT session
 * @access  Public
 */
router.post('/provider-session', async (req, res) => {
  try {
    const { provider, idToken } = req.body;

    if (provider !== 'firebase') {
      return res.status(400).json({
        success: false,
        message: 'Unsupported auth provider',
      });
    }

    if (!isFirebaseAdminConfigured) {
      return res.status(500).json({
        success: false,
        message: 'Firebase auth is not configured on the server',
      });
    }

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Firebase ID token is required',
      });
    }

    const decodedToken = await verifyFirebaseIdToken(idToken);
    const phone = decodedToken.phone_number;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Firebase account does not contain a phone number',
      });
    }

    const user = await syncUserByPhone({
      phone,
      name: decodedToken.name,
    });

    const token = createAppSessionToken(user.id);
    setAuthCookie(res, token);

    res.json({
      success: true,
      message: 'Logged in successfully',
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          is_admin: user.isAdmin,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Provider session error:', error);
    res.status(500).json({
      success: false,
      message: 'Provider authentication failed',
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user (verify token/session)
 * @access  Private
 */
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
        user: req.user
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Not authenticated'
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
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated',
      data: {
        user: result.rows[0]
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

/**
 * @route   GET /api/auth/test
 * @desc    Test route to verify auth routes are working
 * @access  Public
 */
router.get('/test', (req, res) => {
  console.log('🧪 Auth test route hit');
  res.json({ message: 'Auth routes are working!', timestamp: new Date().toISOString() });
});

module.exports = router;
