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

    const { amount, currency } = req.body;

    // Frontend sends INR (rupees). Razorpay expects paise as integer.
    const rupees = parseFloat(amount);
    const paise = Math.round(rupees * 100);

    const order = await razorpay.orders.create({
      amount: paise,
      currency: currency || 'INR',
      receipt: `rcpt_${Date.now()}`,
      payment_capture: 1,
    });

    return res.json({
      success: true,
      data: {
        keyId: process.env.RAZORPAY_KEY_ID,
        amount: order.amount, // paise
        currency: order.currency,
        orderId: order.id,
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
    if (!Number.isFinite(requestedAmount) || Math.abs(requestedAmount - expectedAmount) > 0.01) {
      return res.status(400).json({ success: false, message: 'Amount mismatch for order' });
    }

    // Create payment link
    const paymentLinkResponse = await razorpay.paymentLink.create({
      upi_link: true,
      amount: Math.round(expectedAmount * 100), // Razorpay expects amount in paise
      currency: 'INR',
      accept_partial: false,
      first_min_partial_amount: 100, // Minimum partial payment (₹1)
      reference_id: orderId,
      description: `CityFreshKart Order #${orderId}`,
      customer_notify: 1,
      notify: {
        sms: true,
        email: true,
      },
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

    // Verify signature
    const signaturePayload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(signaturePayload.toString())
      .digest('hex');

    const isSignatureValid = expectedSignature === signature;

    if (!isSignatureValid) {
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
// @desc    Create cash-on-delivery order (no payment)
// @access  Private
router.post('/cod-order', authenticateToken, checkoutLimiter, [
  body('orderId').notEmpty().withMessage('Order ID is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId } = req.body;

    // Update order status to COD pending (payment not required)
    const updateResult = await pool.query(
      `UPDATE orders
       SET payment_method = $1, status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND user_id = $4
       RETURNING id`,
      ['cod', 'pending', orderId, req.user.id],
    );
    if (updateResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({
      success: true,
      message: 'COD order created successfully',
      paymentMethod: 'cod',
    });

  } catch (error) {
    console.error('Create COD order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create COD order',
      error: error.message,
    });
  }
});

// @route   GET /api/razorpay/payment-status/:paymentId
// @desc    Get payment status
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

    const payment = await razorpay.payments.fetch(paymentId);

    res.json({
      success: true,
      paymentId: payment.id,
      amount: payment.amount / 100, // Convert paise to rupees
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

module.exports = router;
