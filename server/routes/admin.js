const express = require('express');
const pool = require('../database/config');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { upload, handleUploadError } = require('../middleware/upload');
const imageService = require('../services/imageService');
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
      SELECT COALESCE(SUM(total_amount), 0) as revenue 
      FROM orders 
      WHERE status IN ('delivered', 'shipped', 'processing')
    `);

    // Get recent orders
    const recentOrders = await pool.query(`
      SELECT o.*, u.first_name, u.last_name, u.email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `);

    // Get low stock products
    const lowStockProducts = await pool.query(`
      SELECT * FROM products 
      WHERE stock_quantity <= low_stock_threshold 
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
        c.name as category_name,
        pi.image_url as primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
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

    query += ` ORDER BY p.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(parseInt(limit), offset);

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
      name, description, price_per_kg, discount, category_id, sku,
      stock_quantity,
      is_active,
    } = req.body;

    // Validate required fields
    if (!name || !price_per_kg || !category_id || !sku) {
      return res.status(400).json({
        message: 'Missing required fields: name, price_per_kg, category_id, sku',
      });
    }

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Check if SKU already exists
    const existingSku = await pool.query('SELECT id FROM products WHERE sku = $1', [sku]);
    if (existingSku.rows.length > 0) {
      return res.status(400).json({ message: 'SKU already exists' });
    }

    // Create product
    const newProduct = await pool.query(`
      INSERT INTO products (
        name, slug, description, price_per_kg, discount, category_id, sku,
        stock_quantity, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      name, slug, description, parseFloat(price_per_kg) || 0, parseFloat(discount) || 0, category_id, sku,
      parseInt(stock_quantity) || 0, is_active !== false,
    ]);

    const product = newProduct.rows[0];

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      try {
        console.log(`Processing ${req.files.length} images for new product ${product.id}`);

        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];
          const isPrimary = i === 0; // First image is primary

          console.log(`Processing image ${i + 1}/${req.files.length}: ${file.originalname}`);

          // For Cloudinary uploads, use the secure URL directly
          const imageUrl = file.path.startsWith('http') ? file.path : 
                          (file.secure_url || file.url || file.path);

          // Save image record to database
          await pool.query(`
            INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            product.id,
            imageUrl,
            file.originalname,
            i,
            isPrimary,
          ]);

          console.log(`Successfully processed and stored image: ${imageUrl}`);

          // Cloudinary files don't need local cleanup
          console.log('Cloudinary upload complete:', imageUrl);
        }
      } catch (imageError) {
        console.error('Image processing error:', imageError);
        // Don't fail the product creation if image processing fails
      }
    }

    res.status(201).json({
      message: 'Product created successfully',
      product: product,
    });

  } catch (error) {
    console.error('Create product error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
});

// @route   PUT /api/admin/products/:id
// @desc    Update product
// @access  Admin
router.put('/products/:id', upload.array('images', 10), handleUploadError, [
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

    updateValues.push(id);
    paramCount++;
    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    const updateQuery = `
      UPDATE products 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const updatedProduct = await pool.query(updateQuery, updateValues);

    // Handle image deletions first
    if (updateData.remaining_image_ids) {
      try {
        const remainingIds = updateData.remaining_image_ids.split(',').filter(id => id.trim() !== '');

        // Get all current images for this product
        const currentImages = await pool.query(
          'SELECT id, image_url FROM product_images WHERE product_id = $1',
          [id],
        );

        // Find images to delete (not in remaining_ids)
        const imagesToDelete = currentImages.rows.filter(img =>
          !remainingIds.includes(img.id.toString()),
        );

        // Delete images from database
        if (imagesToDelete.length > 0) {
          const deleteIds = imagesToDelete.map(img => img.id);
          await pool.query(
            'DELETE FROM product_images WHERE id = ANY($1)',
            [deleteIds],
          );

          // Delete image files from filesystem
          for (const img of imagesToDelete) {
            try {
              const imagePath = img.image_url.replace('/uploads/', 'uploads/');
              if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
                console.log('Deleted image file:', imagePath);
              }
            } catch (fileError) {
              console.log('Could not delete image file:', fileError.message);
            }
          }
        }
      } catch (deleteError) {
        console.error('Image deletion error:', deleteError);
        // Don't fail the update if image deletion fails
      }
    }

    // If there are uploaded images, process them and append to product_images (cap at 6 total)
    if (req.files && req.files.length > 0) {
      try {
        // Count existing images after deletion
        const existingImagesRes = await pool.query(
          'SELECT id, is_primary FROM product_images WHERE product_id = $1 ORDER BY sort_order ASC',
          [id],
        );
        const existingCount = existingImagesRes.rows.length;
        const hasPrimary = existingImagesRes.rows.some(img => img.is_primary);

        // Determine how many new images we can add to keep total <= 6
        const remainingSlots = Math.max(0, 6 - existingCount);
        const filesToProcess = req.files.slice(0, remainingSlots);

        console.log(`Processing ${filesToProcess.length} new images for product ${id}`);

        for (let i = 0; i < filesToProcess.length; i++) {
          const file = filesToProcess[i];
          const isPrimary = !hasPrimary && (existingCount === 0) && i === 0; // set primary if none exists

          console.log(`Processing image ${i + 1}/${filesToProcess.length}: ${file.originalname}`);

          // For Cloudinary uploads, use the secure URL directly
          const imageUrl = file.path.startsWith('http') ? file.path : 
                          (file.secure_url || file.url || file.path);

          await pool.query(
            `INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              id,
              imageUrl,
              file.originalname,
              existingCount + i,
              isPrimary,
            ],
          );

          console.log(`Successfully processed and stored image: ${imageUrl}`);

          // Cloudinary files don't need local cleanup
          console.log('Cloudinary upload complete:', imageUrl);
        }
      } catch (imageError) {
        console.error('Image processing error (update):', imageError);
        // Do not fail the update if image processing fails
      }
    }

    res.json({
      message: 'Product updated successfully',
      product: updatedProduct.rows[0],
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/admin/products/:id
// @desc    Delete product completely (hard delete)
// @access  Admin
router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const existingProduct = await pool.query('SELECT id FROM products WHERE id = $1', [id]);
    if (existingProduct.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Get product images before deletion
    const productImages = await pool.query('SELECT image_url FROM product_images WHERE product_id = $1', [id]);

    // Delete product images from database
    await pool.query('DELETE FROM product_images WHERE product_id = $1', [id]);

    // Delete product from database (hard delete)
    await pool.query('DELETE FROM products WHERE id = $1', [id]);

    // Delete product images from file system
    try {
      const productDir = `uploads/products/${id}`;
      if (fs.existsSync(productDir)) {
        fs.rmSync(productDir, { recursive: true, force: true });
        console.log('Deleted product images directory:', productDir);
      }
    } catch (fileError) {
      console.error('Error deleting product images:', fileError);
      // Don't fail the request if file deletion fails
    }

    res.json({ message: 'Product completely removed successfully' });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error' });
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
        u.first_name, u.last_name, u.email, u.phone,
        o.shipping_address->>'phone' as shipping_phone,
        COUNT(oi.id) as item_count,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', oi.id,
              'product_name', oi.product_name,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price,
              'total_price', oi.total_price,
              'variant_details', oi.variant_details,
              'image_url', pi.image_url
            )
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '[]'::json
        ) as items
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
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
      query += ` AND (o.order_number ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    query += ` GROUP BY o.id, u.first_name, u.last_name, u.email, u.phone ORDER BY o.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
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
      countQuery += ` AND (o.order_number ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
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
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
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
      INSERT INTO users (first_name, last_name, email, phone, password_hash, is_admin, is_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, first_name, last_name, email, phone, is_admin, is_verified, created_at
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
        id, email, first_name, last_name, phone, is_admin, is_verified, created_at, updated_at
      FROM users
      WHERE 1=1
    `;

    const queryParams = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    if (role) {
      paramCount++;
      query += ` AND is_admin = $${paramCount}`;
      queryParams.push(role === 'admin');
    }

    query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
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
      countQuery += ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
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
        id, email, first_name, last_name, phone, is_admin, is_verified, created_at, updated_at
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
      SET first_name = $1, last_name = $2, email = $3, phone = $4, 
          is_admin = $5, is_verified = $6, updated_at = CURRENT_TIMESTAMP
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
      'UPDATE products SET stock_quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
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
        SUM(total_amount) as revenue,
        AVG(total_amount) as average_order
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
        SUM(oi.total_price) as total_revenue
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE o.status != 'cancelled' ${dateFilter}
      GROUP BY p.id, p.name, p.price, pi.image_url, c.name
      ORDER BY total_quantity DESC
      LIMIT 10
    `);

    // Get recent orders
    const recentOrders = await pool.query(`
      SELECT 
        o.id,
        o.order_number,
        o.total_amount,
        o.status,
        o.created_at,
        u.first_name,
        u.last_name,
        u.email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.status != 'cancelled' ${dateFilter}
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

    // Get category performance
    const categoryData = await pool.query(`
      SELECT 
        c.id,
        c.name,
        COUNT(DISTINCT p.id) as product_count,
        COUNT(oi.id) as order_count,
        SUM(oi.total_price) as revenue
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
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
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY status
    `);

    // Get basic stats for analytics
    const totalProducts = await pool.query('SELECT COUNT(*) as count FROM products');
    const totalUsers = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_admin = false');
    const totalOrders = await pool.query('SELECT COUNT(*) as count FROM orders');
    const totalRevenue = await pool.query(`
      SELECT COALESCE(SUM(total_amount), 0) as revenue 
      FROM orders 
      WHERE status IN ('delivered', 'shipped', 'processing')
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
