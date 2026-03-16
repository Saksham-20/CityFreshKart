const express = require('express');
const { query } = require('../database/config');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateProduct, validateProductQuery, validateUUID } = require('../middleware/validation');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// @route   GET /api/products
// @desc    Get all products with filtering, sorting, and pagination
// @access  Public
router.get('/', validateProductQuery, async (req, res) => {
  try {
    console.log('🔍 GET /api/products - Request received');
    console.log('🔍 Query params:', req.query);

    const {
      page = 1,
      limit = 12,
      category,
      brand,
      min_price,
      max_price,
      sort = 'created_at',
      order = 'desc',
      search,
    } = req.query;

    console.log('🔍 Processed params:', { page, limit, category, brand, min_price, max_price, sort, order, search });

    const offset = (page - 1) * limit;

    // Build WHERE clause
    const whereConditions = ['p.is_active = true'];
    const queryParams = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      whereConditions.push(`c.slug = $${paramCount}`);
      queryParams.push(category);
    }


    if (min_price) {
      paramCount++;
      whereConditions.push(`p.price >= $${paramCount}`);
      queryParams.push(parseFloat(min_price));
    }

    if (max_price) {
      paramCount++;
      whereConditions.push(`p.price <= $${paramCount}`);
      queryParams.push(parseFloat(max_price));
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Build ORDER BY clause
    const orderByClause = `ORDER BY p.${sort} ${order.toUpperCase()}`;

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
    `;

    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);
    console.log('🔍 Total products found:', total);

    // Get products with pagination
    const productsQuery = `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.description,
        p.short_description,
        p.price,
        p.price_per_kg,
        p.discount,
        p.compare_price,
        p.sku,
        p.stock_quantity,
        p.is_featured,
        p.is_bestseller,
        p.is_new_arrival,
        p.meta_title,
        p.meta_description,
        p.created_at,
        p.updated_at,
        c.name as category_name,
        c.slug as category_slug,
        COALESCE(
          (SELECT AVG(r.rating)::numeric(3,2)
           FROM product_reviews r
           WHERE r.product_id = p.id AND r.is_approved = true), 0
        ) as average_rating,
        COALESCE(
          (SELECT COUNT(*)
           FROM product_reviews r
           WHERE r.product_id = p.id AND r.is_approved = true), 0
        ) as review_count,
        (
          SELECT pi.image_url
          FROM product_images pi
          WHERE pi.product_id = p.id AND pi.is_primary = true
          LIMIT 1
        ) as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ${orderByClause}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    console.log('🔍 Products query:', productsQuery);
    console.log('🔍 Products params:', [...queryParams, limit, offset]);

    const productsResult = await query(productsQuery, [...queryParams, limit, offset]);
    console.log('🔍 Products result count:', productsResult.rows.length);
    console.log('🔍 First product sample:', productsResult.rows[0]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    const response = {
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
    };

    console.log('🔍 Sending response with', productsResult.rows.length, 'products');
    res.json(response);

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   GET /api/products/featured
// @desc    Get featured products
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.description,
        p.short_description,
        p.price,
        p.price_per_kg,
        p.discount,
        p.compare_price,
        p.sku,
        p.is_featured,
        p.is_bestseller,
        p.is_new_arrival,
        c.name as category_name,
        c.slug as category_slug,
        (
          SELECT pi.image_url
          FROM product_images pi
          WHERE pi.product_id = p.id AND pi.is_primary = true
          LIMIT 1
        ) as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true AND (p.is_featured = true OR p.is_bestseller = true OR p.is_new_arrival = true)
      ORDER BY p.is_featured DESC, p.is_bestseller DESC, p.is_new_arrival DESC, p.created_at DESC
      LIMIT 8
    `);

    res.json({
      success: true,
      data: {
        products: result.rows,
      },
    });

  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   GET /api/products/categories
// @desc    Get all product categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    console.log('🔍 GET /api/products/categories - Request received');

    const result = await query(`
      SELECT id, name, slug, description, image_url, sort_order
      FROM categories
      WHERE is_active = true
      ORDER BY sort_order ASC, name ASC
    `);

    console.log('🔍 Categories found:', result.rows.length);
    console.log('🔍 Categories data:', result.rows);

    res.json({
      success: true,
      data: result.rows,
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   GET /api/products/:identifier
// @desc    Get product by slug or ID
// @access  Public
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;

    // Check if identifier is a UUID (ID) or slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);

    // Get product details
    const productResult = await query(`
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug,
        COALESCE(
          (SELECT AVG(r.rating)::numeric(3,2)
           FROM product_reviews r
           WHERE r.product_id = p.id AND r.is_approved = true), 0
        ) as average_rating,
        COALESCE(
          (SELECT COUNT(*)
           FROM product_reviews r
           WHERE r.product_id = p.id AND r.is_approved = true), 0
        ) as review_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ${isUUID ? 'p.id = $1' : 'p.slug = $1'} AND p.is_active = true
    `, [identifier]);

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const product = productResult.rows[0];

    // Get product images
    const imagesResult = await query(`
      SELECT id, image_url, alt_text, sort_order, is_primary
      FROM product_images
      WHERE product_id = $1
      ORDER BY sort_order, is_primary DESC
    `, [product.id]);

    // Get product variants
    const variantsResult = await query(`
      SELECT id, name, value, price_adjustment, stock_quantity, sku
      FROM product_variants
      WHERE product_id = $1
      ORDER BY name, value
    `, [product.id]);

    // Get related products
    const relatedResult = await query(`
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.price,
        p.compare_price,
        c.slug as category_slug,
        (
          SELECT pi.image_url
          FROM product_images pi
          WHERE pi.product_id = p.id AND pi.is_primary = true
          LIMIT 1
        ) as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true 
        AND p.id != $1 
        AND p.category_id = $2
      ORDER BY p.is_featured DESC, p.created_at DESC
      LIMIT 4
    `, [product.id, product.category_id]);

    res.json({
      success: true,
      data: {
        product: {
          ...product,
          images: imagesResult.rows,
          variants: variantsResult.rows,
          related_products: relatedResult.rows,
        },
      },
    });

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   POST /api/products
// @desc    Create a new product
// @access  Private (Admin only)
router.post('/', authenticateToken, requireAdmin, validateProduct, async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      short_description,
      price,
      compare_price,
      sku,
      stock_quantity,
      category_id,
      meta_title,
      meta_description,
    } = req.body;

    // Check if slug already exists
    const existingProduct = await query(
      'SELECT id FROM products WHERE slug = $1',
      [slug],
    );

    if (existingProduct.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Product with this slug already exists',
      });
    }

    // Create product
    const result = await query(`
      INSERT INTO products (
        name, slug, description, short_description, price, compare_price,
        sku, stock_quantity, category_id, meta_title, meta_description
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      name, slug, description, short_description, price, compare_price,
      sku, stock_quantity, category_id, meta_title, meta_description,
    ]);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: {
        product: result.rows[0],
      },
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   PUT /api/products/:id
// @desc    Update a product
// @access  Private (Admin only)
router.put('/:id', authenticateToken, requireAdmin, validateUUID, validateProduct, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if product exists
    const existingProduct = await query(
      'SELECT id FROM products WHERE id = $1',
      [id],
    );

    if (existingProduct.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;

    Object.keys(updateData).forEach(key => {
      if (key !== 'id' && updateData[key] !== undefined) {
        paramCount++;
        updateFields.push(`${key} = $${paramCount}`);
        updateValues.push(updateData[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    paramCount++;
    updateValues.push(id);

    const updateQuery = `
      UPDATE products 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(updateQuery, updateValues);

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: {
        product: result.rows[0],
      },
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete a product
// @access  Private (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, validateUUID, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const existingProduct = await query(
      'SELECT id FROM products WHERE id = $1',
      [id],
    );

    if (existingProduct.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Soft delete (set is_active to false)
    await query(
      'UPDATE products SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id],
    );

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   GET /api/products/:id/reviews
// @desc    Get product reviews
// @access  Public
router.get('/:id/reviews', validateUUID, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Get reviews with pagination
    const result = await query(`
      SELECT 
        r.id,
        r.rating,
        r.title,
        r.comment,
        r.is_verified_purchase,
        r.created_at,
        u.first_name,
        u.last_name
      FROM product_reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.product_id = $1 AND r.is_approved = true
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `, [id, limit, offset]);

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) as total FROM product_reviews WHERE product_id = $1 AND is_approved = true',
      [id],
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        reviews: result.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_items: total,
          items_per_page: parseInt(limit),
        },
      },
    });

  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   GET /api/products/related
// @desc    Get related products
// @access  Public
router.get('/related', async (req, res) => {
  try {
    const { categoryId, excludeId, limit = 4 } = req.query;
    
    console.log('🔗 Related Products - categoryId:', categoryId);
    console.log('🔗 Related Products - excludeId:', excludeId);
    console.log('🔗 Related Products - limit:', limit);

    if (!categoryId) {
      console.log('🔗 Related Products - ERROR: Category ID is missing');
      return res.status(400).json({
        success: false,
        message: 'Category ID is required',
      });
    }

    const result = await query(`
      SELECT 
        p.*,
        pi.image_url as primary_image
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
      WHERE p.category_id = $1 
        AND p.id != $2 
        AND p.is_active = true
      ORDER BY p.is_featured DESC, p.created_at DESC
      LIMIT $3
    `, [categoryId, excludeId || null, parseInt(limit)]);

    console.log('🔗 Related Products - Query result count:', result.rows.length);
    console.log('🔗 Related Products - Query result:', result.rows);

    res.json({
      success: true,
      data: result.rows,
    });

  } catch (error) {
    console.error('Get related products error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   GET /api/products/:id/reviews
// @desc    Get product reviews
// @access  Public
router.get('/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        r.*,
        u.first_name,
        u.last_name
      FROM product_reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.product_id = $1 AND r.is_approved = true
      ORDER BY r.created_at DESC
    `, [id]);

    res.json({
      success: true,
      data: result.rows,
    });

  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   POST /api/products/:id/reviews
// @desc    Add product review
// @access  Private
router.post('/:id/reviews', authenticateToken, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().isLength({ min: 1, max: 1000 }).withMessage('Comment must be between 1 and 1000 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { rating, comment } = req.body;

    // Check if user already reviewed this product
    const existingReview = await query(
      'SELECT id FROM product_reviews WHERE product_id = $1 AND user_id = $2',
      [id, req.user.id],
    );

    if (existingReview.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product',
      });
    }

    // Add review
    const result = await query(`
      INSERT INTO product_reviews (product_id, user_id, rating, comment, is_approved)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [id, req.user.id, rating, comment, true]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });

  } catch (error) {
    console.error('Add product review error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

module.exports = router;
