const express = require('express');
const { query, pool } = require('../database/config');
const { authenticateToken } = require('../middleware/auth');
const webPushService = require('../services/webPushService');

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
      'SELECT o.* FROM orders o WHERE o.id = $1 AND o.user_id = $2',
      [id, req.user.id],
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } });
    }

    // Get order items
    const orderItems = await query(`
      SELECT
        oi.*,
        p.image_url as product_image
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
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

// Helper: fetch a single store setting value (falls back to default if table not ready)
async function getSetting(key, defaultValue) {
  try {
    const result = await query('SELECT value FROM store_settings WHERE key = $1', [key]);
    if (result.rows.length > 0) return parseFloat(result.rows[0].value) || defaultValue;
  } catch (_) { /* table may not exist yet on first run */ }
  return defaultValue;
}

// @route   POST /api/orders
// @desc    Create a new order
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      items, delivery_address, notes,
      payment_method = 'cod',
      razorpay_payment_id, razorpay_order_id,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Items are required' } });
    }

    if (!delivery_address || !delivery_address.trim()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Delivery address is required' } });
    }

    // Load dynamic settings from DB
    const freeDeliveryThreshold = await getSetting('free_delivery_threshold', 300);
    const deliveryFeeAmount = await getSetting('delivery_fee', 50);
    const minOrderAmount = await getSetting('min_order_amount', 0);

    const uniqueProductIds = [...new Set(items.map(item => item.product_id).filter(Boolean))];
    if (uniqueProductIds.length !== items.length) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Each order item must reference a valid unique product' } });
    }

    const productsResult = await query(
      `SELECT id, name, price_per_kg, discount, pricing_type, is_active
       FROM products
       WHERE id = ANY($1::uuid[])`,
      [uniqueProductIds],
    );
    const productsById = new Map(productsResult.rows.map(p => [p.id, p]));

    for (const item of items) {
      const product = productsById.get(item.product_id);
      if (!product || !product.is_active) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'One or more items are invalid or unavailable' } });
      }
      const qty = parseFloat(item.quantity_kg || 0);
      if (!Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid item quantity' } });
      }
    }

    // Recalculate totals strictly from DB values for integrity
    let subtotal = 0;
    for (const item of items) {
      const product = productsById.get(item.product_id);
      const pricePerKg = parseFloat(product.price_per_kg || 0);
      const quantityKg = parseFloat(item.quantity_kg || 0);
      const discount = parseFloat(product.discount || 0);
      const itemTotal = pricePerKg * quantityKg * (1 - discount / 100);
      subtotal += itemTotal;
    }
    subtotal = parseFloat(subtotal.toFixed(2));

    if (minOrderAmount > 0 && subtotal < minOrderAmount) {
      return res.status(400).json({
        success: false,
        error: { code: 'MIN_ORDER', message: `Minimum order amount is ₹${minOrderAmount}` },
      });
    }

    const deliveryFee = subtotal >= freeDeliveryThreshold ? 0 : deliveryFeeAmount;
    const totalPrice = parseFloat((subtotal + deliveryFee).toFixed(2));

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert order — includes notes and optional razorpay fields
      const orderResult = await client.query(`
        INSERT INTO orders (order_number, user_id, phone, delivery_address, notes, subtotal, delivery_fee, total_price, payment_method, razorpay_payment_id, razorpay_order_id, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        orderNumber,
        req.user.id,
        req.user.phone,
        delivery_address.trim(),
        notes ? notes.trim() : null,
        subtotal,
        deliveryFee,
        totalPrice,
        payment_method,
        razorpay_payment_id || null,
        razorpay_order_id || null,
        'pending',
      ]);

      const order = orderResult.rows[0];

      // Insert order items — include pricing_type snapshot
      for (const item of items) {
        const product = productsById.get(item.product_id);
        const pricePerKg = parseFloat(product.price_per_kg || 0);
        const quantityKg = parseFloat(item.quantity_kg || 0);
        const discount = parseFloat(product.discount || 0);
        const itemTotal = parseFloat((pricePerKg * quantityKg * (1 - discount / 100)).toFixed(2));
        const pricingType = product.pricing_type || 'per_kg';

        await client.query(`
          INSERT INTO order_items (order_id, product_id, product_name, quantity_kg, price_per_kg, total_price, pricing_type)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          order.id,
          item.product_id,
          product.name || '',
          quantityKg,
          pricePerKg,
          itemTotal,
          pricingType,
        ]);

        // Decrement available stock
        const stockUpdate = await client.query(
          'UPDATE products SET quantity_available = quantity_available - $1 WHERE id = $2 AND quantity_available >= $1',
          [quantityKg, item.product_id],
        );
        if (stockUpdate.rowCount !== 1) {
          throw new Error(`Insufficient stock for product ${item.product_id}`);
        }
      }

      // Clear user's cart
      await client.query('DELETE FROM cart WHERE user_id = $1', [req.user.id]);

      await client.query('COMMIT');

      // Fire push notifications after successful commit (non-blocking)
      Promise.allSettled([
        webPushService.sendToUser(req.user.id, {
          type: 'order_created',
          title: 'Order placed successfully',
          body: `Your order #${order.order_number} has been placed.`,
          orderId: order.id,
          url: `/orders/${order.id}`,
        }),
        webPushService.sendToAdmins({
          type: 'new_order',
          title: 'New order received',
          body: `Order #${order.order_number} is ready for processing.`,
          orderId: order.id,
          url: '/admin/orders',
        }),
      ]).catch(() => undefined);

      res.status(201).json({
        success: true,
        data: {
          order,
          orderNumber: order.order_number,
          subtotal,
          deliveryFee,
          total: totalPrice,
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
        'SELECT product_id, quantity_kg FROM order_items WHERE order_id = $1',
        [id],
      );

      for (const item of orderItems.rows) {
        await client.query(
          'UPDATE products SET quantity_available = quantity_available + $1 WHERE id = $2',
          [item.quantity_kg, item.product_id],
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
