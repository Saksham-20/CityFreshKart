const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/config');

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @route   POST /api/razorpay/create-order
// @desc    Create Razorpay order for checkout
// @access  Private
router.post('/create-order', authenticateToken, [
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least ₹1'),
  body('currency').optional().isIn(['INR']).withMessage('Only INR supported'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { amount, currency = 'INR', receipt } = req.body;

    const options = {
      amount: Math.round(amount * 100), // amount in paise
      currency,
      receipt: receipt || `receipt_${req.user.id}_${Date.now()}`,
      notes: {
        user_id: req.user.id.toString(),
        user_email: req.user.email,
      },
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    console.error('❌ Create Razorpay order error:', error);
    res.status(500).json({ success: false, message: 'Failed to create payment order', error: error.message });
  }
});

// @route   POST /api/razorpay/verify-payment
// @desc    Verify Razorpay payment signature after checkout
// @access  Private
router.post('/verify-payment', authenticateToken, [
  body('razorpay_order_id').notEmpty().withMessage('Razorpay order ID required'),
  body('razorpay_payment_id').notEmpty().withMessage('Razorpay payment ID required'),
  body('razorpay_signature').notEmpty().withMessage('Razorpay signature required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed: invalid signature' });
    }

    // Update order payment status if orderId provided
    if (orderId) {
      await query(
        `UPDATE orders SET "paymentStatus" = 'paid', status = 'confirmed', "updatedAt" = NOW() WHERE id = $1 AND "userId" = $2`,
        [orderId, req.user.id]
      );
    }

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: { razorpay_payment_id, razorpay_order_id },
    });
  } catch (error) {
    console.error('❌ Verify payment error:', error);
    res.status(500).json({ success: false, message: 'Payment verification failed', error: error.message });
  }
});

// @route   POST /api/razorpay/webhook
// @desc    Handle Razorpay webhooks
// @access  Public
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (webhookSecret) {
      const signature = req.headers['x-razorpay-signature'];
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(req.body)
        .digest('hex');

      if (signature !== expectedSignature) {
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }

    const event = JSON.parse(req.body);
    console.log('📩 Razorpay webhook event:', event.event);

    switch (event.event) {
      case 'payment.captured': {
        const payment = event.payload.payment.entity;
        // Find and update order by razorpay order id stored in notes or payment_intent_id
        await query(
          `UPDATE orders SET "paymentStatus" = 'paid', status = 'confirmed', "updatedAt" = NOW() WHERE "paymentMethod" = $1`,
          [payment.order_id]
        ).catch(err => console.error('Webhook order update error:', err));
        break;
      }
      case 'payment.failed': {
        const payment = event.payload.payment.entity;
        await query(
          `UPDATE orders SET "paymentStatus" = 'failed', "updatedAt" = NOW() WHERE "paymentMethod" = $1`,
          [payment.order_id]
        ).catch(err => console.error('Webhook order update error:', err));
        break;
      }
      default:
        console.log(`ℹ️ Unhandled event: ${event.event}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

module.exports = router;
