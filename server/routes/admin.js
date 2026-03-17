const express = require('express');
const pool = require('../database/config');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { upload, handleUploadError } = require('../middleware/upload');
const fs = require('fs');

const router = express.Router();

// Apply admin auth to all routes
router.use(authenticateToken, requireAdmin);

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard stats
// @access  Admin
router.get('/dashboard', async (req, res) => {
  try {
    // Get total products
    const totalProducts = await pool.query('SELECT COUNT(*) as count FROM products');

    // Get total orders
    const totalOrders = await pool.query('SELECT COUNT(*) as count FROM orders');

    // Get total users
    const totalUsers = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_admin = false');

    // Get total revenue
    const totalRevenue = await pool.query(`
      SELECT COALESCE(SUM(total), 0) as revenue 
      FROM orders 
      WHERE status IN ('delivered', 'confirmed', 'pending')
    `);

    // Get recent orders
    const recentOrders = await pool.query(`
      SELECT o.*, u.name, u.phone
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `);

    // Get low stock products
    const lowStockProducts = await pool.query(`
      SELECT * FROM products 
      WHERE stock_quantity <= 5 
      AND is_active = true
      ORDER BY stock_quantity ASC
      LIMIT 5
    `);

    const response = {
      stats: {
        totalProducts: parseInt(totalProducts.rows[0].count),
        totalOrders: parseInt(totalOrders.rows[0].count),
        totalUsers: parseInt(totalUsers.rows[0].count),
        totalRevenue: parseFloat(totalRevenue.rows[0].revenue),
      },
      recentOrders: recentOrders.rows,
      lowStockProducts: lowStockProducts.rows,
    };

    console.log('Dashboard API Response:', response);
    console.log('Total Products from DB:', totalProducts.rows[0].count);
    console.log('Total Users from DB:', totalUsers.rows[0].count);

    res.json(response);

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   GET /api/admin/products
// @desc    Get all products for admin
// @access  Admin
router.get('/products', async (req, res) => {
  try {
    console.log('👑 GET /api/admin/products - Request received');
    console.log('👑 Query params:', req.query);
    console.log('👑 User:', req.user);

    const { page = 1, limit = 20, search, category, status } = req.query;
    const offset = (page - 1) * limit;

    console.log('👑 Processed params:', { page, limit, search, category, status, offset });

    let query = `
      SELECT 
        p.*,
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;

    const queryParams = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (p.name ILIKE $${paramCount} OR p.sku ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    if (category) {
      paramCount++;
      query += ` AND c.slug = $${paramCount}`;
      queryParams.push(category);
    }

    if (status) {
      paramCount++;
      query += ` AND p.is_active = $${paramCount}`;
      queryParams.push(status === 'active');
    }

    query += ` ORDER BY p."createdAt" DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(parseInt(limit), offset);
created_at
    console.log('👑 Admin products query:', query);
    console.log('👑 Admin products params:', queryParams);

    const products = await pool.query(query, queryParams);
    console.log('👑 Admin products found:', products.rows.length);
    console.log('👑 First admin product:', products.rows[0]);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;

    const countParams = [];
    paramCount = 0;

    if (search) {
      paramCount++;
      countQuery += ` AND (p.name ILIKE $${paramCount} OR p.sku ILIKE $${paramCount})`;
      countParams.push(`%${search}%`);
    }

    if (category) {
      paramCount++;
      countQuery += ` AND c.slug = $${paramCount}`;
      countParams.push(category);
    }

    if (status) {
      paramCount++;
      countQuery += ` AND p.is_active = $${paramCount}`;
      countParams.push(status === 'active');
    }

    const totalCount = await pool.query(countQuery, countParams);

    res.json({
      products: products.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount.rows[0].total / limit),
        totalItems: parseInt(totalCount.rows[0].total),
        itemsPerPage: parseInt(limit),
      },
    });

  } catch (error) {
    console.error('Get admin products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/products
// @desc    Create new product with image upload
// @access  Admin
router.post('/products', upload.array('images', 10), handleUploadError, async (req, res) => {
  try {
    const {
      name, description, price_per_kg, discount, category_id,
      stock_quantity, is_active, is_featured,
    } = req.body;

    // Validate required fields
    if (!name || !price_per_kg || !category_id) {
      return res.status(400).json({
        message: 'Missing required fields: name, price_per_kg, category_id',
      });
    }

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Check if slug already exists
    const existingSlug = await pool.query('SELECT id FROM products WHERE slug = $1', [slug]);
    if (existingSlug.rows.length > 0) {
      return res.status(400).json({ message: 'Product with this name already exists' });
    }

    // Get image URL from uploaded file
    let imageUrl = '';
    if (req.files && req.files.length > 0) {
      const primaryImage = req.files[0];
      imageUrl = primaryImage.path.startsWith('http') ? primaryImage.path : 
                (primaryImage.secure_url || primaryImage.url || primaryImage.path);
    }

    // Create product
    const newProduct = await pool.query(`
      INSERT INTO products (
        name, slug, description, image, price_per_kg, discount, category_id,
        stock_quantity, is_active, is_featured
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      name, slug, description, imageUrl, parseFloat(price_per_kg) || 0, parseFloat(discount) || 0, category_id,
      parseInt(stock_quantity) || 0, is_active !== false, is_featured === true,
    ]);

    const product = newProduct.rows[0];

    res.status(201).json({
      success: true,
      data: { product },
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

// @route   PUT /api/admin/products/:id
// @desc    Update product
// @access  Admin
router.put('/products/:id', upload.array('images', 1), handleUploadError, [
  body('name').optional().trim().notEmpty().withMessage('Product name is required'),
  body('price_per_kg').optional().isFloat({ min: 0 }).withMessage('Price per kg must be a positive number'),
  body('discount').optional().isFloat({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updateData = req.body || {};

    // Check if product exists
    const existingProduct = await pool.query('SELECT id FROM products WHERE id = $1', [id]);
    if (existingProduct.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Generate slug if name changed
    if (updateData.name) {
      updateData.slug = updateData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    // Handle new image if uploaded
    if (req.files && req.files.length > 0) {
      const imageFile = req.files[0];
      updateData.image = imageFile.path.startsWith('http') ? imageFile.path : 
                        (imageFile.secure_url || imageFile.url || imageFile.path);
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;

    Object.keys(updateData).forEach(key => {
      if (key !== 'id' && updateData[key] !== undefined && updateData[key] !== null && key !== 'images' && key !== 'remaining_image_ids') {
        paramCount++;
        updateFields.push(`${key} = $${paramCount}`);
        updateValues.push(updateData[key]);
      }
    });

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);
    paramCount++;

    const updateQuery = `
      UPDATE products 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const updatedProduct = await pool.query(updateQuery, updateValues);

    res.json({
      success: true,
      data: { product: updatedProduct.rows[0] },
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/admin/products/:id
// @desc    Soft delete product (set is_active = false)
// @access  Admin
router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const existingProduct = await pool.query('SELECT id FROM products WHERE id = $1', [id]);
    if (existingProduct.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Soft delete - set is_active to false
    const result = await pool.query(
      'UPDATE products SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id],
    );

    res.json({
      success: true,
      message: 'Product deleted successfully',
      data: { product: result.rows[0] },
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/admin/orders
// @desc    Get all orders for admin
// @access  Admin
router.get('/orders', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        o.*,
        u."firstName", u."lastName", u.email, u.phone,
        COUNT(oi.id) as item_count,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', oi.id,
              'productName', oi."productName",
              'quantity', oi.quantity,
              'price', oi.price,
              'calculatedPrice', oi."calculatedPrice"
            )
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '[]'::json
        ) as items
      FROM orders o
      JOIN users u ON o."userId" = u.id
      LEFT JOIN order_items oi ON o.id = oi."orderId"
      WHERE 1=1
    `;

    const queryParams = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND o.status = $${paramCount}`;
      queryParams.push(status);
    }

    if (search) {
      paramCount++;
      query += ` AND (o."orderNumber" ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    query += ` GROUP BY o.id, u."firstName", u."lastName", u.email, u.phone ORDER BY o."createdAt" DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(parseInt(limit), offset);

    const orders = await pool.query(query, queryParams);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM orders o
      JOIN users u ON o."userId" = u.id
      WHERE 1=1
    `;

    const countParams = [];
    paramCount = 0;

    if (status) {
      paramCount++;
      countQuery += ` AND o.status = $${paramCount}`;
      countParams.push(status);
    }

    if (search) {
      paramCount++;
      countQuery += ` AND (o."orderNumber" ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      countParams.push(`%${search}%`);
    }

    const totalCount = await pool.query(countQuery, countParams);

    res.json({
      orders: orders.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount.rows[0].total / limit),
        totalItems: parseInt(totalCount.rows[0].total),
        itemsPerPage: parseInt(limit),
      },
    });

  } catch (error) {
    console.error('Get admin orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/orders/:id/status
// @desc    Update order status
// @access  Admin
router.put('/orders/:id/status', [
  body('status').isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;

    // Check if order exists
    const existingOrder = await pool.query('SELECT id FROM orders WHERE id = $1', [id]);
    if (existingOrder.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update status
    await pool.query(
      'UPDATE orders SET status = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2',
      [status, id],
    );

    res.json({ message: 'Order status updated successfully' });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/users
// @desc    Create new user for admin
// @access  Admin
router.post('/users', [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, phone, isAdmin, isVerified } = req.body;

    // Check if email already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Generate a temporary password (in production, send via email)
    const tempPassword = 'temp123'; // This should be generated and sent via email
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create user
    const newUser = await pool.query(`
      INSERT INTO users ("firstName", "lastName", email, phone, password, "isAdmin", "isVerified")
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, "firstName", "lastName", email, phone, "isAdmin", "isVerified", "createdAt"
    `, [firstName, lastName, email, phone, hashedPassword, isAdmin || false, isVerified || false]);

    res.status(201).json({
      message: 'User created successfully',
      user: newUser.rows[0],
    });

  } catch (error) {
    console.error('Create admin user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users for admin
// @access  Admin
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        id, email, "firstName", "lastName", phone, "isAdmin", "isVerified", "createdAt", "updatedAt"
      FROM users
      WHERE 1=1
    `;

    const queryParams = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND ("firstName" ILIKE $${paramCount} OR "lastName" ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    if (role) {
      paramCount++;
      query += ` AND "isAdmin" = $${paramCount}`;
      queryParams.push(role === 'admin');
    }

    query += ` ORDER BY "createdAt" ${sortOrder} LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(parseInt(limit), offset);

    const users = await pool.query(query, queryParams);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM users
      WHERE 1=1
    `;

    const countParams = [];
    paramCount = 0;

    if (search) {
      paramCount++;
      countQuery += ` AND ("firstName" ILIKE $${paramCount} OR "lastName" ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      countParams.push(`%${search}%`);
    }

    if (role) {
      paramCount++;
      countQuery += ` AND "isAdmin" = $${paramCount}`;
      countParams.push(role === 'admin');
    }

    const totalCount = await pool.query(countQuery, countParams);

    res.json({
      users: users.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount.rows[0].total / limit),
        totalItems: parseInt(totalCount.rows[0].total),
        itemsPerPage: parseInt(limit),
      },
    });

  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/users/:id
// @desc    Get user by ID for admin
// @access  Admin
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await pool.query(`
      SELECT 
        id, email, "firstName", "lastName", phone, "isAdmin", "isVerified", "createdAt", "updatedAt"
      FROM users 
      WHERE id = $1
    `, [id]);

    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: user.rows[0] });

  } catch (error) {
    console.error('Get admin user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user for admin
// @access  Admin
router.put('/users/:id', [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { firstName, lastName, email, phone, isAdmin, isVerified } = req.body;

    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if email is already taken by another user
    const emailCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, id],
    );
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Email already taken' });
    }

    // Update user
    await pool.query(`
      UPDATE users 
      SET "firstName" = $1, "lastName" = $2, email = $3, phone = $4, 
          "isAdmin" = $5, "isVerified" = $6, "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = $7
    `, [firstName, lastName, email, phone, isAdmin || false, isVerified || false, id]);

    res.json({ message: 'User updated successfully' });

  } catch (error) {
    console.error('Update admin user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user for admin
// @access  Admin
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await pool.query('SELECT id, "isAdmin" FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deleting themselves
    if (req.user.id === id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Prevent deleting other admins
    if (existingUser.rows[0].isAdmin) {
      return res.status(400).json({ message: 'Cannot delete admin accounts' });
    }

    // Delete user (cascade will handle related records)
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('Delete admin user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/products/:id/stock
// @desc    Update product stock quantity
// @access  Admin
router.put('/products/:id/stock', [
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { quantity } = req.body;

    // Check if product exists
    const existingProduct = await pool.query('SELECT id FROM products WHERE id = $1', [id]);
    if (existingProduct.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Update stock quantity
    const updatedProduct = await pool.query(
      'UPDATE products SET stock_quantity = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [quantity, id],
    );

    res.json({
      message: 'Stock updated successfully',
      product: updatedProduct.rows[0],
    });

  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/analytics
// @desc    Get analytics data for admin
// @access  Admin
router.get('/analytics', async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    // Calculate date range based on period
    let dateFilter = '';
    let groupBy = '';

    switch (period) {
    case '24h':
      dateFilter = 'AND o."createdAt" >= NOW() - INTERVAL \'24 hours\'';
      groupBy = 'DATE(o."createdAt")';
      break;
    case '7d':
      dateFilter = 'AND o."createdAt" >= NOW() - INTERVAL \'7 days\'';
      groupBy = 'DATE(o."createdAt")';
      break;
    case '30d':
      dateFilter = 'AND o."createdAt" >= NOW() - INTERVAL \'30 days\'';
      groupBy = 'DATE(o."createdAt")';
      break;
    case '90d':
      dateFilter = 'AND o."createdAt" >= NOW() - INTERVAL \'90 days\'';
      groupBy = 'DATE(o."createdAt")';
      break;
    case '1y':
      dateFilter = 'AND o."createdAt" >= NOW() - INTERVAL \'1 year\'';
      groupBy = 'DATE_TRUNC(\'month\', o."createdAt")';
      break;
    }

    // Get sales data
    const salesData = await pool.query(`
      SELECT 
        ${groupBy} as period,
        COUNT(*) as orders,
        SUM(total) as revenue,
        AVG(total) as average_order
      FROM orders o
      WHERE status != 'cancelled' ${dateFilter}
      GROUP BY ${groupBy}
      ORDER BY period
    `);

    // Get top selling products
    const topProducts = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.price,
        pi.image_url,
        c.name as category_name,
        COUNT(oi.id) as order_count,
        SUM(oi.quantity) as total_quantity,
        SUM(oi."calculatedPrice") as total_revenue
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi."productId"
      LEFT JOIN orders o ON oi."orderId" = o.id
      LEFT JOIN product_images pi ON p.id = pi."productId" AND pi.is_primary = true
      LEFT JOIN categories c ON p."categoryId" = c.id
      WHERE o.status != 'cancelled' ${dateFilter}
      GROUP BY p.id, p.name, p.price, pi.image_url, c.name
      ORDER BY total_quantity DESC
      LIMIT 10
    `);

    // Get recent orders
    const recentOrders = await pool.query(`
      SELECT 
        o.id,
        o."orderNumber",
        o.total,
        o.status,
        o."createdAt",
        u."firstName",
        u."lastName",
        u.email
      FROM orders o
      LEFT JOIN users u ON o."userId" = u.id
      WHERE o.status != 'cancelled' ${dateFilter}
      ORDER BY o."createdAt" DESC
      LIMIT 10
    `);

    // Get category performance
    const categoryData = await pool.query(`
      SELECT 
        c.id,
        c.name,
        COUNT(DISTINCT p.id) as product_count,
        COUNT(oi.id) as order_count,
        SUM(oi."calculatedPrice") as revenue
      FROM categories c
      LEFT JOIN products p ON c.id = p."categoryId"
      LEFT JOIN order_items oi ON p.id = oi."productId"
      LEFT JOIN orders o ON oi."orderId" = o.id
      WHERE o.status != 'cancelled' ${dateFilter}
      GROUP BY c.id, c.name
      ORDER BY revenue DESC
    `);

    // Get order status breakdown
    const orderStatusBreakdown = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM orders 
      WHERE "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY status
    `);

    // Get basic stats for analytics
    const totalProducts = await pool.query('SELECT COUNT(*) as count FROM products');
    const totalUsers = await pool.query('SELECT COUNT(*) as count FROM users WHERE "isAdmin" = false');
    const totalOrders = await pool.query('SELECT COUNT(*) as count FROM orders');
    const totalRevenue = await pool.query(`
      SELECT COALESCE(SUM(total), 0) as revenue 
      FROM orders 
      WHERE status IN ('delivered', 'confirmed', 'pending')
    `);

    res.json({
      period,
      salesData: salesData.rows,
      topProducts: topProducts.rows,
      recentOrders: recentOrders.rows,
      categoryData: categoryData.rows,
      orderStatusBreakdown: orderStatusBreakdown.rows,
      stats: {
        totalProducts: parseInt(totalProducts.rows[0].count),
        totalOrders: parseInt(totalOrders.rows[0].count),
        totalUsers: parseInt(totalUsers.rows[0].count),
        totalRevenue: parseFloat(totalRevenue.rows[0].revenue),
      },
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
