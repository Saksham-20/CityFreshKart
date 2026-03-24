const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const { getJwtSecret } = require('../config/jwt');
const { isFirebaseAdminConfigured, verifyFirebaseIdToken } = require('../services/firebaseAdmin');

// Safe db query accessor
const dbQuery = async (text, params) => {
  const db = require('../database/config');
  const pool = db.pool || db;
  return pool.query(text, params);
};

const setAuthCookie = (res, token) => {
  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
};

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { phone, password, name } = req.body;
    if (!phone || !password || !name) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const existingUser = await dbQuery('SELECT id FROM users WHERE phone = $1', [phone]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Phone already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userResult = await dbQuery(`
      INSERT INTO users (phone, password_hash, name, is_admin, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id, phone, name, is_admin, created_at
    `, [phone, passwordHash, name, false]);

    const user = userResult.rows[0];

    const token = jwt.sign(
      { id: user.id, is_admin: user.is_admin },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    setAuthCookie(res, token);
    res.status(201).json({ success: true, message: 'Registered successfully', data: { user, token } });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Phone and password required' });
    }

    const userResult = await dbQuery('SELECT id, phone, password_hash, name, is_admin FROM users WHERE phone = $1', [phone]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, is_admin: user.is_admin },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    setAuthCookie(res, token);
    res.json({ success: true, message: 'Logged in successfully', data: { user: { id: user.id, phone: user.phone, name: user.name, is_admin: user.is_admin }, token } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

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
    const syntheticPhone = `9${String(Math.abs([...decoded.uid].reduce((a, c) => a + c.charCodeAt(0), 0))).padStart(9, '0').slice(0, 9)}`;

    // Prefer an existing account linked by Firebase UID, then by email (if column exists), else create.
    let user;
    try {
      const byUid = await dbQuery(
        'SELECT id, phone, name, is_admin FROM users WHERE google_uid = $1 LIMIT 1',
        [decoded.uid],
      );
      user = byUid.rows[0];
    } catch (_) {
      user = null;
    }

    if (!user && decoded.email) {
      try {
        const byEmail = await dbQuery(
          'SELECT id, phone, name, is_admin FROM users WHERE email = $1 LIMIT 1',
          [decoded.email],
        );
        user = byEmail.rows[0];
      } catch (_) {
        user = null;
      }
    }

    if (!user) {
      const existingByPhone = await dbQuery('SELECT id, phone, name, is_admin FROM users WHERE phone = $1 LIMIT 1', [syntheticPhone]);
      if (existingByPhone.rows[0]) {
        user = existingByPhone.rows[0];
      } else {
        const placeholderHash = await bcrypt.hash(`google:${decoded.uid}`, 10);
        const created = await dbQuery(`
          INSERT INTO users (phone, password_hash, name, is_admin, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          RETURNING id, phone, name, is_admin
        `, [syntheticPhone, placeholderHash, displayName, false]);
        user = created.rows[0];
      }
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
      const refreshed = await dbQuery('SELECT id, phone, name, is_admin FROM users WHERE id = $1', [user.id]);
      user = refreshed.rows[0] || user;
    } catch (_) {
      // Ignore if columns are absent.
    }

    const token = jwt.sign(
      { id: user.id, is_admin: user.is_admin },
      getJwtSecret(),
      { expiresIn: '7d' },
    );

    setAuthCookie(res, token);
    res.json({ success: true, message: 'Google sign-in successful', data: { user, token } });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ success: false, message: 'Google authentication failed' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userResult = await dbQuery('SELECT id, phone, name, is_admin, created_at, updated_at FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: { user: userResult.rows[0] } });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
  }
});

router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const result = await dbQuery(`
      UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone), updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 RETURNING id, name, phone, is_admin, created_at, updated_at
    `, [name, phone, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'Profile updated', data: { user: result.rows[0] } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
