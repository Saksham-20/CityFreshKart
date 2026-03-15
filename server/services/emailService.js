const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  // Initialize email transporter
  async initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      // Verify connection
      await this.transporter.verify();
      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.transporter = null;
    }
  }

  // Send welcome email to new users
  async sendWelcomeEmail(user) {
    try {
      if (!this.transporter) {
        throw new Error('Email service not initialized');
      }

      const mailOptions = {
        from: `"${process.env.APP_NAME || 'CityFreshKart'}" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: 'Welcome to CityFreshKart!',
        html: this.getWelcomeEmailTemplate(user),
      };

      const result = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      throw new Error('Failed to send welcome email');
    }
  }

  // Send order confirmation email
  async sendOrderConfirmation(order, user) {
    try {
      if (!this.transporter) {
        throw new Error('Email service not initialized');
      }

      const mailOptions = {
        from: `"${process.env.APP_NAME || 'CityFreshKart'}" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: `Order Confirmation #${order.order_number}`,
        html: this.getOrderConfirmationTemplate(order, user),
      };

      const result = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Failed to send order confirmation:', error);
      throw new Error('Failed to send order confirmation');
    }
  }

  // Send password reset email
  async sendPasswordReset(user, resetToken) {
    try {
      if (!this.transporter) {
        throw new Error('Email service not initialized');
      }

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

      const mailOptions = {
        from: `"${process.env.APP_NAME || 'CityFreshKart'}" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: 'Password Reset Request',
        html: this.getPasswordResetTemplate(user, resetUrl),
      };

      const result = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  // Send order status update email
  async sendOrderStatusUpdate(order, user, status) {
    try {
      if (!this.transporter) {
        throw new Error('Email service not initialized');
      }

      const mailOptions = {
        from: `"${process.env.APP_NAME || 'CityFreshKart'}" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: `Order Status Update #${order.order_number}`,
        html: this.getOrderStatusUpdateTemplate(order, user, status),
      };

      const result = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Failed to send order status update:', error);
      throw new Error('Failed to send order status update');
    }
  }

  // Send shipping confirmation email
  async sendShippingConfirmation(order, user, trackingNumber) {
    try {
      if (!this.transporter) {
        throw new Error('Email service not initialized');
      }

      const mailOptions = {
        from: `"${process.env.APP_NAME || 'CityFreshKart'}" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: `Your Order Has Shipped #${order.order_number}`,
        html: this.getShippingConfirmationTemplate(order, user, trackingNumber),
      };

      const result = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Failed to send shipping confirmation:', error);
      throw new Error('Failed to send shipping confirmation');
    }
  }

  // Email templates
  getWelcomeEmailTemplate(user) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to CityFreshKart!</h2>
        <p>Hello ${user.first_name || user.email},</p>
        <p>Thank you for joining the CityFreshKart family! We're excited to deliver farm-fresh produce to your doorstep.</p>
        <p>Here's what you can do:</p>
        <ul>
          <li>Browse our wide range of fresh vegetables and fruits</li>
          <li>Create your personal wishlist</li>
          <li>Enjoy same-day delivery — order before 11 AM</li>
          <li>Get personalized recommendations</li>
        </ul>
        <p>If you have any questions, feel free to contact our support team.</p>
        <p>Happy shopping!</p>
        <p>Best regards,<br>The CityFreshKart Team</p>
      </div>
    `;
  }

  getOrderConfirmationTemplate(order, user) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order Confirmation</h2>
        <p>Hello ${user.first_name || user.email},</p>
        <p>Thank you for your order! We've received your order and it's being processed.</p>
        <h3>Order Details:</h3>
        <p><strong>Order Number:</strong> #${order.order_number}</p>
        <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
        <p><strong>Total Amount:</strong> $${order.total_amount}</p>
        <p>We'll send you another email when your order ships with tracking information.</p>
        <p>If you have any questions, please contact our support team.</p>
        <p>Thank you for choosing CityFreshKart!</p>
        <p>Best regards,<br>The CityFreshKart Team</p>
      </div>
    `;
  }

  getPasswordResetTemplate(user, resetUrl) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hello ${user.first_name || user.email},</p>
        <p>We received a request to reset your password. Click the link below to create a new password:</p>
        <p><a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <p>This link will expire in 1 hour for security reasons.</p>
        <p>Best regards,<br>The CityFreshKart Team</p>
      </div>
    `;
  }

  getOrderStatusUpdateTemplate(order, user, status) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order Status Update</h2>
        <p>Hello ${user.first_name || user.email},</p>
        <p>Your order status has been updated:</p>
        <h3>Order Details:</h3>
        <p><strong>Order Number:</strong> #${order.order_number}</p>
        <p><strong>New Status:</strong> ${status}</p>
        <p><strong>Update Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p>We'll keep you updated on any further changes to your order.</p>
        <p>Thank you for your patience!</p>
        <p>Best regards,<br>The CityFreshKart Team</p>
      </div>
    `;
  }

  getShippingConfirmationTemplate(order, user, trackingNumber) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Your Order Has Shipped!</h2>
        <p>Hello ${user.first_name || user.email},</p>
        <p>Great news! Your order has been shipped and is on its way to you.</p>
        <h3>Shipping Details:</h3>
        <p><strong>Order Number:</strong> #${order.order_number}</p>
        <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
        <p><strong>Shipping Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p>You can track your package using the tracking number above.</p>
        <p>We hope you love your new items!</p>
        <p>Best regards,<br>The CityFreshKart Team</p>
      </div>
    `;
  }
}

module.exports = new EmailService();
