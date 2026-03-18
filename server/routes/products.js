const express = require('express');
const { query } = require('../database/config');

const router = express.Router();

/**
 * SEARCH ENDPOINT - FAST, SIMPLE, OPTIMIZED
 * @route   GET /api/products/search?q=keyword
 * @desc    Fast product search by name and category
 * @access  Public
 * @performance Uses indexed columns (name, category) for instant results
 */
router.get('/search', async (req, res) => {
  try {
    const { q = '', limit = 20 } = req.query;
    
    // Minimum 2 characters required for search
    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        data: {
          products: [],
          query: q
        }
      });
    }

    const searchQuery = `%${q.toLowerCase()}%`;
    
    // Use indexed columns for performance: name, category
    const result = await query(`
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.description,
        p.price_per_kg,
        p.discount,
        p.stock_quantity,
        p.image,
        c.name as category_name,
        c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true 
        AND (
          LOWER(p.name) LIKE $1 
          OR LOWER(c.name) LIKE $1
        )
      ORDER BY 
        CASE WHEN LOWER(p.name) LIKE $1 THEN 0 ELSE 1 END,
        p.name ASC
      LIMIT $2
    `, [searchQuery, parseInt(limit || 20)]);

    // Format response
    const products = result.rows.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      pricePerKg: p.price_per_kg,
      discount: p.discount,
      image: p.image,
      category: p.category_name,
      categorySlug: p.category_slug,
      inStock: p.stock_quantity > 0
    }));

    res.json({
      success: true,
      data: {
        products,
        query: q,
        count: products.length
      }
    });

  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed'
    });
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

    // Get products with pagination (simplified schema - no categories, reviews, images)
    const productsQuery = `
      SELECT 
        id,
        name,
        description,
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
