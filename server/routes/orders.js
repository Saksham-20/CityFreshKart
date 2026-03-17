const express = require('express');
const { query, pool } = require('../database/config');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// @route   GET /api/orders
// @desc    Get user's order history
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const orders = await query(`
      SELECT 
        o.*,
        COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT $2 OFFSET $3
    `, [req.user.id, parseInt(limit), offset]);

    // Get total count
    const totalCount = await query(
      'SELECT COUNT(*) as total FROM orders WHERE user_id = $1',
      [req.user.id],
    );

    const total = parseInt(totalCount.rows[0].total);

    res.json({
      success: true,
      data: {
        orders: orders.rows,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Server error' } });
  }
});

// @route   GET /api/orders/:id
// @desc    Get order details
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get order
    const orderResult = await query(
      `SELECT o.* FROM orders o WHERE o.id = $1 AND o.user_id = $2`,
      [id, req.user.id],
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } });
    }

    // Get order items
    const orderItems = await query(`
      SELECT 
        oi.*,
        p.name as product_name,
        p.image as product_image
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `, [id]);

    const order = orderResult.rows[0];

    res.json({
      success: true,
      data: {
        order,
        items: orderItems.rows,
      },
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Server error' } });
  }
});

// @route   POST /api/orders
// @desc    Create a new order
// @access  Private
router.post('/', authenticateToken, [
  body('items').isArray({ min: 1 }).withMessage('Items are required'),
  body('shipping_address').isObject().withMessage('Shipping address is required'),
  body('payment_method').notEmpty().withMessage('Payment method is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Validation failed' },
        errors: errors.array(),
      });
    }

    const { items, shipping_address, billing_address, payment_method, coupon_code, notes } = req.body;

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create shipping address (save for records)
      const addressResult = await client.query(`
        INSERT INTO user_addresses (user_id, first_name, last_name, address_line, city, state, postal_code, phone, is_default)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        req.user.id,
        shipping_address.firstName || shipping_address.first_name || '', 
        shipping_address.lastName || shipping_address.last_name || '',
        shipping_address.addressLine1 || shipping_address.address_line || shipping_address.addressLine || '',
        shipping_address.city || '', 
        shipping_address.state || '',
        shipping_address.postalCode || shipping_address.postal_code || shipping_address.zip || '',
        shipping_address.phone || '', 
        false,
      ]);

      const billingAddr = billing_address || shipping_address;
      // Billing address uses same table with snake_case columns
      const billingResult = await client.query(`
        INSERT INTO user_addresses (user_id, first_name, last_name, address_line, city, state, postal_code, phone, is_default)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        req.user.id,
        billingAddr.firstName || billingAddr.first_name || '', billingAddr.lastName || billingAddr.last_name || '',
        billingAddr.addressLine1 || billingAddr.address_line_1 || billingAddr.address1 || billingAddr.address_line || '',
        billingAddr.city || '', billingAddr.state || '',
        billingAddr.postalCode || billingAddr.postal_code || billingAddr.zip || '',
        billingAddr.phone || '', false,
      ]);

      // Calculate subtotal with weight-based pricing
      let subtotal = 0;
      for (const item of items) {
        const itemPrice = item.price_per_kg
          ? (parseFloat(item.price_per_kg) * parseFloat(item.weight || 1) * parseInt(item.quantity || 1))
          : (parseFloat(item.price || 0) * parseInt(item.quantity || 1));
        subtotal += itemPrice;
      }

      // Apply coupon if provided (coupons table not available - skip silently)
      let discountAmount = 0;
      if (coupon_code) {
        // Coupon system not configured, skip silently
      }

      const deliveryFee = subtotal >= 300 ? 0 : 30;
      const totalAmount = parseFloat((subtotal - discountAmount + deliveryFee).toFixed(2));

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Create order
      const orderResult = await client.query(`
        INSERT INTO orders (order_number, user_id, status, subtotal, delivery_fee, discount, total, payment_status, payment_method, address_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        orderNumber, req.user.id, 'pending', subtotal.toFixed(2),
        deliveryFee, discountAmount.toFixed(2), totalAmount,
        'pending', payment_method, addressResult.rows[0].id,
      ]);

      const order = orderResult.rows[0];

      // Create order items
      for (const item of items) {
        const unitPrice = item.price_per_kg
          ? parseFloat((parseFloat(item.price_per_kg) * parseFloat(item.weight || 1)).toFixed(2))
          : parseFloat(item.price_per_kg || 0);
        const totalPrice = parseFloat((unitPrice * parseInt(item.quantity || 1)).toFixed(2));

        await client.query(`
          INSERT INTO order_items (order_id, product_id, product_name, quantity, weight, price_per_kg, discount, total_price)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          order.id,
          item.product_id || item.id,
          item.name || item.product_name || '',
          parseInt(item.quantity || 1),
          item.weight ? parseFloat(item.weight) : null,
          parseFloat(item.price_per_kg || 0),
          parseFloat(item.discount || 0),
          totalPrice,
        ]);

        // Update product stock
        await client.query(`
          UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2
        `, [parseInt(item.quantity || 1), item.product_id || item.id]);
      }

      // Clear user's cart
      await client.query(`
        DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = $1)
      `, [req.user.id]);

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        data: {
          order,
          orderNumber: order.order_number,
          subtotal: parseFloat(subtotal.toFixed(2)),
          discount: parseFloat(discountAmount.toFixed(2)),
          deliveryFee,
          total: totalAmount,
          paymentStatus: 'pending',
        },
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Server error' } });
  }
});

// @route   POST /api/orders/:id/cancel
// @desc    Cancel an order
// @access  Private
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if order exists and belongs to user
    const order = await query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [id, req.user.id],
    );

    if (order.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if order can be cancelled
    if (order.rows[0].status === 'cancelled') {
      return res.status(400).json({ message: 'Order is already cancelled' });
    }

    if (order.rows[0].status === 'delivered') {
      return res.status(400).json({ message: 'Cannot cancel delivered order' });
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update order status
      await client.query(
        'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['cancelled', id],
      );

      // Restore product stock
      const orderItems = await client.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
        [id],
      );

      for (const item of orderItems.rows) {
        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2',
          [item.quantity, item.product_id],
        );
      }

      await client.query('COMMIT');

      res.json({ success: true, data: { message: 'Order cancelled successfully' } });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/orders/:id
// @desc    Update order status (admin only)
// @access  Private (Admin)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // Check if user is admin
    const user = await query(
      'SELECT is_admin FROM users WHERE id = $1',
      [req.user.id],
    );

    if (!user.rows[0]?.is_admin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update order
    const result = await query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({ success: true, data: { order: result.rows[0] } });

  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
