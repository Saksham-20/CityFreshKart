const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const webPushService = require('../services/webPushService');

const router = express.Router();

// @route   POST /api/notifications/subscribe
// @desc    Save browser push subscription for the current user
// @access  Private
router.post(
  '/subscribe',
  authenticateToken,
  [body('subscription').notEmpty().withMessage('subscription is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { subscription } = req.body;
      await webPushService.subscribe(subscription, req.user.id);

      res.json({
        success: true,
        message: 'Push subscription saved',
        data: { enabled: webPushService.enabled },
      });
    } catch (error) {
      console.error('Subscribe notification error:', error);
      res.status(500).json({ success: false, message: 'Failed to subscribe for notifications' });
    }
  },
);

// @route   DELETE /api/notifications/unsubscribe
// @desc    Remove browser push subscription by endpoint
// @access  Private
router.delete('/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const endpoint = req.body?.endpoint || req.query?.endpoint;
    if (!endpoint) {
      return res.status(400).json({ success: false, message: 'endpoint is required' });
    }

    const removed = await webPushService.unsubscribeByEndpointForUser(endpoint, req.user.id);
    if (removed === 0) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }
    return res.json({ success: true, message: 'Push subscription removed' });
  } catch (error) {
    console.error('Unsubscribe notification error:', error);
    return res.status(500).json({ success: false, message: 'Failed to unsubscribe' });
  }
});

module.exports = router;

