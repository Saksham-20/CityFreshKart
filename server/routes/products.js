const express = require('express');
const { query } = require('../database/config');

const router = express.Router();

// @route   GET /api/products/search?q=keyword
// @desc    Fast product search by name
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { q = '', limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({ success: true, data: { products: [], query: q } });
    }

    const searchQuery = `%${q.toLowerCase()}%`;

    const result = await query(`
      SELECT
        id,
        name,
        description,
        category,
        price_per_kg,
        discount,
        image_url,
        is_active,
        quantity_available
      FROM products
      WHERE is_active = true
        AND LOWER(name) LIKE $1
      ORDER BY name ASC
      LIMIT $2
    `, [searchQuery, parseInt(limit || 20)]);

    res.json({
      success: true,
      data: {
        products: result.rows,
        query: q,
        count: result.rows.length,
      },
    });

  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
});

// @route   GET /api/products
// @desc    Get all products with search and pagination (simplified for produce vendor)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      search = '',
    } = req.query;

    console.log('🔍 Processed params:', { page, limit, search });

    const offset = (page - 1) * limit;
    const queryParams = [];
    let paramCount = 0;

    // Build WHERE clause for search
    let whereClause = 'WHERE is_active = true';
    if (search) {
      paramCount++;
      whereClause += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM products ${whereClause}`;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    const productsQuery = `
      SELECT 
        id,
        name,
        description,
        category,
        price_per_kg,
        discount,
        image_url,
        is_active,
        quantity_available,
        created_at,
        updated_at
      FROM products
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const productsResult = await query(productsQuery, [...queryParams, limit, offset]);
    console.log('🔍 Products result count:', productsResult.rows.length);
    if (productsResult.rows.length > 0) {
      console.log('🔍 First product sample:', productsResult.rows[0]);
    }

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      success: true,
      data: {
        products: productsResult.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_items: total,
          items_per_page: parseInt(limit),
          has_next_page: hasNextPage,
          has_prev_page: hasPrevPage,
        },
      },
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
    });
  }
});

// @route   GET /api/products/:id
// @desc    Get product by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM products WHERE id = $1 AND is_active = true',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });

  } catch (error) {
    console.error('Get product details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
    });
  }
});

module.exports = router;
