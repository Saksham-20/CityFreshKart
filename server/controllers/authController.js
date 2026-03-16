const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../database/config');
const emailService = require('../services/emailService');

const authController = {
  // Register a new user
  async register(req, res) {
    try {
      const { email, password, first_name, last_name, phone } = req.body;

      // Check if phone is provided (required for login)
      if (!phone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required',
        });
      }

      // Check if user already exists by email
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email],
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists',
        });
      }

      // Check if phone is already registered
      const existingPhone = await pool.query(
        'SELECT id FROM users WHERE phone = $1',
        [phone],
      );

      if (existingPhone.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'User with this phone number already exists',
        });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Generate email verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      // Create user with verification token
      const result = await pool.query(
        'INSERT INTO users (email, password_hash, first_name, last_name, phone, email_verification_token, email_verification_token_expiry) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, first_name, last_name, phone, is_admin, is_verified, created_at',
        [email, hashedPassword, first_name, last_name, phone, verificationToken, tokenExpiry],
      );

      const user = result.rows[0];

      // Send verification email
      try {
        await emailService.sendEmailVerification(user, verificationToken);
      } catch (emailError) {
        console.error('Error sending verification email:', emailError);
        // Don't fail registration if email fails, but log the error
      }

      res.status(201).json({
        success: true,
        message: 'User registered successfully. Please check your email to verify your account.',
        data: {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            phone: user.phone,
            is_admin: user.is_admin,
            is_verified: user.is_verified,
          },
          requiresEmailVerification: true,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during registration',
      });
    }
  },

  // Login user
  async login(req, res) {
    try {
      const { phone, password } = req.body;

      // Find user by phone number
      const result = await pool.query(
        'SELECT id, email, password_hash, first_name, last_name, phone, is_admin, is_verified FROM users WHERE phone = $1',
        [phone],
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid phone number or password',
        });
      }

      const user = result.rows[0];

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid phone number or password',
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' },
      );

      // Set httpOnly cookie (secure in production)
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
        path: '/',
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            phone: user.phone,
            is_admin: user.is_admin,
            is_verified: user.is_verified,
          },
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during login',
      });
    }
  },

  // Get current user profile
  async getProfile(req, res) {
    try {
      const result = await pool.query(
        'SELECT id, email, first_name, last_name, phone, is_admin, is_verified, created_at, updated_at FROM users WHERE id = $1',
        [req.user.id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const user = result.rows[0];
      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            phone: user.phone,
            is_admin: user.is_admin,
            is_verified: user.is_verified,
            created_at: user.created_at,
            updated_at: user.updated_at,
          },
        },
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while fetching profile',
      });
    }
  },

  // Update user profile
  async updateProfile(req, res) {
    try {
      const { first_name, last_name, phone } = req.body;
      const userId = req.user.id;

      // Update user
      const result = await pool.query(
        'UPDATE users SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name), phone = COALESCE($3, phone), updated_at = NOW() WHERE id = $4 RETURNING id, email, first_name, last_name, phone, is_admin, is_verified, updated_at',
        [first_name, last_name, phone, userId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const user = result.rows[0];
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            phone: user.phone,
            is_admin: user.is_admin,
            is_verified: user.is_verified,
            updated_at: user.updated_at,
          },
        },
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while updating profile',
      });
    }
  },

  // Change password
  async changePassword(req, res) {
    try {
      const { current_password, new_password } = req.body;
      const userId = req.user.id;

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

      // Get current password hash
      const result = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        current_password,
        result.rows[0].password_hash,
      );

      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(new_password, saltRounds);

      // Update password
      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [hashedNewPassword, userId],
      );

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while changing password',
      });
    }
  },
};

module.exports = authController;
