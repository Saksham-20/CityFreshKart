const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter, resetInitiateLimiter, resetVerifyLimiter } = require('../middleware/rateLimit');
const { getJwtSecret } = require('../config/jwt');
const { jsonClientError, logApiError } = require('../utils/apiErrors');
const { body, validationResult } = require('express-validator');
const { isFirebaseAdminConfigured, verifyFirebaseIdToken } = require('../services/firebaseAdmin');
const { isEmailDeliveryEnabled, sendPasswordResetOtpEmail } = require('../services/emailService');
const {
  OTP_MAX_ATTEMPTS,
  normalizePhone,
  normalizeEmail,
  createAndStoreOtp,
  verifyOtpAndCreateResetToken,
  consumeResetTokenAndUpdatePassword,
} = require('../services/passwordResetService');

// Safe db query accessor
const dbQuery = async (text, params) => {
  const db = require('../database/config');
  const pool = db.pool || db;
  return pool.query(text, params);
};

const getAuthCookieOptions = (maxAge) => {
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  };

  const configuredDomain = process.env.AUTH_COOKIE_DOMAIN && process.env.AUTH_COOKIE_DOMAIN.trim();
  if (configuredDomain && process.env.NODE_ENV === 'production') {
    options.domain = configuredDomain.startsWith('.') ? configuredDomain : `.${configuredDomain}`;
  }

  if (Number.isFinite(maxAge)) {
    options.maxAge = maxAge;
  }

  return options;
};

const setAuthCookie = (res, token) => {
  res.cookie('authToken', token, getAuthCookieOptions(7 * 24 * 60 * 60 * 1000));
};

const issueAuthToken = (user) => jwt.sign(
  {
    id: user.id,
    is_admin: user.is_admin,
    token_version: Number.isFinite(user.token_version) ? user.token_version : 0,
  },
  getJwtSecret(),
  { expiresIn: '7d' },
);

const maskEmail = (email = '') => {
  const normalized = normalizeEmail(email);
  const [localPart, domain] = normalized.split('@');
  if (!localPart || !domain) return '';
  const first = localPart[0];
  const last = localPart.length > 1 ? localPart[localPart.length - 1] : '';
  return `${first}${'*'.repeat(Math.max(localPart.length - 2, 1))}${last}@${domain}`;
};

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { phone, password, name } = req.body;
    if (!phone || !password || !name) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // FIX #12: Validate phone format — must be exactly 10 digits
    const normalizedPhone = String(phone).replace(/\D/g, '').slice(-10);
    if (!/^\d{10}$/.test(normalizedPhone)) {
      return res.status(400).json({ success: false, message: 'Phone must be a valid 10-digit number' });
    }

    const existingUser = await dbQuery('SELECT id FROM users WHERE phone = $1', [normalizedPhone]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Phone already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userResult = await dbQuery(`
      INSERT INTO users (phone, password_hash, name, is_admin, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id, phone, name, is_admin, token_version, created_at
    `, [normalizedPhone, passwordHash, name.trim(), false]);

    const user = userResult.rows[0];

    const token = issueAuthToken(user);
    setAuthCookie(res, token);
    res.status(201).json({ success: true, message: 'Registered successfully', data: { user, token } });
  } catch (error) {
    logApiError(req, 'auth_register_failed', error);
    return jsonClientError(res, req, 500, {
      message: 'Server error',
      errorCode: 'AUTH_REGISTER_FAILED',
    });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Phone and password required' });
    }

    const userResult = await dbQuery('SELECT id, phone, password_hash, name, is_admin, token_version FROM users WHERE phone = $1', [phone]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = issueAuthToken(user);

    setAuthCookie(res, token);
    res.json({ success: true, message: 'Logged in successfully', data: { user: { id: user.id, phone: user.phone, name: user.name, is_admin: user.is_admin }, token } });
  } catch (error) {
    logApiError(req, 'auth_login_failed', error);
    return jsonClientError(res, req, 500, {
      message: 'Server error',
      errorCode: 'AUTH_LOGIN_FAILED',
    });
  }
});

router.post(
  '/forgot-password/start',
  resetInitiateLimiter,
  [
    body('phone')
      .matches(/^\d{10}$/)
      .withMessage('Phone must be 10 digits'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }
      const phone = normalizePhone(req.body.phone);
      const userResult = await dbQuery(
        'SELECT id, phone, email FROM users WHERE phone = $1 LIMIT 1',
        [phone],
      );
      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No account found with this phone number.',
          errorCode: 'PHONE_NOT_FOUND',
        });
      }

      const user = userResult.rows[0];
      return res.status(200).json({
        success: true,
        message: user.email
          ? 'Phone verified. Enter your account email to receive OTP.'
          : 'Phone verified. No email linked yet, enter your email to continue.',
        data: {
          phone,
          hasEmail: Boolean(user.email),
          maskedEmail: user.email ? maskEmail(user.email) : null,
        },
      });
    } catch (error) {
      logApiError(req, 'auth_forgot_password_start_failed', error);
      return jsonClientError(res, req, 500, {
        message: 'Server error',
        errorCode: 'AUTH_FORGOT_PASSWORD_START_FAILED',
      });
    }
  },
);

router.post(
  '/forgot-password/email',
  resetInitiateLimiter,
  [
    body('phone').matches(/^\d{10}$/).withMessage('Phone must be 10 digits'),
    body('email').isEmail().withMessage('Valid email is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });

      if (!isEmailDeliveryEnabled()) {
        logApiError(req, 'forgot_password_email_not_configured', new Error('Email provider is not configured'));
        return res.status(503).json({
          success: false,
          message: 'Password reset email is not configured',
          errorCode: 'PASSWORD_RESET_EMAIL_NOT_CONFIGURED',
        });
      }

      const phone = normalizePhone(req.body.phone);
      const email = normalizeEmail(req.body.email);
      const userResult = await dbQuery(
        'SELECT id, phone, email FROM users WHERE phone = $1 LIMIT 1',
        [phone],
      );
      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No account found with this phone number.',
          errorCode: 'PHONE_NOT_FOUND',
        });
      }

      let user = userResult.rows[0];
      if (!user.email) {
        const emailOwner = await dbQuery(
          'SELECT id FROM users WHERE LOWER(TRIM(email)) = $1 AND id <> $2 LIMIT 1',
          [email, user.id],
        );
        if (emailOwner.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: 'This email is already linked to another account.',
            errorCode: 'EMAIL_ALREADY_LINKED',
          });
        }
        const updatedUser = await dbQuery(
          `UPDATE users
           SET email = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2
           RETURNING id, phone, email`,
          [email, user.id],
        );
        user = updatedUser.rows[0] || { ...user, email };
      } else if (normalizeEmail(user.email) !== email) {
        return res.status(400).json({
          success: false,
          message: 'The provided email does not match this phone number account.',
          errorCode: 'PHONE_EMAIL_MISMATCH',
        });
      }

      if (!isEmailDeliveryEnabled()) {
        logApiError(req, 'forgot_password_email_not_configured', new Error('Email provider is not configured'));
        return res.status(503).json({
          success: false,
          message: 'Password reset email is not configured',
          errorCode: 'PASSWORD_RESET_EMAIL_NOT_CONFIGURED',
        });
      }

      let otp;
      try {
        otp = await createAndStoreOtp({
          userId: user.id,
          email,
          phone,
        });
      } catch (error) {
        if (error.code === 'OTP_RESEND_COOLDOWN') {
          return res.status(429).json({
            success: false,
            message: 'Please wait before requesting another OTP',
            retryAfterSeconds: error.retryAfterSeconds,
            errorCode: 'OTP_RESEND_COOLDOWN',
          });
        }
        throw error;
      }

      await sendPasswordResetOtpEmail({
        toEmail: email,
        otp,
      });
      return res.status(200).json({
        success: true,
        message: 'OTP sent to your email.',
        data: { phone, email: maskEmail(email) },
      });
    } catch (error) {
      if (error.code === 'EMAIL_SEND_FAILED') {
        logApiError(req, 'auth_forgot_password_email_send_failed', error);
        return res.status(503).json({
          success: false,
          message: 'Password reset email is temporarily unavailable',
          errorCode: 'PASSWORD_RESET_EMAIL_UNAVAILABLE',
        });
      }
      logApiError(req, 'auth_forgot_password_failed', error);
      return jsonClientError(res, req, 500, {
        message: 'Server error',
        errorCode: 'AUTH_FORGOT_PASSWORD_EMAIL_FAILED',
      });
    }
  },
);

router.post(
  '/verify-reset-otp',
  resetVerifyLimiter,
  [
    body('phone').matches(/^\d{10}$/).withMessage('Phone must be 10 digits'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be 6 digits')
      .matches(/^\d{6}$/)
      .withMessage('OTP must be numeric'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }
      const phone = normalizePhone(req.body.phone);
      const email = normalizeEmail(req.body.email);
      const otp = String(req.body.otp || '').trim();
      const resetToken = await verifyOtpAndCreateResetToken({ phone, email, otp });
      return res.status(200).json({
        success: true,
        message: 'OTP verified',
        data: { resetToken },
      });
    } catch (error) {
      if (error.code === 'OTP_INVALID' || error.code === 'OTP_INVALID_OR_EXPIRED') {
        return res.status(400).json({
          success: false,
          message: error.code === 'OTP_INVALID' ? 'Invalid OTP' : 'Invalid or expired OTP',
          attemptsRemaining:
            typeof error.attemptsRemaining === 'number' ? error.attemptsRemaining : undefined,
          errorCode: error.code,
        });
      }
      if (error.code === 'OTP_ATTEMPTS_EXCEEDED') {
        return res.status(429).json({
          success: false,
          message: `OTP attempts exceeded. Request a new OTP.`,
          maxAttempts: OTP_MAX_ATTEMPTS,
          errorCode: error.code,
        });
      }
      logApiError(req, 'auth_verify_reset_otp_failed', error);
      return jsonClientError(res, req, 500, {
        message: 'Server error',
        errorCode: 'AUTH_VERIFY_RESET_OTP_FAILED',
      });
    }
  },
);

router.post(
  '/reset-password',
  resetVerifyLimiter,
  [
    body('phone').matches(/^\d{10}$/).withMessage('Phone must be 10 digits'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('resetToken').isLength({ min: 32 }).withMessage('Valid reset token is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }
      const phone = normalizePhone(req.body.phone);
      const email = normalizeEmail(req.body.email);
      const resetToken = String(req.body.resetToken || '').trim();
      const newPassword = String(req.body.newPassword || '');
      await consumeResetTokenAndUpdatePassword({ phone, email, resetToken, newPassword });
      return res.status(200).json({
        success: true,
        message: 'Password reset successful. Please login with your new password.',
      });
    } catch (error) {
      if (error.code === 'RESET_TOKEN_INVALID') {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token',
          errorCode: error.code,
        });
      }
      logApiError(req, 'auth_reset_password_failed', error);
      return jsonClientError(res, req, 500, {
        message: 'Server error',
        errorCode: 'AUTH_RESET_PASSWORD_FAILED',
      });
    }
  },
);

router.post('/google', authLimiter, async (req, res) => {
  try {
    if (!isFirebaseAdminConfigured) {
      return res.status(503).json({ success: false, message: 'Google sign-in is not configured yet' });
    }

    const { idToken } = req.body || {};
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Google ID token is required' });
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    const displayName = (decoded.name || '').trim() || (decoded.email || '').split('@')[0] || 'Customer';

    // Explicit-link mode: only auto-login by linked Google UID; otherwise create separate account.
    // Phone is NOT auto-generated; users must provide real phone at checkout.
    let user;
    try {
      const byUid = await dbQuery(
        'SELECT id, phone, name, is_admin, token_version, google_uid FROM users WHERE google_uid = $1 LIMIT 1',
        [decoded.uid],
      );
      user = byUid.rows[0];
    } catch (_) {
      user = null;
    }

    if (!user) {
      // Create new user with temporary phone placeholder (real phone to be set at checkout)
      const placeholderHash = await bcrypt.hash(`google:${decoded.uid}`, 10);
      // Use Google UID hash to create a placeholder that won't conflict with real phone numbers
      const tempPhone = `G${decoded.uid.slice(0, 10).padEnd(10, '0')}`;
      const created = await dbQuery(`
        INSERT INTO users (phone, password_hash, name, is_admin, created_at, updated_at, google_uid)
        VALUES ($1, $2, $3, $4, NOW(), NOW(), $5)
        RETURNING id, phone, name, is_admin, token_version, google_uid
      `, [tempPhone, placeholderHash, displayName, false, decoded.uid]);
      user = created.rows[0];
    }

    // Best-effort link columns (for deployments with these columns).
    try {
      await dbQuery(
        `UPDATE users
         SET name = COALESCE(NULLIF($1, ''), name),
             google_uid = COALESCE(google_uid, $2),
             email = COALESCE(email, $3),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [displayName, decoded.uid, decoded.email || null, user.id],
      );
      const refreshed = await dbQuery('SELECT id, phone, name, is_admin, token_version, google_uid, email FROM users WHERE id = $1', [user.id]);
      user = refreshed.rows[0] || user;
    } catch (_) {
      // Ignore if columns are absent.
    }

    const token = issueAuthToken(user);

    setAuthCookie(res, token);
    res.json({ success: true, message: 'Google sign-in successful', data: { user, token } });
  } catch (error) {
    logApiError(req, 'auth_google_failed', error);
    return jsonClientError(res, req, 401, {
      message: 'Google authentication failed',
      errorCode: 'AUTH_GOOGLE_FAILED',
    });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userResult = await dbQuery(
      'SELECT id, phone, name, is_admin, created_at, updated_at, email, google_uid FROM users WHERE id = $1',
      [req.user.id],
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const user = userResult.rows[0];
    res.json({
      success: true,
      data: {
        user: {
          ...user,
          google_linked: !!user.google_uid,
        },
      },
    });
  } catch (error) {
    logApiError(req, 'auth_me_failed', error);
    return jsonClientError(res, req, 401, {
      message: 'Not authenticated',
      errorCode: 'AUTH_ME_FAILED',
    });
  }
});

router.post('/link/google', authenticateToken, async (req, res) => {
  try {
    if (!isFirebaseAdminConfigured) {
      return res.status(503).json({ success: false, message: 'Google sign-in is not configured yet' });
    }
    const { idToken } = req.body || {};
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Google ID token is required' });
    }
    const decoded = await verifyFirebaseIdToken(idToken);

    const owner = await dbQuery(
      'SELECT id FROM users WHERE google_uid = $1 LIMIT 1',
      [decoded.uid],
    );
    if (owner.rows[0] && owner.rows[0].id !== req.user.id) {
      return res.status(409).json({ success: false, message: 'This Google account is already linked to another user' });
    }

    await dbQuery(
      `UPDATE users
       SET google_uid = $1,
           email = COALESCE(email, $2),
           name = COALESCE(NULLIF(name, ''), NULLIF($3, ''), name),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [decoded.uid, decoded.email || null, decoded.name || '', req.user.id],
    );
    const refreshed = await dbQuery(
      'SELECT id, phone, name, is_admin, email, google_uid, created_at, updated_at FROM users WHERE id = $1',
      [req.user.id],
    );
    const user = refreshed.rows[0];
    return res.json({
      success: true,
      message: 'Google account linked successfully',
      data: { user: { ...user, google_linked: !!user.google_uid } },
    });
  } catch (error) {
    logApiError(req, 'auth_link_google_failed', error);
    return jsonClientError(res, req, 400, {
      message: 'Failed to link Google account',
      errorCode: 'AUTH_LINK_GOOGLE_FAILED',
    });
  }
});

router.delete('/link/google', authenticateToken, async (req, res) => {
  try {
    await dbQuery(
      'UPDATE users SET google_uid = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [req.user.id],
    );
    const refreshed = await dbQuery(
      'SELECT id, phone, name, is_admin, email, google_uid, created_at, updated_at FROM users WHERE id = $1',
      [req.user.id],
    );
    const user = refreshed.rows[0];
    return res.json({
      success: true,
      message: 'Google account unlinked successfully',
      data: { user: { ...user, google_linked: !!user.google_uid } },
    });
  } catch (error) {
    logApiError(req, 'auth_unlink_google_failed', error);
    return jsonClientError(res, req, 400, {
      message: 'Failed to unlink Google account',
      errorCode: 'AUTH_UNLINK_GOOGLE_FAILED',
    });
  }
});

router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone } = req.body;

    // FIX #13: If phone is being updated, validate format and uniqueness
    let normalizedPhone = undefined;
    if (phone !== undefined && phone !== null) {
      normalizedPhone = String(phone).replace(/\D/g, '').slice(-10);
      if (!/^\d{10}$/.test(normalizedPhone)) {
        return res.status(400).json({ success: false, message: 'Phone must be a valid 10-digit number' });
      }
      // Check uniqueness against other users
      const existing = await dbQuery(
        'SELECT id FROM users WHERE phone = $1 AND id != $2 LIMIT 1',
        [normalizedPhone, req.user.id],
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'This phone number is already registered' });
      }
    }

    const result = await dbQuery(`
      UPDATE users
      SET name = COALESCE($1, name),
          phone = COALESCE($2, phone),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, name, phone, is_admin, created_at, updated_at
    `, [name ? name.trim() : null, normalizedPhone || null, req.user.id]);

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'Profile updated', data: { user: result.rows[0] } });
  } catch (error) {
    logApiError(req, 'auth_profile_update_failed', error);
    return jsonClientError(res, req, 500, {
      message: 'Server error',
      errorCode: 'AUTH_PROFILE_UPDATE_FAILED',
    });
  }
});

// Update user phone number (required for Google-logged-in users at checkout)
router.put('/phone', authenticateToken, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    // Validate and normalize phone: must be 10 digits
    const normalizedPhone = String(phone).replace(/\D/g, '').slice(-10);
    if (!/^\d{10}$/.test(normalizedPhone)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit phone number' });
    }

    // Check if phone is already registered by another user
    const existing = await dbQuery(
      'SELECT id FROM users WHERE phone = $1 AND id != $2 LIMIT 1',
      [normalizedPhone, req.user.id],
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'This phone number is already registered' });
    }

    // Update user phone
    const result = await dbQuery(
      'UPDATE users SET phone = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, phone, name, is_admin, email, google_uid, token_version',
      [normalizedPhone, req.user.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = result.rows[0];
    res.json({ success: true, message: 'Phone number updated successfully', data: { user } });
  } catch (error) {
    logApiError(req, 'auth_phone_update_failed', error);
    return jsonClientError(res, req, 500, {
      message: 'Failed to update phone number',
      errorCode: 'AUTH_PHONE_UPDATE_FAILED',
    });
  }
});

// Logout endpoint — clear httpOnly cookie and optionally revoke session
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Clear the httpOnly cookie by setting maxAge to 0
    res.clearCookie('authToken', getAuthCookieOptions());

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logApiError(req, 'auth_logout_failed', error);
    return jsonClientError(res, req, 500, {
      message: 'Server error during logout',
      errorCode: 'AUTH_LOGOUT_FAILED',
    });
  }
});

// Token refresh endpoint — issue new token with fresh expiration
router.post('/refresh', async (req, res) => {
  try {
    let token = null;

    // Try to get token from Authorization header first
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.split(' ')[1]) {
      token = authHeader.split(' ')[1];
    }

    // Fall back to httpOnly cookie if no Authorization header
    if (!token) {
      token = req.cookies?.authToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token required for refresh',
      });
    }

    // Verify token signature (allows expired tokens)
    let decoded;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch (error) {
      // For expired tokens, we can still use jwt.decode to get the payload
      if (error.name === 'TokenExpiredError') {
        decoded = jwt.decode(token);
      } else {
        return res.status(401).json({
          success: false,
          message: 'Invalid token',
        });
      }
    }

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload',
      });
    }

    // Fetch fresh user data and verify token_version (allows session revocation)
    const userResult = await dbQuery(
      'SELECT id, phone, name, is_admin, token_version FROM users WHERE id = $1',
      [decoded.id],
    );

    if (userResult.rows.length === 0) {
      res.clearCookie('authToken', getAuthCookieOptions());
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = userResult.rows[0];
    const tokenVersion = Number.isFinite(decoded.token_version) ? decoded.token_version : 0;
    const currentTokenVersion = Number.isFinite(user.token_version) ? user.token_version : 0;

    // If token_version doesn't match, session was revoked
    if (tokenVersion !== currentTokenVersion) {
      res.clearCookie('authToken', getAuthCookieOptions());
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please login again.',
      });
    }

    // Issue new token
    const newToken = issueAuthToken(user);
    setAuthCookie(res, newToken);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          is_admin: user.is_admin,
        },
      },
    });
  } catch (error) {
    logApiError(req, 'auth_refresh_failed', error);
    return jsonClientError(res, req, 500, {
      message: 'Server error during token refresh',
      errorCode: 'AUTH_REFRESH_FAILED',
    });
  }
});

module.exports = router;
