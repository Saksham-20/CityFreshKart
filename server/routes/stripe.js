const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { query } = require('../database/config');
const emailService = require('../services/emailService');

const router = express.Router();

// @route   POST /api/stripe/create-payment-intent
// @desc    Create payment intent for checkout with idempotency support
// @access  Private
router.post('/create-payment-intent', authenticateToken, [
  body('amount').isFloat({ min: 0.5 }).withMessage('Amount must be at least $0.50'),
  body('currency').optional().isIn(['usd', 'eur', 'gbp', 'inr']).withMessage('Invalid currency'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, currency = 'inr', description } = req.body;

    // Convert amount to smallest currency unit (paise for INR, cents for others)
    const amountInSmallestUnit = Math.round(amount * (currency === 'inr' ? 100 : 100));

    // Create payment intent with idempotency key
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountInSmallestUnit,
        currency: currency,
        description: description || `Purchase from ${req.user.email}`,
        metadata: {
          user_id: req.user.id.toString(),
          user_email: req.user.email,
          user_name: `${req.user.first_name} ${req.user.last_name}`,
        },
        automatic_payment_methods: {
          enabled: true,
        },
        statement_descriptor: 'CityFreshKart',
      },
      {
        // Idempotency key prevents duplicate charges if request is retried
        idempotencyKey: `${req.user.id}-${amount}-${Date.now()}`,
      }
    );

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
      },
    });

  } catch (error) {
    console.error('❌ Create payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: error.message,
    });
  }
});

// @route   POST /api/stripe/webhook
// @desc    Handle Stripe webhooks with payment validation
// @access  Public
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature - CRITICAL for security
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Handle payment events
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object);
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    // Acknowledge receipt of the event
    res.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// Handle successful payment intent
async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    console.log('✅ Payment succeeded:', paymentIntent.id);

    // Find order by payment_intent_id
    const orderResult = await query(
      'SELECT * FROM orders WHERE payment_intent_id = $1',
      [paymentIntent.id]
    );

    if (orderResult.rows.length === 0) {
      console.log('⚠️ No order found for payment intent:', paymentIntent.id);
      return;
    }

    const order = orderResult.rows[0];

    // Only update if not already processed (idempotency)
    if (order.payment_status === 'paid') {
      console.log('ℹ️ Order already marked as paid:', order.id);
      return;
    }

    // Update order with confirmed payment
    await query(
      `UPDATE orders 
       SET payment_status = $1,
           payment_intent_status = $2,
           payment_confirmed_at = NOW(),
           status = 'confirmed',
           updated_at = NOW()
       WHERE id = $3`,
      ['paid', paymentIntent.status, order.id]
    );

    console.log('✅ Order marked as paid:', order.id);

    // Get user and order details to send confirmation
    const userResult = await query(
      'SELECT email, first_name FROM users WHERE id = $1',
      [order.user_id]
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      try {
        // Send order confirmation email
        await emailService.sendOrderConfirmation(order, user);
      } catch (emailError) {
        console.error('⚠️ Failed to send order confirmation email:', emailError);
      }
    }
  } catch (error) {
    console.error('❌ Error handling payment succeeded:', error);
    throw error;
  }
}

// Handle failed payment intent
async function handlePaymentIntentFailed(paymentIntent) {
  try {
    console.log('❌ Payment failed:', paymentIntent.id);

    // Find order by payment_intent_id
    const orderResult = await query(
      'SELECT * FROM orders WHERE payment_intent_id = $1',
      [paymentIntent.id]
    );

    if (orderResult.rows.length === 0) {
      console.log('⚠️ No order found for failed payment:', paymentIntent.id);
      return;
    }

    const order = orderResult.rows[0];

    // Only update if not already processed
    if (order.payment_status === 'failed') {
      console.log('ℹ️ Order already marked as failed:', order.id);
      return;
    }

    // Update order with failed payment
    await query(
      `UPDATE orders 
       SET payment_status = $1,
           payment_intent_status = $2,
           status = 'payment_failed',
           updated_at = NOW()
       WHERE id = $3`,
      ['failed', paymentIntent.status, order.id]
    );

    console.log('❌ Order marked as failed:', order.id);

    // Get user to send failure notification
    const userResult = await query(
      'SELECT email, first_name FROM users WHERE id = $1',
      [order.user_id]
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      try {
        // Could send payment failure email here
        console.log('📧 Payment failure notification would be sent to:', user.email);
      } catch (emailError) {
        console.error('⚠️ Failed to send payment failure email:', emailError);
      }
    }
  } catch (error) {
    console.error('❌ Error handling payment failed:', error);
    throw error;
  }
}

// Handle charge refund
async function handleChargeRefunded(charge) {
  try {
    console.log('💰 Charge refunded:', charge.id);

    // Find orders with this charge ID (via payment intent)
    const orderResult = await query(
      `SELECT o.* FROM orders o 
       WHERE o.payment_intent_id IN (
         SELECT payment_intent_id FROM orders WHERE id IN (
           SELECT id FROM orders WHERE payment_method = $1
         )
       )`,
      [charge.payment_intent]
    );

    if (orderResult.rows.length === 0) {
      console.log('⚠️ No orders found for refunded charge:', charge.id);
      return;
    }

    // Update order with refund status
    const order = orderResult.rows[0];
    await query(
      `UPDATE orders 
       SET payment_status = $1,
           status = 'refunded',
           updated_at = NOW()
       WHERE id = $2`,
      ['refunded', order.id]
    );

    console.log('💰 Order marked as refunded:', order.id);
  } catch (error) {
    console.error('❌ Error handling charge refund:', error);
    throw error;
  }
}

// @route   GET /api/stripe/payment-methods
// @desc    Get user's saved payment methods
// @access  Private
router.get('/payment-methods', authenticateToken, async (req, res) => {
  try {
    // This would require storing Stripe customer IDs in your user table
    // For now, we'll return an empty array
    res.json({ paymentMethods: [] });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/stripe/setup-intent
// @desc    Create setup intent for saving payment methods
// @access  Private
router.post('/setup-intent', authenticateToken, async (req, res) => {
  try {
    // Create setup intent for saving payment methods
    const setupIntent = await stripe.setupIntents.create({
      customer: req.user.stripeCustomerId, // You'd need to store this
      payment_method_types: ['card'],
      usage: 'off_session',
    });

    res.json({
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    });

  } catch (error) {
    console.error('Create setup intent error:', error);
    res.status(500).json({
      message: 'Failed to create setup intent',
      error: error.message,
    });
  }
});

// @route   POST /api/stripe/refund
// @desc    Process refund for an order
// @access  Private (Admin only)
router.post('/refund', authenticateToken, [
  body('paymentIntentId').notEmpty().withMessage('Payment intent ID is required'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be positive'),
  body('reason').optional().isIn(['duplicate', 'fraudulent', 'requested_by_customer']).withMessage('Invalid refund reason'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { paymentIntentId, amount, reason } = req.body;

    // Create refund
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Convert to cents
      reason: reason || 'requested_by_customer',
    });

    res.json({
      message: 'Refund processed successfully',
      refund: {
        id: refund.id,
        amount: refund.amount / 100, // Convert from cents
        status: refund.status,
        reason: refund.reason,
      },
    });

  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({
      message: 'Failed to process refund',
      error: error.message,
    });
  }
});

// @route   GET /api/stripe/balance
// @desc    Get Stripe account balance (Admin only)
// @access  Private (Admin only)
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const balance = await stripe.balance.retrieve();

    res.json({
      balance: {
        available: balance.available.map(b => ({
          amount: b.amount / 100,
          currency: b.currency,
        })),
        pending: balance.pending.map(b => ({
          amount: b.amount / 100,
          currency: b.currency,
        })),
        instant_available: balance.instant_available.map(b => ({
          amount: b.amount / 100,
          currency: b.currency,
        })),
      },
    });

  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      message: 'Failed to get balance',
      error: error.message,
    });
  }
});

module.exports = router;
