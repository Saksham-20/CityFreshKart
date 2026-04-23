const crypto = require('crypto');
const express = require('express');
const { query, pool } = require('../database/config');
const { authenticateToken } = require('../middleware/auth');
const webPushService = require('../services/webPushService');
const { getStoreOrderSettings } = require('../services/storeSettingsService');
const { normalizeIdempotencyKey } = require('../services/cachePublic');
const { jsonClientError, logApiError } = require('../utils/apiErrors');
const { checkoutLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const MAX_ORDER_ITEMS = parseInt(process.env.MAX_ORDER_ITEMS, 10) || 100;
const MAX_ADDRESS_LEN = parseInt(process.env.MAX_DELIVERY_ADDRESS_LEN, 10) || 5000;
const MAX_NOTES_LEN = parseInt(process.env.MAX_ORDER_NOTES_LEN, 10) || 2000;

async function respondIdempotentOrder(res, req, orderId, userId) {
  const orderResult = await query(
    'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
    [orderId, userId],
  );
  if (orderResult.rows.length === 0) {
    return jsonClientError(res, req, 500, {
      message: 'Order replay failed',
      errorCode: 'ORDER_REPLAY_FAILED',
    });
  }
  const order = orderResult.rows[0];
  return res.status(200).json({
    success: true,
    ref: req.requestId,
    data: {
      order,
      orderNumber: order.order_number,
      subtotal: parseFloat(order.subtotal),
      deliveryFee: parseFloat(order.delivery_fee),
      total: parseFloat(order.total_price),
      idempotentReplay: true,
    },
  });
}

// @route   GET /api/orders
// @desc    Get user's order history
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
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
    `, [req.user.id, limit, offset]);

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
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    });

  } catch (error) {
    logApiError(req, 'orders_list_failed', error);
    return jsonClientError(res, req, 500, {
      message: 'Failed to load orders',
      errorCode: 'ORDERS_LIST_FAILED',
      error: { code: 'SERVER_ERROR', message: 'Server error' },
    });
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
      return res.status(404).json({
        success: false,
        ref: req.requestId,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
      });
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
    logApiError(req, 'order_detail_failed', error);
    return jsonClientError(res, req, 500, {
      message: 'Failed to load order',
      errorCode: 'ORDER_DETAIL_FAILED',
      error: { code: 'SERVER_ERROR', message: 'Server error' },
    });
  }
});

// @route   POST /api/orders
// @desc    Create a new order
// @access  Private
router.post('/', authenticateToken, checkoutLimiter, async (req, res) => {
  try {
    const {
      items, delivery_address, notes,
      payment_method = 'cod',
      razorpay_payment_id, razorpay_order_id,
      phone,
    } = req.body;

    const rawIdem = req.headers['idempotency-key'] || req.body?.idempotency_key;
    const idemKey = rawIdem ? normalizeIdempotencyKey(String(rawIdem).slice(0, 256)) : '';

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Items are required' }, ref: req.requestId });
    }
    if (items.length > MAX_ORDER_ITEMS) {
      return res.status(400).json({
        success: false,
        ref: req.requestId,
        error: { code: 'VALIDATION_ERROR', message: `Maximum ${MAX_ORDER_ITEMS} line items per order` },
      });
    }

    if (!delivery_address || !delivery_address.trim()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Delivery address is required' }, ref: req.requestId });
    }
    if (delivery_address.length > MAX_ADDRESS_LEN) {
      return res.status(400).json({
        success: false,
        ref: req.requestId,
        error: { code: 'VALIDATION_ERROR', message: 'Delivery address is too long' },
      });
    }
    if (notes && String(notes).length > MAX_NOTES_LEN) {
      return res.status(400).json({
        success: false,
        ref: req.requestId,
        error: { code: 'VALIDATION_ERROR', message: 'Notes are too long' },
      });
    }
    const normalizedPhone = String(phone || req.user.phone || '').replace(/\D/g, '').slice(-10);
    if (!/^\d{10}$/.test(normalizedPhone)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Valid 10-digit phone number is required' } });
    }

    const {
      free_delivery_threshold: freeDeliveryThreshold,
      delivery_fee: deliveryFeeAmount,
      min_order_amount: minOrderAmount,
    } = await getStoreOrderSettings();

    const uniqueProductIds = [...new Set(items.map(item => item.product_id).filter(Boolean))];

    const productsResult = await query(
      `SELECT id, name, price_per_kg, discount, pricing_type, is_active,
              COALESCE(weight_display_unit, 'kg') AS weight_display_unit
       FROM products
       WHERE id = ANY($1::uuid[])`,
      [uniqueProductIds],
    );
    const productsById = new Map(productsResult.rows.map(p => [p.id, p]));
    const productWeightRows = await query(
      'SELECT product_id, weight_option, price_override FROM product_weight_prices WHERE product_id = ANY($1::uuid[])',
      [uniqueProductIds],
    );
    const weightOverrideMap = new Map();
    for (const row of productWeightRows.rows) {
      weightOverrideMap.set(`${row.product_id}:${Number(row.weight_option).toFixed(2)}`, parseFloat(row.price_override));
    }

    for (const item of items) {
      const product = productsById.get(item.product_id);
      if (!product || !product.is_active) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'One or more items are invalid or unavailable' } });
      }
      const qty = parseFloat(item.quantity_kg || 0);
      if (!Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid item quantity' } });
      }
      const hasTiers = productWeightRows.rows.some(r => r.product_id === product.id);
      if (hasTiers) {
        const tierKey = `${item.product_id}:${qty.toFixed(2)}`;
        if (!weightOverrideMap.has(tierKey)) {
          // CRITICAL FIX: Show available tiers to help debug why product is excluded
          const availableTiers = Array.from(weightOverrideMap.keys())
            .filter(k => k.startsWith(item.product_id))
            .map(k => k.split(':')[1]);
          
          console.error(`[ORDER_VALIDATION_FAILED] Weight tier not found:`, {
            productId: item.product_id,
            productName: product.name,
            requestedQuantity: qty,
            requestedKey: tierKey,
            availableTiers,
            tierCount: availableTiers.length
          });
          
          return res.status(400).json({
            success: false,
            error: { 
              code: 'INVALID_TIER', 
              message: `${product.name} (${qty}kg) requires one of these weights: ${availableTiers.length > 0 ? availableTiers.join(', ') + ' kg' : 'No tiers configured'}` 
            },
          });
        }
      }
    }

    // Recalculate totals strictly from DB values for integrity
    // CRITICAL: Log each item's calculation for debugging price discrepancies
    let subtotal = 0;
    const itemCalculations = [];
    for (const item of items) {
      const product = productsById.get(item.product_id);
      const pricePerKg = parseFloat(product.price_per_kg || 0);
      const quantityKg = parseFloat(item.quantity_kg || 0);
      const discount = parseFloat(product.discount || 0);
      const overridePrice = weightOverrideMap.get(`${item.product_id}:${quantityKg.toFixed(2)}`);
      const baseTotal = Number.isFinite(overridePrice) ? overridePrice : (pricePerKg * quantityKg);
      const itemTotal = baseTotal * (1 - discount / 100);
      subtotal += itemTotal;
      
      // Log each item for debugging
      itemCalculations.push({
        productId: item.product_id,
        productName: product.name,
        quantityKg,
        currentPricePerKg: pricePerKg,
        hasWeightTierOverride: Number.isFinite(overridePrice),
        tierOverridePrice: overridePrice,
        baseTotal,
        discountPercent: discount,
        itemTotal: parseFloat(itemTotal.toFixed(2))
      });
    }
    subtotal = parseFloat(subtotal.toFixed(2));
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[ORDER_CALC] Item-by-item breakdown:`, {
        itemCount: items.length,
        calculatedSubtotal: subtotal,
        userId: req.user.id,
        timestamp: new Date().toISOString(),
      });
    }

    if (minOrderAmount > 0 && subtotal < minOrderAmount) {
      return res.status(400).json({
        success: false,
        error: { code: 'MIN_ORDER', message: `Minimum order amount is ₹${minOrderAmount}` },
      });
    }

    const deliveryFee = subtotal >= freeDeliveryThreshold ? 0 : deliveryFeeAmount;
    const totalPrice = parseFloat((subtotal + deliveryFee).toFixed(2));
    
    // CRITICAL FIX: Validate that received amounts match calculated amounts
    // If they don't match, it means product prices changed since cart was loaded
    const receivedSubtotal = parseFloat(req.body.subtotal || 0);
    const receivedTotal = parseFloat(req.body.total_price || 0);
    
    if (Number.isFinite(receivedSubtotal) && Number.isFinite(receivedTotal)) {
      const subtotalDiff = Math.abs(subtotal - receivedSubtotal);
      const totalDiff = Math.abs(totalPrice - receivedTotal);
      
      if (subtotalDiff > 0.1 || totalDiff > 0.1) {
        console.warn(`[ORDER_PRICE_CHANGED] Prices recalculated - product prices may have changed:`, {
          receivedSubtotal,
          calculatedSubtotal: subtotal,
          subtotalDifference: subtotalDiff,
          receivedTotal,
          calculatedTotal: totalPrice,
          totalDifference: totalDiff,
          percentChange: ((totalDiff / receivedTotal) * 100).toFixed(2) + '%',
          userId: req.user.id,
          reason: 'Using calculated amounts for order integrity'
        });
      }
    }
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[ORDER_CALC_DEBUG] Final order amounts:`, {
        itemCount: items.length,
        calculatedSubtotal: subtotal,
        deliveryFee,
        calculatedTotal: totalPrice,
        userId: req.user.id,
        timestamp: new Date().toISOString(),
      });
    }

    // FIX #7: Use crypto.randomBytes for unpredictable order numbers
    const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
    const orderNumber = `ORD-${Date.now()}-${randomSuffix}`;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (idemKey) {
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1::text))', [`orderidem:${req.user.id}:${idemKey}`]);
        const prev = await client.query(
          'SELECT order_id FROM order_idempotency WHERE user_id = $1::uuid AND idempotency_key = $2',
          [req.user.id, idemKey],
        );
        if (prev.rows.length > 0) {
          await client.query('ROLLBACK');
          client.release();
          return respondIdempotentOrder(res, req, prev.rows[0].order_id, req.user.id);
        }
      }

      // Insert order — includes notes and optional razorpay fields
      const orderResult = await client.query(`
        INSERT INTO orders (order_number, user_id, phone, delivery_address, notes, subtotal, delivery_fee, total_price, payment_method, razorpay_payment_id, razorpay_order_id, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        orderNumber,
        req.user.id,
        normalizedPhone,
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

      // CRITICAL FIX: Log price discrepancy to audit table if detected
      const receivedSubtotal = parseFloat(req.body.subtotal || 0);
      const receivedTotal = parseFloat(req.body.total_price || 0);
      
      if (Number.isFinite(receivedSubtotal) && Number.isFinite(receivedTotal)) {
        const subtotalDiff = Math.abs(subtotal - receivedSubtotal);
        const totalDiff = Math.abs(totalPrice - receivedTotal);
        
        if (subtotalDiff > 0.1 || totalDiff > 0.1) {
          // Log the discrepancy with item details
          const percentDiff = receivedTotal > 0 ? ((totalDiff / receivedTotal) * 100).toFixed(2) : 0;
          await client.query(`
            INSERT INTO order_audit_log (
              order_id, user_id, event_type, 
              received_subtotal, received_total,
              calculated_subtotal, calculated_total,
              items_json, discrepancy_amount, discrepancy_percent, reason
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `, [
            order.id,
            req.user.id,
            'price_recalculated',
            receivedSubtotal,
            receivedTotal,
            subtotal,
            totalPrice,
            JSON.stringify(itemCalculations),
            totalDiff,
            percentDiff,
            'Product prices changed after cart loaded'
          ]);
        }
      }

      // Insert order items — include pricing_type snapshot
      for (const item of items) {
        const product = productsById.get(item.product_id);
        const pricePerKg = parseFloat(product.price_per_kg || 0);
        const quantityKg = parseFloat(item.quantity_kg || 0);
        const discount = parseFloat(product.discount || 0);
        const overridePrice = weightOverrideMap.get(`${item.product_id}:${quantityKg.toFixed(2)}`);
        const baseTotal = Number.isFinite(overridePrice) ? overridePrice : (pricePerKg * quantityKg);
        const itemTotal = parseFloat((baseTotal * (1 - discount / 100)).toFixed(2));
        const linePricePerKg = parseFloat((baseTotal / quantityKg).toFixed(2));
        const pricingType = product.pricing_type || 'per_kg';
        const weightDisplayUnit = pricingType === 'per_piece'
          ? 'kg'
          : (product.weight_display_unit === 'g' ? 'g' : 'kg');

        await client.query(`
          INSERT INTO order_items (order_id, product_id, product_name, quantity_kg, price_per_kg, total_price, pricing_type, weight_display_unit)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          order.id,
          item.product_id,
          product.name || '',
          quantityKg,
          linePricePerKg,
          itemTotal,
          pricingType,
          weightDisplayUnit,
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

      if (idemKey) {
        try {
          await client.query(
            'INSERT INTO order_idempotency (user_id, idempotency_key, order_id) VALUES ($1::uuid, $2, $3::uuid)',
            [req.user.id, idemKey, order.id],
          );
        } catch (e) {
          if (e.code !== '42P01') throw e;
          // FIX #16: Warn when idempotency table is missing — idempotency is disabled
          logApiError(req, 'order_idempotency_table_missing', e);
          console.warn('[ORDER_IDEMPOTENCY] order_idempotency table not found — idempotency protection is DISABLED. Run migrations.');
        }
      }

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
        ref: req.requestId,
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
    logApiError(req, 'create_order_failed', error);
    if (error.message && String(error.message).includes('Insufficient stock')) {
      return res.status(409).json({
        success: false,
        ref: req.requestId,
        error: { code: 'INSUFFICIENT_STOCK', message: error.message },
      });
    }
    return jsonClientError(res, req, 500, {
      message: 'Failed to create order',
      errorCode: 'ORDER_CREATE_FAILED',
      error: { code: 'SERVER_ERROR', message: 'Server error' },
    });
  }
});

// @route   POST /api/orders/:id/cancel
// @desc    Cancel an order — FIX #14: SELECT FOR UPDATE prevents concurrent cancel race
// @access  Private
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const customerReasonInput = String(req.body?.reason || '').trim();
    const customerReason = customerReasonInput || 'Order cancelled by customer.';

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // FIX #14: Lock the order row so concurrent cancel requests don't both succeed
      const order = await client.query(
        'SELECT * FROM orders WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [id, req.user.id],
      );

      if (order.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Order not found' });
      }

      if (order.rows[0].status === 'cancelled') {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Order is already cancelled' });
      }

      if (order.rows[0].status === 'delivered') {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Cannot cancel delivered order' });
      }

      await client.query(
        `UPDATE orders
         SET status = $1,
             rejection_reason = $2,
             rejected_at = CURRENT_TIMESTAMP,
             rejected_by = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        ['cancelled', customerReason, id],
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
    logApiError(req, 'order_cancel_failed', error);
    return jsonClientError(res, req, 500, {
      message: 'Failed to cancel order',
      errorCode: 'ORDER_CANCEL_FAILED',
    });
  }
});

// @route   PUT /api/orders/:id
// @desc    Update order status (admin only) — FIX #4: whitelist status values
// @access  Private (Admin)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // FIX #4: Whitelist allowed status values
    const VALID_STATUSES = ['pending', 'confirmed', 'delivered', 'cancelled'];
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
      });
    }

    // Check if user is admin
    const user = await query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
    if (!user.rows[0]?.is_admin) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // FIX #18/#20: Restore stock when admin cancels an order
    if (status === 'cancelled') {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const existingOrder = await client.query(
          'SELECT status FROM orders WHERE id = $1 FOR UPDATE',
          [id],
        );
        if (existingOrder.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ message: 'Order not found' });
        }
        const prevStatus = existingOrder.rows[0].status;
        await client.query(
          `UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [status, id],
        );
        // Only restore stock if order was not already cancelled/delivered
        if (prevStatus !== 'cancelled' && prevStatus !== 'delivered') {
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
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      const result = await query(
        'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [status, id],
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Order not found' });
      }
    }

    res.json({ success: true, data: { message: 'Order status updated' } });

  } catch (error) {
    logApiError(req, 'order_admin_update_failed', error);
    return jsonClientError(res, req, 500, {
      message: 'Failed to update order',
      errorCode: 'ORDER_ADMIN_UPDATE_FAILED',
    });
  }
});

module.exports = router;
