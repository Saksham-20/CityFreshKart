const express = require('express');
const { query } = require('../database/config');

const router = express.Router();

const DEFAULT_PRODUCT_CATEGORIES = [
  'Vegetables',
  'Fruits',
  'Dairy',
  'Bakery',
  'Grains',
  'Herbs & Spices',
  'Other',
];

// @route   GET /api/products/categories
// @desc    Get public product categories (used for chips/dropdowns)
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const { pool } = require('../database/config');
    const result = await pool.query(
      'SELECT value FROM store_settings WHERE key = $1',
      ['product_categories'],
    );

    if (result.rows.length > 0) {
      try {
        const parsed = JSON.parse(result.rows[0].value);
        if (Array.isArray(parsed) && parsed.every(v => typeof v === 'string' && v.trim())) {
          return res.json({ success: true, data: parsed });
        }
      } catch (_) {
        // ignore JSON parsing errors and fall back to defaults
      }
    }

    return res.json({ success: true, data: DEFAULT_PRODUCT_CATEGORIES });
  } catch (error) {
    console.error('Get categories error:', error);
    return res.json({ success: true, data: DEFAULT_PRODUCT_CATEGORIES });
  }
});

// @route   GET /api/products/carousel
// @desc    Promo carousel: discounted, new (14d), or featured when column exists
// @access  Public
router.get('/carousel', async (req, res) => {
  try {
    const wantsAll = ['1', 'true', 'yes'].includes(String(req.query.all || '').toLowerCase());
    const maxCap = wantsAll ? 500 : 24;
    const requested = parseInt(req.query.limit || (wantsAll ? '500' : '12'), 10) || (wantsAll ? 500 : 12);
    const limit = Math.min(maxCap, Math.max(1, requested));

    const runFeatured = async () => (await query(`
      SELECT
        id,
        name,
        category,
        description,
        COALESCE(NULLIF(TRIM(image_url), ''), NULLIF(TRIM(image), '')) AS image_url,
        price_per_kg,
        discount,
        quantity_available,
        created_at,
        COALESCE(pricing_type, 'per_kg') AS pricing_type,
        COALESCE(weight_display_unit, 'kg') AS weight_display_unit,
        COALESCE(is_featured, false) AS is_featured
      FROM products
      WHERE is_active = true
        AND (
          discount > 0
          OR created_at >= NOW() - INTERVAL '14 days'
          OR COALESCE(is_featured, false) = true
        )
      ORDER BY
        CASE WHEN discount > 0 THEN 0 ELSE 1 END,
        CASE WHEN COALESCE(is_featured, false) THEN 0 ELSE 1 END,
        created_at DESC
      LIMIT $1
    `, [limit])).rows;

    const runBasic = async () => (await query(`
      SELECT
        id,
        name,
        category,
        description,
        COALESCE(NULLIF(TRIM(image_url), ''), NULLIF(TRIM(image), '')) AS image_url,
        price_per_kg,
        discount,
        quantity_available,
        created_at,
        COALESCE(weight_display_unit, 'kg') AS weight_display_unit,
        COALESCE(wp.weight_price_overrides, '{}'::json) AS weight_price_overrides
      FROM products
      LEFT JOIN LATERAL (
        SELECT json_object_agg(weight_option::text, price_override) AS weight_price_overrides
        FROM product_weight_prices
        WHERE product_id = products.id
      ) wp ON true
      WHERE is_active = true
        AND (
          discount > 0
          OR created_at >= NOW() - INTERVAL '14 days'
        )
      ORDER BY
        CASE WHEN discount > 0 THEN 0 ELSE 1 END,
        created_at DESC
      LIMIT $1
    `, [limit])).rows;

    let rows;
    try {
      rows = await runFeatured();
    } catch (e) {
      if (e.code !== '42703') throw e;
      rows = (await runBasic()).map((r) => ({ ...r, is_featured: false, pricing_type: 'per_kg', weight_display_unit: r.weight_display_unit || 'kg' }));
    }

    const items = rows.map((r) => {
      const discountNum = parseFloat(r.discount) || 0;
      const created = r.created_at ? new Date(r.created_at) : null;
      const isNew = created
        ? (Date.now() - created.getTime()) <= 14 * 24 * 60 * 60 * 1000
        : false;
      return {
        ...r,
        discount: discountNum,
        pricing_type: r.pricing_type || 'per_kg',
        weight_display_unit: r.weight_display_unit || 'kg',
        is_discounted: discountNum > 0,
        is_new: isNew,
        is_featured: !!r.is_featured,
      };
    });

    res.json({
      success: true,
      data: {
        items,
        products: items,
        discounted: items.filter((i) => i.is_discounted),
        new_products: items.filter((i) => i.is_new),
        fresh: items.filter((i) => i.is_new),
      },
    });
  } catch (error) {
    console.error('Carousel products error:', error);
    res.status(500).json({ success: false, message: 'Failed to load carousel products' });
  }
});

// @route   GET /api/products/search?q=keyword
// @desc    Fast product search by name
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { q = '', limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({ success: true, data: { products: [], query: q } });
    }

    const raw = q.trim();
    const pattern = `%${raw}%`;
    const lim = parseInt(limit || 20, 10);

    const fullSearchSql = `
      SELECT
        id,
        name,
        search_keywords,
        description,
        category,
        price_per_kg,
        discount,
        COALESCE(NULLIF(TRIM(image_url), ''), NULLIF(TRIM(image), '')) AS image_url,
        is_active,
        quantity_available,
        created_at,
        COALESCE(pricing_type, 'per_kg') AS pricing_type,
        COALESCE(weight_display_unit, 'kg') AS weight_display_unit
      FROM products
      WHERE is_active = true
        AND (
          name ILIKE $1
          OR COALESCE(search_keywords, '') ILIKE $1
          OR COALESCE(description, '') ILIKE $1
        )
      ORDER BY name ASC
      LIMIT $2
    `;

    let result;
    try {
      result = await query(fullSearchSql, [pattern, lim]);
    } catch (e) {
      if (e.code !== '42703') throw e;
      result = await query(`
        SELECT
          id,
          name,
          description,
          category,
          price_per_kg,
          discount,
          COALESCE(NULLIF(TRIM(image_url), ''), NULLIF(TRIM(image), '')) AS image_url,
          is_active,
          quantity_available,
          created_at,
          COALESCE(pricing_type, 'per_kg') AS pricing_type,
          COALESCE(weight_display_unit, 'kg') AS weight_display_unit
        FROM products
        WHERE is_active = true
          AND (name ILIKE $1 OR COALESCE(description, '') ILIKE $1)
        ORDER BY name ASC
        LIMIT $2
      `, [pattern, lim]);
    }

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

    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Processed params:', { page, limit, search });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 12));
    const offset = (pageNum - 1) * limitNum;
    const queryParams = [];
    let paramCount = 0;

    // Build WHERE clause for search
    let whereClause = 'WHERE is_active = true';
    if (search) {
      paramCount++;
      const sp = `%${search}%`;
      whereClause += ` AND (
        name ILIKE $${paramCount}
        OR COALESCE(search_keywords, '') ILIKE $${paramCount}
        OR COALESCE(description, '') ILIKE $${paramCount}
      )`;
      queryParams.push(sp);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM products ${whereClause}`;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    const productsQuery = `
      SELECT 
        id,
        name,
        search_keywords,
        description,
        category,
        price_per_kg,
        discount,
        COALESCE(NULLIF(TRIM(image_url), ''), NULLIF(TRIM(image), '')) AS image_url,
        is_active,
        quantity_available,
        created_at,
        updated_at,
        COALESCE(pricing_type, 'per_kg') AS pricing_type,
        COALESCE(weight_display_unit, 'kg') AS weight_display_unit,
        COALESCE(wp.weight_price_overrides, '{}'::json) AS weight_price_overrides
      FROM products
      LEFT JOIN LATERAL (
        SELECT json_object_agg(weight_option::text, price_override) AS weight_price_overrides
        FROM product_weight_prices
        WHERE product_id = products.id
      ) wp ON true
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const productsResult = await query(productsQuery, [...queryParams, limitNum, offset]);
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Products result count:', productsResult.rows.length);
      if (productsResult.rows.length > 0) {
        console.log('🔍 First product sample:', productsResult.rows[0]);
      }
    }

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.json({
      success: true,
      data: {
        products: productsResult.rows,
        pagination: {
          current_page: pageNum,
          total_pages: totalPages,
          total_items: total,
          items_per_page: limitNum,
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
      `SELECT p.*,
              COALESCE(wp.weight_price_overrides, '{}'::json) AS weight_price_overrides
       FROM products p
       LEFT JOIN LATERAL (
         SELECT json_object_agg(weight_option::text, price_override) AS weight_price_overrides
         FROM product_weight_prices
         WHERE product_id = p.id
       ) wp ON true
       WHERE p.id = $1 AND p.is_active = true`,
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
      data: { product: result.rows[0] },
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
