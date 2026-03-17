/**
 * OTP Authentication Service
 * Handles phone-based OTP generation, validation, and user authentication
 * 
 * IMPORTANT: This replaces email/password authentication for the hyperlocal PWA.
 * Users authenticate via phone number + 6-digit OTP only.
 */

const { query } = require('../database/config');

class OTPService {
  /**
   * Generate a random 6-digit OTP
   */
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Normalize phone number to format +91XXXXXXXXXX or +1XXXXXXXXXX
   */
  normalizePhone(phone) {
    if (phone.startsWith('+')) return phone;
    const digits = phone.replace(/\D/g, '').slice(-10);
    return `+91${digits}`;
  }

  /**
   * Send OTP to user via SMS (MSG91 or Firebase)
   * TODO: Integrate with MSG91 API or Firebase
   */
  async sendOTP(phone, otp) {
    try {
      // TODO: Implement SMS delivery
      // For now, log to console (development only)
      console.log(`📱 OTP for ${phone}: ${otp}`);
      return true;
    } catch (error) {
      console.error('Failed to send OTP:', error);
      return false;
    }
  }

  /**
   * Request OTP for phone number
   * Creates or retrieves user, generates OTP, sends it
   */
  async requestOTP(phone) {
    try {
      const normalized = this.normalizePhone(phone);
      const otp = this.generateOTP();

      // Check if user exists
      let userResult = await query('SELECT id FROM users WHERE phone = $1', [normalized]);

      let userId;
      if (userResult.rows.length === 0) {
        // Create new user with just phone and auto-generated name
        const tempName = `User${normalized.slice(-4)}`;
        const newUser = await query(
          `INSERT INTO users (phone, first_name, last_name, email, password_hash)
           VALUES ($1, $2, '', $3, 'N/A')
           RETURNING id`,
          [normalized, tempName, `${normalized.replace('+', '')}@placeholder.local`]
        );
        userId = newUser.rows[0].id;
      } else {
        userId = userResult.rows[0].id;
      }

      // Delete any existing OTP sessions for this user
      await query('DELETE FROM otp_sessions WHERE user_id = $1', [userId]);

      // Store OTP with 5-minute expiry
      const expiryTime = new Date(Date.now() + 5 * 60 * 1000);
      await query(
        'INSERT INTO otp_sessions (user_id, phone, otp, expires_at) VALUES ($1, $2, $3, $4)',
        [userId, normalized, otp, expiryTime]
      );

      // Send OTP via SMS
      await this.sendOTP(normalized, otp);

      return {
        success: true,
        userId,
        message: `OTP sent to ${normalized}`
      };
    } catch (error) {
      console.error('Error requesting OTP:', error);
      throw error;
    }
  }

  /**
   * Verify OTP and return JWT token
   */
  async verifyOTP(userId, otp) {
    try {
      // Find valid OTP session
      const sessionResult = await query(
        `SELECT * FROM otp_sessions 
         WHERE user_id = $1 AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );

      if (sessionResult.rows.length === 0) {
        return {
          success: false,
          message: 'OTP expired. Please request a new one.'
        };
      }

      const session = sessionResult.rows[0];

      // Verify OTP
      if (session.otp !== otp) {
        return {
          success: false,
          message: 'Invalid OTP'
        };
      }

      // Delete the used session
      await query('DELETE FROM otp_sessions WHERE id = $1', [session.id]);

      // Get user details
      const userResult = await query(
        'SELECT id, phone, first_name, last_name, is_admin FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      const user = userResult.rows[0];

      // Generate JWT token
      const token = require('jsonwebtoken').sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        success: true,
        token,
        user: {
          id: user.id,
          phone: user.phone,
          name: `${user.first_name} ${user.last_name}`.trim(),
          is_admin: user.is_admin
        }
      };

    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw error;
    }
  }
}

module.exports = new OTPService();
