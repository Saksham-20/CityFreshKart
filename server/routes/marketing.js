const express = require('express');
const pool = require('../database/config');

const router = express.Router();

// @route   GET /api/marketing/banners
// @desc    Public list of active marketing banners (storefront carousel)
// @access  Public
router.get('/banners', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, subtitle, image_url, link_url, sort_order
       FROM marketing_banners
       WHERE is_active = true
       ORDER BY sort_order ASC, created_at DESC`,
    );
    res.json({ success: true, data: { banners: result.rows } });
  } catch (error) {
    console.error('GET /marketing/banners:', error);
    res.status(500).json({ success: false, message: 'Failed to load banners' });
  }
});

module.exports = router;
