const express = require('express');
const { query } = require('../database/config');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateProduct, validateProductQuery, validateUUID } = require('../middleware/validation');
const { body, validationResult } = require('express-validator');

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
        c.name as category_name,
        c.slug as category_slug,
        (
          SELECT image FROM products WHERE id = p.id LIMIT 1
        ) as image
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
      sort = 'createdAt',
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
      whereConditions.push(`p.price_per_kg >= $${paramCount}`);
      queryParams.push(parseFloat(min_price));
    }

    if (max_price) {
      paramCount++;
      whereConditions.push(`p.price_per_kg <= $${paramCount}`);
      queryParams.push(parseFloat(max_price));
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Build ORDER BY clause - use only price_per_kg (not price)
    const sortMap = { 
      createdAt: 'p."created_at"', 
      price: 'p.price_per_kg', 
      name: 'p.name' 
    };
    const sortCol = sortMap[sort] || 'p."created_at"';
    const orderByClause = `ORDER BY ${sortCol} ${order.toUpperCase()}`;

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

    // Get products with pagination - SIMPLIFIED SCHEMA
    const productsQuery = `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.description,
        p.image,
        p.price_per_kg,
        p.discount,
        p.stock_quantity,
        p.is_featured,
        p."created_at",
        p."updated_at",
        c.name as category_name,
        c.slug as category_slug
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
        p.image,
        p.price_per_kg,
        p.discount,
        p.stock_quantity,
        p.is_featured,
        p."created_at",
        p."updated_at",
        c.name as category_name,
        c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true AND p.is_featured = true
      ORDER BY p."created_at" DESC
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
      SELECT id, name, slug, description, image
      FROM categories
      ORDER BY name ASC
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

    // Get product details - SIMPLIFIED SCHEMA
    const productResult = await query(`
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.description,
        p.image,
        p.category_id,
        p.price_per_kg,
        p.discount,
        p.stock_quantity,
        p.is_active,
        p.is_featured,
        p."created_at",
        p."updated_at",
        c.name as category_name,
        c.slug as category_slug
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

    // Get related products (same category)
    const relatedResult = await query(`
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.price_per_kg,
        p.discount,
        p.image,
        c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true 
        AND p.id != $1 
        AND p.category_id = $2
      ORDER BY p.is_featured DESC, p."created_at" DESC
      LIMIT 4
    `, [product.id, product.category_id]);

    res.json({
      success: true,
      data: {
        product: {
          ...product,
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
      image,
      price_per_kg,
      discount,
      stock_quantity,
      category_id,
      is_featured,
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

    // Create product - SIMPLIFIED SCHEMA
    const result = await query(`
      INSERT INTO products (
        name, slug, description, image, price_per_kg, discount,
        stock_quantity, category_id, is_featured, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, name, slug, description, image, price_per_kg, discount, stock_quantity, category_id, is_featured, is_active, created_at, updated_at
    `, [
      name, slug, description, image, price_per_kg || 0, discount || 0,
      stock_quantity || 0, category_id, is_featured || false, true,
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
    const {
      name,
      slug,
      description,
      image,
      price_per_kg,
      discount,
      stock_quantity,
      category_id,
      is_featured,
      is_active,
    } = req.body;

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

    // Update product - SIMPLIFIED SCHEMA
    const result = await query(`
      UPDATE products 
      SET 
        name = COALESCE($1, name),
        slug = COALESCE($2, slug),
        description = COALESCE($3, description),
        image = COALESCE($4, image),
        price_per_kg = COALESCE($5, price_per_kg),
        discount = COALESCE($6, discount),
        stock_quantity = COALESCE($7, stock_quantity),
        category_id = COALESCE($8, category_id),
        is_featured = COALESCE($9, is_featured),
        is_active = COALESCE($10, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING id, name, slug, description, image, price_per_kg, discount, stock_quantity, category_id, is_featured, is_active, created_at, updated_at
    `, [
      name, slug, description, image, price_per_kg, discount, stock_quantity, category_id, is_featured, is_active, id,
    ]);

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

module.exports = router;
