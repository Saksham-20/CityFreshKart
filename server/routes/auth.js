const express = require('express');
const router = express.Router();
const otpService = require('../services/otpService');
const { isFirebaseAdminConfigured, verifyFirebaseIdToken } = require('../services/firebaseAdmin');
const { syncUserByPhone, createAppSessionToken } = require('../services/authSessionService');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
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
router.post('/request-otp', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || phone.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Valid phone number required'
      });
    }

    const result = await otpService.requestOTP(phone);

    res.json({
      success: true,
      userId: result.userId,
      message: 'OTP sent to your phone'
    });

  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.'
    });
  }
});

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP and login user
 * @access  Public
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: 'User ID and OTP required'
      });
    }

    const result = await otpService.verifyOTP(userId, otp);

    if (!result.success) {
      return res.status(400).json(result);
    }

    setAuthCookie(res, result.token);

    res.json({
      success: true,
      message: 'Logged in successfully',
      data: {
        user: result.user,
        token: result.token
      }
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
    // User already authenticated by middleware
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

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (clear session)
 * @access  Private
 */
router.post('/logout', authenticateToken, (req, res) => {
  res.clearCookie('authToken');
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile (name, address)
 * @access  Private
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.id;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name required (min 2 characters)'
      });
    }

    const result = await pool.query(
      'UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, phone, name, is_admin',
      [name, userId]
    );

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
