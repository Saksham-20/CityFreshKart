/**
 * CRITICAL BACKEND IMPLEMENTATIONS - Copy & Integrate
 * These are template implementations for remaining features.
 * Adjust paths and error handling as needed for your setup.
 */

// ============================================
// FILE: server/routes/auth-new.js
// ============================================
// Replace old auth.js with this or add these routes to existing auth.js

const express = require('express');
const router = express.Router();
const otpService = require('../services/otpService');
const { authenticateToken } = require('../middleware/auth');
const pool = require('../database/config');
const jwt = require('jsonwebtoken');

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

    // Set httpOnly cookie with JWT token
    res.cookie('authToken', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

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

module.exports = router;


// ============================================
// FILE: server/routes/admin-new.js
// ============================================
// Basic admin dashboard and management routes

const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const pool = require('../database/config');

/**
 * @route   GET /api/admin/dashboard
 * @desc    Admin dashboard stats
 * @access  Private (admin only)
 */
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Total orders today
    const ordersToday = await pool.query(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE DATE(created_at) = CURRENT_DATE
    `);

    // Revenue today
    const revenueToday = await pool.query(`
      SELECT SUM(total) as revenue 
      FROM orders 
      WHERE DATE(created_at) = CURRENT_DATE
    `);

    // Pending orders
    const pendingOrders = await pool.query(`
      SELECT COUNT(*) as count FROM orders WHERE status = 'pending'
    `);

    // Top products
    const topProducts = await pool.query(`
      SELECT 
        p.id, 
        p.name, 
        COUNT(oi.id) as order_count
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      GROUP BY p.id
      ORDER BY order_count DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        orders_today: parseInt(ordersToday.rows[0].count || 0),
        revenue_today: parseFloat(revenueToday.rows[0].revenue || 0),
        pending_orders: parseInt(pendingOrders.rows[0].count || 0),
        top_products: topProducts.rows
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard'
    });
  }
});

/**
 * @route   GET /api/admin/products
 * @desc    List all products
 * @access  Private (admin only)
 */
router.get('/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.price_per_kg,
        p.discount,
        p.stock_quantity,
        p.is_active,
        c.name as category_name,
        p.created_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json({
      success: true,
      data: {
        products: result.rows
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to load products'
    });
  }
});

/**
 * @route   POST /api/admin/products
 * @desc    Create new product
 * @access  Private (admin only)
 */
router.post('/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, pricePerKg, discount, categoryId, image } = req.body;

    if (!name || !pricePerKg) {
      return res.status(400).json({
        success: false,
        message: 'Name and price_per_kg required'
      });
    }

    const slug = name.toLowerCase().replace(/\s+/g, '-');

    const result = await pool.query(`
      INSERT INTO products (name, slug, description, price_per_kg, discount, category_id, image, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING id, name, price_per_kg, discount
    `, [name, slug, description, pricePerKg, discount || 0, categoryId, image]);

    res.status(201).json({
      success: true,
      message: 'Product created',
      data: {
        product: result.rows[0]
      }
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product'
    });
  }
});

/**
 * @route   PUT /api/admin/products/:id
 * @desc    Update product
 * @access  Private (admin only)
 */
router.put('/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, pricePerKg, discount, isActive } = req.body;

    const result = await pool.query(`
      UPDATE products 
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          price_per_kg = COALESCE($3, price_per_kg),
          discount = COALESCE($4, discount),
          is_active = COALESCE($5, is_active),
          updated_at = NOW()
      WHERE id = $6
      RETURNING id, name, price_per_kg
    `, [name, description, pricePerKg, discount, isActive, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product updated',
      data: {
        product: result.rows[0]
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update product'
    });
  }
});

/**
 * @route   DELETE /api/admin/products/:id
 * @desc    Delete product
 * @access  Private (admin only)
 */
router.delete('/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM products WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Product deleted'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete product'
    });
  }
});

/**
 * @route   GET /api/admin/orders
 * @desc    List all orders
 * @access  Private (admin only)
 */
router.get('/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        o.id,
        o.order_number,
        o.total,
        o.status,
        o.created_at,
        u.name as user_name,
        u.phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
    `;

    const params = [];
    if (status) {
      query += ` WHERE o.status = $1`;
      params.push(status);
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: {
        orders: result.rows
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to load orders'
    });
  }
});

/**
 * @route   PUT /api/admin/orders/:id/status
 * @desc    Update order status
 * @access  Private (admin only)
 */
router.put('/orders/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const result = await pool.query(`
      UPDATE orders 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, order_number, status
    `, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order status updated',
      data: {
        order: result.rows[0]
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
});

module.exports = router;
