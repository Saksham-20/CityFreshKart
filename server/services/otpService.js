/**
 * OTP Authentication Service
 * Handles phone-based OTP generation, validation, and user authentication
 * 
 * IMPORTANT: This replaces email/password authentication for the hyperlocal PWA.
 * Users authenticate via phone number + 6-digit OTP only.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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

      // Check if user exists using Prisma
      let user = await prisma.user.findUnique({
        where: { phone: normalized }
      });

      let userId;
      if (!user) {
        // Create new user with just phone and auto-generated name
        const name = `User-${normalized.slice(-4)}`; // Temp name
        const newUser = await prisma.user.create({
          data: { phone: normalized, name }
        });
        userId = newUser.id;
      } else {
        userId = user.id;
      }

      // Store OTP with 5-minute expiry
      const expiryTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      await prisma.oTPSession.create({
        data: {
          userId,
          phone: normalized,
          otp,
          expiresAt: expiryTime
        }
      });

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
      const session = await prisma.oTPSession.findFirst({
        where: {
          userId,
          expiresAt: {
            gt: new Date() // Greater than now
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (!session) {
        return {
          success: false,
          message: 'OTP expired. Please request a new one.'
        };
      }

      // Verify OTP
      if (session.otp !== otp) {
        return {
          success: false,
          message: 'Invalid OTP'
        };
      }

      // Mark session as used
      await prisma.oTPSession.delete({
        where: { id: session.id }
      });

      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          phone: true,
          name: true,
          isAdmin: true
        }
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

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
          name: user.name,
          is_admin: user.isAdmin
        }
      };

    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw error;
    }
  }
}

module.exports = new OTPService();
