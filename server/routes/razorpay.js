const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { pool } = require('../database/config');
const { checkoutLimiter } = require('../middleware/rateLimit');
const { jsonClientError, logApiError } = require('../utils/apiErrors');

const router = express.Router();

// Initialize Razorpay instance only if keys are configured
let razorpay = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
} else {
  console.warn('⚠️  Razorpay keys not configured. Payment routes will return errors.');
}

const mapRazorpayError = (error, fallbackMessage) => {
  const status = Number(error?.statusCode || error?.status || 500);
  const safeStatus = status >= 400 && status < 600 ? status : 500;
  const providerMessage = error?.error?.description || error?.description || error?.message;
  return {
    status: safeStatus,
    body: {
      success: false,
      message: providerMessage || fallbackMessage,
      code: error?.error?.code || 'RAZORPAY_ERROR',
    },
  };
};

// @route   POST /api/razorpay/create-order
// @desc    Create Razorpay order for checkout
// @access  Private
router.post('/create-order', authenticateToken, checkoutLimiter, [
  body('amount').notEmpty().withMessage('Amount is required').bail()
    .isFloat({ min: 1 }).withMessage('Amount must be at least ₹1'),
  body('currency').optional().isString().withMessage('Currency must be a string'),
  body('orderId').optional().isUUID().withMessage('Order ID must be a valid UUID'),
], async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: 'Payment service not configured. Please use COD.',
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // FIX #1: When orderId is given, ALWAYS use the DB total_price — never trust client amount
    const { currency, orderId } = req.body;
    let amountFromClient = parseFloat(req.body.amount);

    // If orderId provided, verify it exists and belongs to user
    if (orderId) {
      const orderCheck = await pool.query(
        'SELECT id, status, total_price FROM orders WHERE id = $1::uuid AND user_id = $2::uuid',
        [orderId, req.user.id]
      );
      if (orderCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Order not found or does not belong to you',
        });
      }
      if (orderCheck.rows[0].status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Order is not in pending status',
        });
      }
      // Always use the authoritative DB value — discard client-supplied amount
      amountFromClient = parseFloat(orderCheck.rows[0].total_price);
    }

    if (!Number.isFinite(amountFromClient) || amountFromClient < 1) {
      return res.status(400).json({ success: false, message: 'Invalid order amount' });
    }

    // Frontend sends INR (rupees). Razorpay expects paise as integer.
    const rupees = amountFromClient;
    const paise = Math.round(rupees * 100);

    // Receipt must be <= 40 chars.
    const receipt = orderId
      ? orderId.replace(/-/g, '').substring(0, 32)
      : `rcpt_${Date.now()}`;

    const order = await razorpay.orders.create({
      amount: paise,
      currency: currency || 'INR',
      receipt: receipt,
      payment_capture: 1,
      notes: orderId ? { backend_order_id: orderId } : {},
    });

    // If orderId provided, update order with razorpay_order_id
    if (orderId) {
      await pool.query(
        'UPDATE orders SET razorpay_order_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2::uuid AND user_id = $3::uuid',
        [order.id, orderId, req.user.id]
      );
    }

    return res.json({
      success: true,
      data: {
        keyId: process.env.RAZORPAY_KEY_ID,
        amount: order.amount, // paise
        currency: order.currency,
        orderId: order.id,
        backendOrderId: orderId || null,
      },
    });
  } catch (error) {
    console.error('Create Razorpay order error:', {
      message: error?.message,
      statusCode: error?.statusCode,
      code: error?.error?.code,
      description: error?.error?.description,
    });
    const mapped = mapRazorpayError(error, 'Failed to create Razorpay order');
    return res.status(mapped.status).json(mapped.body);
  }
});

// @route   POST /api/razorpay/payment-link
// @desc    Create Razorpay payment link for order
// @access  Private
router.post('/payment-link', authenticateToken, checkoutLimiter, [
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least ₹1'),
  body('userPhone').notEmpty().withMessage('Phone number is required'),
  body('userName').notEmpty().withMessage('User name is required'),
], async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: 'Payment service not configured. Please use COD.',
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId, amount } = req.body;
    const orderResult = await pool.query(
      'SELECT id, user_id, total_price FROM orders WHERE id = $1',
      [orderId],
    );
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const dbOrder = orderResult.rows[0];
    if (String(dbOrder.user_id) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized order access' });
    }
    const requestedAmount = Number(amount);
    const expectedAmount = Number(dbOrder.total_price || 0);
    const amountDifference = Math.abs(requestedAmount - expectedAmount);
    const percentDifference = expectedAmount > 0 ? ((amountDifference / expectedAmount) * 100).toFixed(2) : 0;
    
    // FIX #8: Sanitize phone and name before sending to Razorpay
    const safePhone = String(req.body.userPhone || '').replace(/\D/g, '').slice(-10);
    const safeName = String(req.body.userName || 'Customer').replace(/[<>"'&]/g, '').slice(0, 50);

    // Strict amount validation — use DB value, reject any mismatch > 1 paise (₹0.01)
    if (!Number.isFinite(requestedAmount) || amountDifference > 0.01) {
      console.error(`[RAZORPAY_PAYMENT_LINK_ERROR] Amount mismatch:`, {
        orderId, requestedAmount, expectedAmount, difference: amountDifference,
      });
      return res.status(400).json({
        success: false,
        message: `Amount mismatch for order. Expected ₹${expectedAmount}, got ₹${requestedAmount}. Please refresh cart and try again.`,
      });
    }

    // Always use the DB authoritative amount for the payment link (not the client amount)
    const paymentAmountInPaise = Math.round(expectedAmount * 100);
    
    const paymentLinkResponse = await razorpay.paymentLink.create({
      upi_link: true,
      amount: paymentAmountInPaise,
      currency: 'INR',
      accept_partial: false,
      reference_id: orderId,
      description: `CityFreshKart Order`,
      customer: {
        contact: safePhone ? `+91${safePhone}` : undefined,
        name: safeName,
      },
      customer_notify: 1,
      notify: { sms: true, email: true },
      reminder_enable: true,
      notes: {
        order_id: orderId,
        user_id: req.user.id.toString(),
      },
      callback_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment-callback`,
      callback_method: 'get',
    });

    res.json({
      success: true,
      paymentLink: paymentLinkResponse.short_url,
      paymentLinkId: paymentLinkResponse.id,
      orderId: orderId,
      amount: expectedAmount,
    });

  } catch (error) {
    console.error('Create payment link error:', {
      message: error?.message,
      statusCode: error?.statusCode,
      code: error?.error?.code,
      description: error?.error?.description,
    });
    const mapped = mapRazorpayError(error, 'Failed to create payment link');
    res.status(mapped.status).json(mapped.body);
  }
});

// @route   POST /api/razorpay/verify-payment
// @desc    Verify Razorpay payment
// @access  Private
router.post('/verify-payment', authenticateToken, checkoutLimiter, [
  body('paymentId').notEmpty().withMessage('Payment ID is required'),
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('signature').notEmpty().withMessage('Signature is required'),
], async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: 'Payment service not configured.',
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { paymentId, orderId, signature } = req.body;

    // FIX #2 — Verify HMAC signature with timing-safe comparison
    // IMPORTANT: Both buffers must be the same byte length for timingSafeEqual.
    const signaturePayload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(signaturePayload)
      .digest('hex');

    const incomingSig = String(signature || '');
    let sigValid = false;
    try {
      // timingSafeEqual requires equal-length Buffers; both are 32-byte HMAC hex = 64 chars
      if (incomingSig.length === expectedSignature.length) {
        sigValid = crypto.timingSafeEqual(
          Buffer.from(expectedSignature, 'hex'),
          Buffer.from(incomingSig, 'hex'),
        );
      }
    } catch (_) {
      sigValid = false;
    }

    if (!sigValid) {
      return res.status(400).json({
        success: false,
        ref: req.requestId,
        message: 'Invalid payment signature',
      });
    }

    const payment = await razorpay.payments.fetch(paymentId);

    if (payment.status !== 'captured') {
      return res.status(400).json({
        success: false,
        ref: req.requestId,
        message: 'Payment not captured',
      });
    }

    // FIX #2 — Cross-check captured amount against DB order total
    // Look up by razorpay_order_id first; fall back to backendOrderId in notes
    // (handles the case where create-order ran but razorpay_order_id wasn't saved yet)
    let dbOrderForVerify = await pool.query(
      'SELECT id, total_price FROM orders WHERE razorpay_order_id = $1 AND user_id = $2',
      [orderId, req.user.id],
    );
    if (dbOrderForVerify.rows.length === 0) {
      // Try matching via backend_order_id stored in Razorpay notes
      const rzpOrder = await razorpay.orders.fetch(orderId).catch(() => null);
      const backendOrderId = rzpOrder?.notes?.backend_order_id;
      if (backendOrderId) {
        dbOrderForVerify = await pool.query(
          'SELECT id, total_price FROM orders WHERE id = $1::uuid AND user_id = $2',
          [backendOrderId, req.user.id],
        );
      }
    }
    if (dbOrderForVerify.rows.length === 0) {
      console.error(`[RAZORPAY_VERIFY] Order not found for razorpay_order_id=${orderId} user=${req.user.id}`);
      return res.status(404).json({ success: false, message: 'Order not found', ref: req.requestId });
    }
    const expectedPaise = Math.round(parseFloat(dbOrderForVerify.rows[0].total_price) * 100);
    if (payment.amount !== expectedPaise) {
      console.error(`[RAZORPAY_VERIFY] AMOUNT MISMATCH — captured: ${payment.amount} paise, expected: ${expectedPaise} paise`);
      return res.status(400).json({
        success: false,
        ref: req.requestId,
        message: 'Payment amount does not match order total. Please contact support.',
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let ins;
      try {
        ins = await client.query(
          `INSERT INTO razorpay_payment_processed (payment_id, user_id) VALUES ($1, $2::uuid)
           ON CONFLICT (payment_id) DO NOTHING RETURNING payment_id`,
          [paymentId, req.user.id],
        );
      } catch (insErr) {
        if (insErr.code !== '42P01') throw insErr;
        await client.query('ROLLBACK');
        await pool.query(
          `UPDATE orders
           SET razorpay_payment_id = $1,
               updated_at = CURRENT_TIMESTAMP,
               status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END
           WHERE razorpay_order_id = $2 AND user_id = $3`,
          [paymentId, orderId, req.user.id],
        );
        return res.json({
          success: true,
          message: 'Payment verified successfully (captured)',
          paymentStatus: 'paid',
          ref: req.requestId,
        });
      }

      if (ins.rows.length === 0) {
        await client.query('COMMIT');
        return res.json({
          success: true,
          message: 'Payment already processed',
          paymentStatus: 'paid',
          idempotentReplay: true,
          ref: req.requestId,
        });
      }

      await client.query(
        `UPDATE orders
         SET razorpay_payment_id = $1,
             updated_at = CURRENT_TIMESTAMP,
             status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END
         WHERE razorpay_order_id = $2 AND user_id = $3`,
        [paymentId, orderId, req.user.id],
      );
      await client.query('COMMIT');
    } catch (dbErr) {
      try {
        await client.query('ROLLBACK');
      } catch (_) { /* ignore */ }
      logApiError(req, 'razorpay_verify_db_error', dbErr);
      return jsonClientError(res, req, 500, {
        message: 'Failed to record payment',
        errorCode: 'RAZORPAY_VERIFY_DB_ERROR',
      });
    } finally {
      client.release();
    }

    return res.json({
      success: true,
      message: 'Payment verified successfully (captured)',
      paymentStatus: 'paid',
      ref: req.requestId,
    });

  } catch (error) {
    logApiError(req, 'razorpay_verify_failed', error);
    const mapped = mapRazorpayError(error, 'Failed to verify payment');
    const body = { ...mapped.body, ref: req.requestId };
    return res.status(mapped.status).json(body);
  }
});

// @route   POST /api/razorpay/cod-order
// @desc    Mark a pending order as COD — FIX #11: only allowed on 'pending' orders
// @access  Private
router.post('/cod-order', authenticateToken, checkoutLimiter, [
  body('orderId').notEmpty().withMessage('Order ID is required').bail()
    .isUUID().withMessage('Order ID must be a valid UUID'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId } = req.body;

    // FIX #11: Guard — only update if status is exactly 'pending' to prevent resetting confirmed/delivered orders
    const updateResult = await pool.query(
      `UPDATE orders
       SET payment_method = 'cod', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1::uuid AND user_id = $2::uuid AND status = 'pending' AND payment_method != 'razorpay'
       RETURNING id, status`,
      [orderId, req.user.id],
    );
    if (updateResult.rowCount === 0) {
      // Check why — ownership or wrong status?
      const check = await pool.query(
        'SELECT id, status, payment_method FROM orders WHERE id = $1::uuid AND user_id = $2::uuid',
        [orderId, req.user.id],
      );
      if (check.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
      const o = check.rows[0];
      if (o.status !== 'pending') {
        return res.status(409).json({ success: false, message: `Cannot switch to COD: order is already ${o.status}` });
      }
      return res.status(409).json({ success: false, message: 'Cannot switch to COD: order has an online payment in progress' });
    }

    return res.json({
      success: true,
      message: 'Order set to Cash on Delivery',
      paymentMethod: 'cod',
    });

  } catch (error) {
    logApiError(req, 'cod_order_failed', error);
    return jsonClientError(res, req, 500, {
      message: 'Failed to set COD payment method',
      errorCode: 'COD_ORDER_FAILED',
    });
  }
});

// @route   GET /api/razorpay/payment-status/:paymentId
// @desc    Get payment status — FIX #10: verify ownership via DB lookup
// @access  Private
router.get('/payment-status/:paymentId', authenticateToken, async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: 'Payment service not configured.',
      });
    }

    const { paymentId } = req.params;

    // FIX #10: Verify this paymentId belongs to an order owned by the current user
    const ownerCheck = await pool.query(
      'SELECT id FROM orders WHERE razorpay_payment_id = $1 AND user_id = $2',
      [paymentId, req.user.id],
    );
    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Payment not found or does not belong to you',
      });
    }

    const payment = await razorpay.payments.fetch(paymentId);

    res.json({
      success: true,
      paymentId: payment.id,
      amount: payment.amount / 100,
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      createdAt: new Date(payment.created_at * 1000),
    });

  } catch (error) {
    console.error('Get payment status error:', {
      message: error?.message,
      statusCode: error?.statusCode,
      code: error?.error?.code,
      description: error?.error?.description,
    });
    const mapped = mapRazorpayError(error, 'Failed to fetch payment status');
    res.status(mapped.status).json(mapped.body);
  }
});

// @route   PUT /api/razorpay/update-order-payment
// @desc    Update order with payment details after successful payment
// @access  Private
// FIX #3 — This endpoint now verifies the payment with Razorpay API AND
//           checks the HMAC signature before confirming the order.
router.put('/update-order-payment', authenticateToken, checkoutLimiter, [
  body('orderId').notEmpty().withMessage('Order ID is required').bail()
    .isUUID().withMessage('Order ID must be a valid UUID'),
  body('razorpay_payment_id').notEmpty().withMessage('Razorpay payment ID is required'),
  body('razorpay_order_id').notEmpty().withMessage('Razorpay order ID is required'),
  body('signature').notEmpty().withMessage('Razorpay signature is required'),
], async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({ success: false, message: 'Payment service not configured.' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId, razorpay_payment_id, razorpay_order_id, signature } = req.body;

    // Step 1: Verify HMAC signature (timing-safe, crash-safe)
    const signaturePayload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(signaturePayload)
      .digest('hex');
    const sigStr = String(signature || '');
    let sigValid = false;
    try {
      // timingSafeEqual requires equal-length Buffers
      if (sigStr.length === expectedSig.length) {
        sigValid = crypto.timingSafeEqual(Buffer.from(expectedSig, 'hex'), Buffer.from(sigStr, 'hex'));
      }
    } catch (_) { sigValid = false; }
    if (!sigValid) {
      console.error(`[UPDATE_ORDER_PAYMENT] Invalid signature — paymentId=${razorpay_payment_id} userId=${req.user.id}`);
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // Step 2: Fetch order from DB and verify ownership
    const dbOrder = await pool.query(
      'SELECT id, total_price, status FROM orders WHERE id = $1::uuid AND user_id = $2::uuid',
      [orderId, req.user.id],
    );
    if (dbOrder.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found or does not belong to you' });
    }
    const order = dbOrder.rows[0];
    if (order.status !== 'pending') {
      // Already processed — idempotent success
      return res.json({ success: true, message: 'Order already processed', data: { order } });
    }

    // Step 3: Verify payment with Razorpay and cross-check amount
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    if (payment.status !== 'captured') {
      return res.status(400).json({ success: false, message: 'Payment has not been captured' });
    }
    const expectedPaise = Math.round(parseFloat(order.total_price) * 100);
    if (payment.amount !== expectedPaise) {
      console.error(`[UPDATE_ORDER_PAYMENT] AMOUNT MISMATCH — captured: ${payment.amount}, expected: ${expectedPaise}, orderId: ${orderId}`);
      return res.status(400).json({ success: false, message: 'Payment amount does not match order total' });
    }

    // Step 4: Confirm order in DB
    const result = await pool.query(`
      UPDATE orders
      SET razorpay_payment_id = $1,
          razorpay_order_id = $2,
          status = 'confirmed',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3::uuid AND user_id = $4::uuid AND status = 'pending'
      RETURNING *
    `, [razorpay_payment_id, razorpay_order_id, orderId, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(409).json({ success: false, message: 'Order could not be confirmed — may already be processed' });
    }

    return res.json({
      success: true,
      message: 'Order confirmed with payment details',
      data: { order: result.rows[0] },
    });
  } catch (error) {
    logApiError(req, 'update_order_payment_failed', error);
    return jsonClientError(res, req, 500, {
      message: 'Failed to update order with payment details',
      errorCode: 'UPDATE_ORDER_PAYMENT_FAILED',
    });
  }
});

module.exports = router;
