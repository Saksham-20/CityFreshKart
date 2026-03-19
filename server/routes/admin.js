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
    const totalProducts = await pool.query('SELECT COUNT(*) as count FROM products WHERE is_active = true');

    // Get total orders
    const totalOrders = await pool.query('SELECT COUNT(*) as count FROM orders');

    // Get total users
    const totalUsers = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_admin = false');

    // Get total revenue
    const totalRevenue = await pool.query(`
      SELECT COALESCE(SUM(total_price), 0) as revenue 
      FROM orders 
      WHERE status IN ('delivered', 'confirmed', 'pending')
    `);

    // Get category breakdown
    const categoryStats = await pool.query(`
      SELECT category, COUNT(*) as count 
      FROM products 
      WHERE is_active = true 
      GROUP BY category 
      ORDER BY count DESC
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
      WHERE quantity_available <= 5 
      AND is_active = true
      ORDER BY quantity_available ASC
      LIMIT 5
    `);

    const response = {
      stats: {
        totalProducts: parseInt(totalProducts.rows[0].count),
        totalOrders: parseInt(totalOrders.rows[0].count),
        totalUsers: parseInt(totalUsers.rows[0].count),
        totalRevenue: parseFloat(totalRevenue.rows[0].revenue),
        totalCategories: categoryStats.rows.length,
      },
      categoryStats: categoryStats.rows,
      recentOrders: recentOrders.rows,
      lowStockProducts: lowStockProducts.rows,
    };

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
    const { page = 1, limit = 20, search, category, status } = req.query;
    const offset = (page - 1) * limit;

    let query = `SELECT * FROM products WHERE 1=1`;

    const queryParams = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND name ILIKE $${paramCount}`;
      queryParams.push(`%${search}%`);
    }

    if (status) {
      paramCount++;
      query += ` AND is_active = $${paramCount}`;
      queryParams.push(status === 'active');
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(parseInt(limit), offset);

    const products = await pool.query(query, queryParams);

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM products WHERE 1=1`;

    const countParams = [];
    paramCount = 0;

    if (search) {
      paramCount++;
      countQuery += ` AND name ILIKE $${paramCount}`;
      countParams.push(`%${search}%`);
    }

    if (status) {
      paramCount++;
      countQuery += ` AND is_active = $${paramCount}`;
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
    const { name, description, price_per_kg, discount, category, stock_quantity, is_active, pricing_type } = req.body;

    // Validate required fields
    if (!name || !price_per_kg) {
      return res.status(400).json({
        message: 'Missing required fields: name, price_per_kg',
      });
    }

    // Check if product name already exists
    const existingProduct = await pool.query('SELECT id FROM products WHERE LOWER(name) = LOWER($1)', [name]);
    if (existingProduct.rows.length > 0) {
      return res.status(400).json({ message: 'Product with this name already exists' });
    }

    // Get image URL: prefer uploaded file, fall back to direct URL from form
    let imageUrl = req.body.image_url || '';
    if (req.files && req.files.length > 0) {
      const primaryImage = req.files[0];
      imageUrl = primaryImage.path.startsWith('http') ? primaryImage.path :
                (primaryImage.secure_url || primaryImage.url || primaryImage.path);
    }

    const validPricingType = ['per_kg', 'per_piece'].includes(pricing_type) ? pricing_type : 'per_kg';

    // Create product
    const newProduct = await pool.query(`
      INSERT INTO products (
        name, description, category, image_url, price_per_kg, discount,
        quantity_available, is_active, pricing_type, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `, [
      name, description || '', category || 'Uncategorized', imageUrl,
      parseFloat(price_per_kg) || 0, parseFloat(discount) || 0,
      parseFloat(stock_quantity) || 0,
      is_active !== 'false' && is_active !== false,
      validPricingType,
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

    // Handle new image if uploaded
    if (req.files && req.files.length > 0) {
      const imageFile = req.files[0];
      updateData.image_url = imageFile.path.startsWith('http') ? imageFile.path :
                             (imageFile.secure_url || imageFile.url || imageFile.path);
    }

    // Map stock_quantity form field to quantity_available column
    if (updateData.stock_quantity !== undefined) {
      updateData.quantity_available = parseFloat(updateData.stock_quantity) || 0;
      delete updateData.stock_quantity;
    }

    // Columns that don't exist in the schema — skip them
    const skipKeys = new Set(['id', 'slug', 'image', 'category_id', 'sku', 'weight',
      'is_featured', 'is_bestseller', 'is_new_arrival', 'images', 'remaining_image_ids']);

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;

    Object.keys(updateData).forEach(key => {
      if (!skipKeys.has(key) && updateData[key] !== undefined && updateData[key] !== null) {
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
        u.name, u.phone,
        COUNT(oi.id) as item_count,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', oi.id,
              'product_name', oi.product_name,
              'quantity_kg', oi.quantity_kg,
              'price_per_kg', oi.price_per_kg,
              'total_price', oi.total_price
            )
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '[]'::json
        ) as items
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
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
      query += ` AND (o.order_number ILIKE $${paramCount} OR u.phone ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    query += ` GROUP BY o.id, u.name, u.phone ORDER BY o.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(parseInt(limit), offset);

    const orders = await pool.query(query, queryParams);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM orders o
      JOIN users u ON o.user_id = u.id
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
      countQuery += ` AND (o.order_number ILIKE $${paramCount} OR u.phone ILIKE $${paramCount})`;
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
// @desc    Update order status (and optionally append an admin note)
// @access  Admin
router.put('/orders/:id/status', [
  body('status').isIn(['pending', 'confirmed', 'delivered', 'cancelled']).withMessage('Invalid status'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status, admin_note } = req.body;

    // Check if order exists
    const existingOrder = await pool.query('SELECT id, notes FROM orders WHERE id = $1', [id]);
    if (existingOrder.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (admin_note && admin_note.trim()) {
      const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      const existing = existingOrder.rows[0].notes || '';
      const separator = existing ? '\n' : '';
      const newNotes = `${existing}${separator}[Admin ${timestamp}]: ${admin_note.trim()}`;
      await pool.query(
        'UPDATE orders SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [status, newNotes, id],
      );
    } else {
      await pool.query(
        'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [status, id],
      );
    }

    res.json({ message: 'Order status updated successfully' });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/users
// @desc    Create new user from admin panel
// @access  Admin
router.post('/users', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('password').trim().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone, password, is_admin } = req.body;

    const normalizedPhone = phone.replace(/\D/g, '').slice(-10);

    const existingUser = await pool.query('SELECT id FROM users WHERE phone = $1', [normalizedPhone]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Phone number already exists' });
    }

    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await pool.query(`
      INSERT INTO users (phone, name, password_hash, is_admin, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id, phone, name, is_admin, created_at
    `, [normalizedPhone, name, passwordHash, is_admin || false]);

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
    const { page = 1, limit = 20, search, role, sortOrder = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        id, phone, name, is_admin, created_at, updated_at
      FROM users
      WHERE 1=1
    `;

    const queryParams = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR phone ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    if (role) {
      paramCount++;
      query += ` AND is_admin = $${paramCount}`;
      queryParams.push(role === 'admin');
    }

    query += ` ORDER BY created_at ${sortOrder} LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
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
      countQuery += ` AND (name ILIKE $${paramCount} OR phone ILIKE $${paramCount})`;
      countParams.push(`%${search}%`);
    }

    if (role) {
      paramCount++;
      countQuery += ` AND is_admin = $${paramCount}`;
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
        id, phone, name, is_admin, created_at, updated_at
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
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, is_admin } = req.body;

    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user — name and/or is_admin toggle
    await pool.query(`
      UPDATE users 
      SET name = COALESCE($1, name),
          is_admin = COALESCE($2, is_admin),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [name || null, is_admin !== undefined ? is_admin : null, id]);

    const updated = await pool.query(
      'SELECT id, phone, name, is_admin, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );

    res.json({ message: 'User updated successfully', user: updated.rows[0] });

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
    const existingUser = await pool.query('SELECT id, is_admin FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deleting themselves
    if (req.user.id === id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Prevent deleting other admins
    if (existingUser.rows[0].is_admin) {
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
      'UPDATE products SET quantity_available = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
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
      dateFilter = 'AND o.created_at >= NOW() - INTERVAL \'24 hours\'';
      groupBy = 'DATE(o.created_at)';
      break;
    case '7d':
      dateFilter = 'AND o.created_at >= NOW() - INTERVAL \'7 days\'';
      groupBy = 'DATE(o.created_at)';
      break;
    case '30d':
      dateFilter = 'AND o.created_at >= NOW() - INTERVAL \'30 days\'';
      groupBy = 'DATE(o.created_at)';
      break;
    case '90d':
      dateFilter = 'AND o.created_at >= NOW() - INTERVAL \'90 days\'';
      groupBy = 'DATE(o.created_at)';
      break;
    case '1y':
      dateFilter = 'AND o.created_at >= NOW() - INTERVAL \'1 year\'';
      groupBy = 'DATE_TRUNC(\'month\', o.created_at)';
      break;
    }

    // Get sales data
    const salesData = await pool.query(`
      SELECT 
        ${groupBy} as period,
        COUNT(*) as orders,
        SUM(total_price) as revenue,
        AVG(total_price) as average_order
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
        p.price_per_kg,
        p.image_url,
        COUNT(oi.id) as order_count,
        SUM(oi.quantity_kg) as total_quantity,
        SUM(oi.total_price) as total_revenue
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'cancelled' ${dateFilter}
      GROUP BY p.id, p.name, p.price_per_kg, p.image_url
      ORDER BY total_quantity DESC
      LIMIT 10
    `);

    // Get recent orders
    const recentOrders = await pool.query(`
      SELECT 
        o.id,
        o.order_number,
        o.total_price,
        o.status,
        o.created_at,
        u.name,
        u.phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.status != 'cancelled' ${dateFilter}
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

    // Category performance not applicable with current schema (no categories table)
    const categoryData = { rows: [] };

    // Get order status breakdown
    const orderStatusBreakdown = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM orders 
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY status
    `);

    // Get basic stats for analytics
    const totalProducts = await pool.query('SELECT COUNT(*) as count FROM products');
    const totalUsers = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_admin = false');
    const totalOrders = await pool.query('SELECT COUNT(*) as count FROM orders');
    const totalRevenue = await pool.query(`
      SELECT COALESCE(SUM(total_price), 0) as revenue 
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

// ── Store Settings ──────────────────────────────────────────────────────────

// @route   GET /api/admin/settings  (also exposed publicly via server/index.js as GET /api/settings)
// @desc    Get all store settings as key-value object
// @access  Admin (public read registered separately in index.js)
router.get('/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM store_settings ORDER BY key');
    const settings = {};
    result.rows.forEach(row => { settings[row.key] = row.value; });
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/settings
// @desc    Update store settings
// @access  Admin
router.put('/settings', async (req, res) => {
  try {
    const { min_order_amount, free_delivery_threshold, delivery_fee } = req.body;
    const updates = [];

    if (min_order_amount !== undefined) {
      updates.push(['min_order_amount', String(parseFloat(min_order_amount) || 0)]);
    }
    if (free_delivery_threshold !== undefined) {
      updates.push(['free_delivery_threshold', String(parseFloat(free_delivery_threshold) || 0)]);
    }
    if (delivery_fee !== undefined) {
      updates.push(['delivery_fee', String(parseFloat(delivery_fee) || 0)]);
    }

    for (const [key, value] of updates) {
      await pool.query(
        'INSERT INTO store_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP',
        [key, value],
      );
    }

    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
