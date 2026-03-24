const express = require('express');
const pool = require('../database/config');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { upload, handleUploadError } = require('../middleware/upload');
const webPushService = require('../services/webPushService');

const router = express.Router();

const toPublicUploadPath = (file) => {
  if (!file) return '';
  if (file.secure_url || file.url) return file.secure_url || file.url;

  const normalizedPath = String(file.path || '').replace(/\\/g, '/');
  const uploadsIndex = normalizedPath.lastIndexOf('/uploads/');
  if (uploadsIndex >= 0) return normalizedPath.slice(uploadsIndex);

  if (file.filename) {
    const folder = file.destination && String(file.destination).toLowerCase().includes('products')
      ? 'products'
      : 'general';
    return `/uploads/${folder}/${file.filename}`;
  }

  return '';
};

/** Skip multer when client sends JSON (e.g. text-only banner update). */
const optionalSingleImageUpload = (req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('multipart/form-data')) {
    return upload.single('image')(req, res, next);
  }
  return next();
};

const parseAndNormalizeWeightOverrides = (raw) => {
  if (raw === undefined || raw === null || raw === '') return {};
  let parsed = raw;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch (_) {
      throw new Error('weight_price_overrides must be valid JSON object');
    }
  }
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('weight_price_overrides must be an object of { weightKg: price }');
  }

  const normalized = {};
  for (const [weightKey, overridePrice] of Object.entries(parsed)) {
    const weightVal = parseFloat(weightKey);
    const priceVal = parseFloat(overridePrice);
    if (!Number.isFinite(weightVal) || weightVal <= 0) {
      throw new Error(`Invalid weight key: ${weightKey}`);
    }
    if (!Number.isFinite(priceVal) || priceVal < 0) {
      throw new Error(`Invalid override price for weight ${weightKey}`);
    }
    normalized[weightVal.toFixed(2)] = parseFloat(priceVal.toFixed(2));
  }
  return normalized;
};

// Apply admin auth to all routes
router.use(authenticateToken, requireAdmin);

async function getStoreOrderSettings() {
  const out = { free_delivery_threshold: 300, delivery_fee: 50, min_order_amount: 0 };
  try {
    const result = await pool.query(
      'SELECT key, value FROM store_settings WHERE key = ANY($1::text[])',
      [['free_delivery_threshold', 'delivery_fee', 'min_order_amount']],
    );
    for (const row of result.rows) {
      const v = parseFloat(row.value);
      if (!Number.isFinite(v)) continue;
      if (row.key === 'free_delivery_threshold') out.free_delivery_threshold = v;
      else if (row.key === 'delivery_fee') out.delivery_fee = v;
      else if (row.key === 'min_order_amount') out.min_order_amount = v;
    }
  } catch (_) {}
  return out;
}

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard stats
// @access  Admin
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalProducts,
      totalOrders,
      totalUsers,
      totalRevenue,
      categoryStats,
      recentOrders,
      lowStockProducts,
      configuredCategories,
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM products WHERE is_active = true'),
      pool.query('SELECT COUNT(*) as count FROM orders'),
      pool.query('SELECT COUNT(*) as count FROM users WHERE is_admin = false'),
      pool.query(`
      SELECT COALESCE(SUM(total_price), 0) as revenue 
      FROM orders 
      WHERE status IN ('delivered', 'confirmed', 'pending')
    `),
      pool.query(`
      SELECT category, COUNT(*) as count 
      FROM products 
      WHERE is_active = true 
      GROUP BY category 
      ORDER BY count DESC
    `),
      pool.query(`
      SELECT o.*, u.name, u.phone
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `),
      pool.query(`
      SELECT * FROM products 
      WHERE quantity_available <= 5 
      AND is_active = true
      ORDER BY quantity_available ASC
      LIMIT 5
    `),
      getProductCategories(),
    ]);

    const response = {
      stats: {
        totalProducts: parseInt(totalProducts.rows[0].count),
        totalOrders: parseInt(totalOrders.rows[0].count),
        totalUsers: parseInt(totalUsers.rows[0].count),
        totalRevenue: parseFloat(totalRevenue.rows[0].revenue),
        totalCategories: configuredCategories.length,
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
    const { search, category, status } = req.query;
    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let query = `
      SELECT p.*, COALESCE(wp.weight_price_overrides, '{}'::json) AS weight_price_overrides
      FROM products p
      LEFT JOIN LATERAL (
        SELECT json_object_agg(weight_option::text, price_override) AS weight_price_overrides
        FROM product_weight_prices
        WHERE product_id = p.id
      ) wp ON true
      WHERE 1=1
    `;

    const queryParams = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND p.name ILIKE $${paramCount}`;
      queryParams.push(`%${search}%`);
    }

    if (status) {
      paramCount++;
      query += ` AND p.is_active = $${paramCount}`;
      queryParams.push(status === 'active');
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limitNum, offset);

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

    const total = parseInt(totalCount.rows[0].total, 10);
    res.json({
      products: products.rows,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum) || 0,
        totalItems: total,
        itemsPerPage: limitNum,
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
      name, description, price_per_kg, discount, category, stock_quantity, is_active, pricing_type,
      search_keywords, weight_display_unit, weight_price_overrides,
    } = req.body;

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
    if (req.files && req.files.length > 0) imageUrl = toPublicUploadPath(req.files[0]) || imageUrl;

    const validPricingType = ['per_kg', 'per_piece'].includes(pricing_type) ? pricing_type : 'per_kg';
    const wduRaw = String(weight_display_unit || 'kg').toLowerCase();
    const weightDisplayUnit = validPricingType === 'per_piece'
      ? 'kg'
      : (wduRaw === 'g' ? 'g' : 'kg');

    // Create product
    const newProduct = await pool.query(`
      INSERT INTO products (
        name, description, category, image_url, price_per_kg, discount,
        quantity_available, is_active, pricing_type, search_keywords, weight_display_unit, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *
    `, [
      name, description || '', category || 'Uncategorized', imageUrl,
      parseFloat(price_per_kg) || 0, parseFloat(discount) || 0,
      parseFloat(stock_quantity) || 0,
      is_active !== 'false' && is_active !== false,
      validPricingType,
      (search_keywords && String(search_keywords).trim()) || null,
      weightDisplayUnit,
    ]);

    const product = newProduct.rows[0];
    let parsedOverrides;
    try {
      parsedOverrides = parseAndNormalizeWeightOverrides(weight_price_overrides);
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }
    for (const [weightKey, overridePrice] of Object.entries(parsedOverrides)) {
      const weightVal = parseFloat(weightKey);
      await pool.query(
        `INSERT INTO product_weight_prices (product_id, weight_option, price_override)
         VALUES ($1, $2, $3)
         ON CONFLICT (product_id, weight_option) DO UPDATE
         SET price_override = EXCLUDED.price_override, updated_at = CURRENT_TIMESTAMP`,
        [product.id, weightVal, overridePrice],
      );
    }

    // Promo notifications: discounted and fresh item alerts
    Promise.allSettled([
      parseFloat(product.discount || 0) > 0
        ? webPushService.sendToAllSubscribers({
          type: 'promo_discount',
          title: 'Discounted item added',
          body: `${product.name} is now available with ${parseFloat(product.discount).toFixed(0)}% off.`,
          url: '/',
        })
        : Promise.resolve(),
      webPushService.sendToAllSubscribers({
        type: 'promo_fresh',
        title: 'Fresh item added',
        body: `${product.name} was just added and is fresh in the last 24 hours.`,
        url: '/',
      }),
    ]).catch(() => undefined);

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
    const existingProduct = await pool.query('SELECT id, discount, name FROM products WHERE id = $1', [id]);
    if (existingProduct.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const previousDiscount = parseFloat(existingProduct.rows[0].discount || 0);

    // Handle new image if uploaded
    if (req.files && req.files.length > 0) updateData.image_url = toPublicUploadPath(req.files[0]);

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

    const weightPriceOverridesRaw = updateData.weight_price_overrides;
    delete updateData.weight_price_overrides;
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
    const updated = updatedProduct.rows[0];
    if (weightPriceOverridesRaw !== undefined) {
      let parsed;
      try {
        parsed = parseAndNormalizeWeightOverrides(weightPriceOverridesRaw);
      } catch (e) {
        return res.status(400).json({ message: e.message });
      }
      await pool.query('DELETE FROM product_weight_prices WHERE product_id = $1', [id]);
      for (const [weightKey, overridePrice] of Object.entries(parsed)) {
        const weightVal = parseFloat(weightKey);
        await pool.query(
          `INSERT INTO product_weight_prices (product_id, weight_option, price_override)
           VALUES ($1, $2, $3)`,
          [id, weightVal, overridePrice],
        );
      }
    }
    const nextDiscount = parseFloat(updated.discount || 0);

    // Promo notification only when discount transitions to > 0
    if (previousDiscount <= 0 && nextDiscount > 0) {
      Promise.resolve(
        webPushService.sendToAllSubscribers({
          type: 'promo_discount',
          title: 'New discounted deal',
          body: `${updated.name || existingProduct.rows[0].name || 'A product'} is now on discount (${nextDiscount.toFixed(0)}% off).`,
          url: '/',
        }),
      ).catch(() => undefined);
    }

    res.json({
      success: true,
      data: { product: updated },
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
    const { status, search } = req.query;
    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let query = `
      SELECT 
        o.*,
        COALESCE(u.name, 'Walk-in Customer') AS name,
        COALESCE(o.phone, u.phone) AS phone,
        COUNT(oi.id) as item_count,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', oi.id,
              'product_name', oi.product_name,
              'quantity_kg', oi.quantity_kg,
              'price_per_kg', oi.price_per_kg,
              'total_price', oi.total_price,
              'pricing_type', oi.pricing_type,
              'weight_display_unit', COALESCE(oi.weight_display_unit, 'kg')
            )
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '[]'::json
        ) as items
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
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
    queryParams.push(limitNum, offset);

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

    const total = parseInt(totalCount.rows[0].total, 10);
    res.json({
      orders: orders.rows,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum) || 0,
        totalItems: total,
        itemsPerPage: limitNum,
      },
    });

  } catch (error) {
    console.error('Get admin orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/orders
// @desc    Create order as admin
// @access  Admin
router.post('/orders', async (req, res) => {
  try {
    const { user_id, customer_name, phone, items, delivery_address, notes, payment_method = 'cod' } = req.body || {};
    const normalizedPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    if (!/^\d{10}$/.test(normalizedPhone)) return res.status(400).json({ message: 'Valid 10-digit phone is required' });
    if (!delivery_address || !String(delivery_address).trim()) return res.status(400).json({ message: 'Delivery address is required' });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Order items are required' });

    const uniqueProductIds = [...new Set(items.map(item => item.product_id).filter(Boolean))];
    if (uniqueProductIds.length !== items.length) return res.status(400).json({ message: 'Duplicate/invalid product IDs in order' });

    const productsResult = await pool.query(
      `SELECT id, name, price_per_kg, discount, pricing_type, is_active, COALESCE(weight_display_unit, 'kg') AS weight_display_unit
       FROM products WHERE id = ANY($1::uuid[])`,
      [uniqueProductIds],
    );
    const productsById = new Map(productsResult.rows.map(p => [p.id, p]));

    const productWeightRows = await pool.query(
      'SELECT product_id, weight_option, price_override FROM product_weight_prices WHERE product_id = ANY($1::uuid[])',
      [uniqueProductIds],
    );
    const overrideMap = new Map();
    for (const row of productWeightRows.rows) {
      const key = `${row.product_id}:${Number(row.weight_option).toFixed(2)}`;
      overrideMap.set(key, parseFloat(row.price_override));
    }

    let subtotal = 0;
    const normalizedItems = [];
    for (const item of items) {
      const p = productsById.get(item.product_id);
      const qty = parseFloat(item.quantity_kg || 0);
      if (!p || !p.is_active || !Number.isFinite(qty) || qty <= 0) return res.status(400).json({ message: 'Invalid items in order' });
      const overrideKey = `${p.id}:${qty.toFixed(2)}`;
      const overridePrice = overrideMap.get(overrideKey);
      const basePrice = parseFloat(p.price_per_kg || 0);
      const itemBase = Number.isFinite(overridePrice) ? overridePrice : (basePrice * qty);
      const itemTotal = itemBase * (1 - (parseFloat(p.discount || 0) / 100));
      subtotal += itemTotal;
      normalizedItems.push({ product: p, quantityKg: qty, itemBase, itemTotal });
    }
    subtotal = parseFloat(subtotal.toFixed(2));

    const settings = await getStoreOrderSettings();
    if (settings.min_order_amount > 0 && subtotal < settings.min_order_amount) {
      return res.status(400).json({ message: `Minimum order amount is ₹${settings.min_order_amount}` });
    }
    const deliveryFee = subtotal >= settings.free_delivery_threshold ? 0 : settings.delivery_fee;
    const totalPrice = parseFloat((subtotal + deliveryFee).toFixed(2));
    const orderNumber = `ADM-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const client = await pool.pool.connect();
    try {
      await client.query('BEGIN');
      const orderResult = await client.query(
        `INSERT INTO orders (order_number, user_id, phone, delivery_address, notes, subtotal, delivery_fee, total_price, payment_method, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [orderNumber, user_id || null, normalizedPhone, String(delivery_address).trim(), notes ? String(notes).trim() : null, subtotal, deliveryFee, totalPrice, payment_method, 'confirmed'],
      );
      const order = orderResult.rows[0];
      for (const line of normalizedItems) {
        const pricingType = line.product.pricing_type || 'per_kg';
        const unit = pricingType === 'per_piece' ? 'kg' : (line.product.weight_display_unit === 'g' ? 'g' : 'kg');
        const linePricePerKg = parseFloat((line.itemBase / line.quantityKg).toFixed(2));
        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, quantity_kg, price_per_kg, total_price, pricing_type, weight_display_unit)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [order.id, line.product.id, line.product.name || customer_name || 'Item', line.quantityKg, linePricePerKg, parseFloat(line.itemTotal.toFixed(2)), pricingType, unit],
        );
        const stockUpdate = await client.query(
          'UPDATE products SET quantity_available = quantity_available - $1 WHERE id = $2 AND quantity_available >= $1',
          [line.quantityKg, line.product.id],
        );
        if (stockUpdate.rowCount !== 1) throw new Error(`Insufficient stock for ${line.product.name}`);
      }
      await client.query('COMMIT');
      res.status(201).json({ success: true, data: { order } });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create admin order error:', error);
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
    const existingOrder = await pool.query('SELECT id, notes, user_id, order_number FROM orders WHERE id = $1', [id]);
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

    // Notify customer and admins about status updates
    const orderRow = existingOrder.rows[0];
    const statusLabelMap = {
      pending: 'Pending',
      confirmed: 'Accepted',
      delivered: 'Delivered',
      cancelled: 'Rejected',
    };
    const label = statusLabelMap[status] || status;

    Promise.allSettled([
      webPushService.sendToUser(orderRow.user_id, {
        type: 'order_status',
        title: `Order ${label}`,
        body: `Your order #${orderRow.order_number || id} is now ${label}.`,
        orderId: id,
        url: `/orders/${id}`,
      }),
      webPushService.sendToAdmins({
        type: 'order_status_admin',
        title: 'Order status updated',
        body: `Order #${orderRow.order_number || id} marked as ${label}.`,
        orderId: id,
        url: '/admin/orders',
      }),
    ]).catch(() => undefined);

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
    const { search, role, sortOrder = 'DESC' } = req.query;
    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;
    const normalizedSortOrder = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

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

    query += ` ORDER BY created_at ${normalizedSortOrder} LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limitNum, offset);

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

    const total = parseInt(totalCount.rows[0].total, 10);
    res.json({
      users: users.rows,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum) || 0,
        totalItems: total,
        itemsPerPage: limitNum,
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
  body('quantity').isFloat({ min: 0 }).withMessage('Quantity must be a non-negative number'),
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
    const normalizedPeriod = ['24h', '7d', '30d', '90d', '1y'].includes(period) ? period : '30d';

    // Calculate date range based on period
    let dateFilter = '';
    let groupBy = '';

    switch (normalizedPeriod) {
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
    const dailyKpis = await pool.query(`
      SELECT
        COALESCE(SUM(total_price), 0) AS daily_revenue,
        COUNT(*) AS daily_orders
      FROM orders
      WHERE status != 'cancelled'
        AND DATE(created_at AT TIME ZONE 'Asia/Kolkata') = DATE(NOW() AT TIME ZONE 'Asia/Kolkata')
    `);

    res.json({
      period: normalizedPeriod,
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
        dailyRevenue: parseFloat(dailyKpis.rows[0].daily_revenue || 0),
        dailyOrders: parseInt(dailyKpis.rows[0].daily_orders || 0, 10),
      },
      dailyRevenue: parseFloat(dailyKpis.rows[0].daily_revenue || 0),
      dailyOrders: parseInt(dailyKpis.rows[0].daily_orders || 0, 10),
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

// ── Category Management (product category names) ─────────────────────────
const PRODUCT_CATEGORIES_KEY = 'product_categories';
const DEFAULT_PRODUCT_CATEGORIES = [
  'Vegetables',
  'Fruits',
  'Dairy',
  'Bakery',
  'Grains',
  'Herbs & Spices',
  'Other',
];

async function getProductCategories() {
  const result = await pool.query('SELECT value FROM store_settings WHERE key = $1', [PRODUCT_CATEGORIES_KEY]);
  if (result.rows.length === 0) return DEFAULT_PRODUCT_CATEGORIES;

  try {
    const parsed = JSON.parse(result.rows[0].value);
    if (Array.isArray(parsed) && parsed.every(v => typeof v === 'string' && v.trim())) return parsed;
  } catch (_) {
    // ignore parse error and fall back to defaults
  }

  return DEFAULT_PRODUCT_CATEGORIES;
}

async function setProductCategories(categories) {
  const jsonValue = JSON.stringify(categories);
  await pool.query(
    'INSERT INTO store_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP',
    [PRODUCT_CATEGORIES_KEY, jsonValue],
  );
}

// @route   GET /api/admin/categories
// @desc    Get all product categories
// @access  Admin
router.get('/categories', async (req, res) => {
  try {
    const categories = await getProductCategories();
    res.json({ success: true, data: { categories } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load categories' });
  }
});

// @route   POST /api/admin/categories
// @desc    Add a product category
// @access  Admin
router.post(
  '/categories',
  [body('name').notEmpty().trim().withMessage('Category name is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { name } = req.body;
      const trimmed = String(name).trim();
      const categories = await getProductCategories();

      const exists = categories.some(c => c.toLowerCase() === trimmed.toLowerCase());
      if (exists) {
        return res.status(400).json({ success: false, message: 'Category already exists' });
      }

      categories.push(trimmed);
      await setProductCategories(categories);

      res.json({ success: true, data: { categories } });
    } catch (error) {
      console.error('Add category error:', error);
      res.status(500).json({ success: false, message: 'Failed to add category' });
    }
  },
);

// @route   PUT /api/admin/categories
// @desc    Rename a product category
// @access  Admin
router.put(
  '/categories',
  [
    body('oldName').notEmpty().trim().withMessage('oldName is required'),
    body('newName').notEmpty().trim().withMessage('newName is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { oldName, newName } = req.body;
      const from = String(oldName).trim();
      const to = String(newName).trim();

      const categories = await getProductCategories();
      const fromIdx = categories.findIndex(c => c.toLowerCase() === from.toLowerCase());
      if (fromIdx === -1) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      const toExists = categories.some(c => c.toLowerCase() === to.toLowerCase());
      if (toExists) {
        return res.status(400).json({ success: false, message: 'Target category already exists' });
      }

      categories[fromIdx] = to;
      await setProductCategories(categories);
      res.json({ success: true, data: { categories } });
    } catch (error) {
      console.error('Rename category error:', error);
      res.status(500).json({ success: false, message: 'Failed to rename category' });
    }
  },
);

// @route   DELETE /api/admin/categories/:name
// @desc    Delete a product category
// @access  Admin
router.delete('/categories/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const trimmed = String(name).trim();

    const categories = await getProductCategories();
    const filtered = categories.filter(c => c.toLowerCase() !== trimmed.toLowerCase());

    if (filtered.length === categories.length) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    await setProductCategories(filtered);
    res.json({ success: true, data: { categories: filtered } });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete category' });
  }
});

// --- Marketing banners (storefront carousel) ---

// @route   GET /api/admin/marketing-banners
router.get('/marketing-banners', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, subtitle, image_url, link_url, sort_order, is_active, created_at, updated_at
       FROM marketing_banners
       ORDER BY sort_order ASC, created_at DESC`,
    );
    res.json({ success: true, data: { banners: result.rows } });
  } catch (error) {
    console.error('Admin list marketing banners:', error);
    res.status(500).json({ success: false, message: 'Failed to load banners' });
  }
});

// @route   PUT /api/admin/marketing-banners/reorder
router.put(
  '/marketing-banners/reorder',
  [body('items').isArray({ min: 1 }).withMessage('items array required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      const { items } = req.body;
      const client = await pool.pool.connect();
      try {
        await client.query('BEGIN');
        for (let i = 0; i < items.length; i += 1) {
          const row = items[i];
          const id = row?.id;
          const sortOrder = parseInt(row?.sort_order, 10);
          if (!id || !Number.isFinite(sortOrder)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Each item needs id and sort_order' });
          }
          await client.query(
            'UPDATE marketing_banners SET sort_order = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [sortOrder, id],
          );
        }
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
      const result = await pool.query(
        `SELECT id, title, subtitle, image_url, link_url, sort_order, is_active, created_at, updated_at
         FROM marketing_banners ORDER BY sort_order ASC, created_at DESC`,
      );
      res.json({ success: true, data: { banners: result.rows } });
    } catch (error) {
      console.error('Reorder marketing banners:', error);
      res.status(500).json({ success: false, message: 'Failed to reorder banners' });
    }
  },
);

// @route   POST /api/admin/marketing-banners
router.post('/marketing-banners', optionalSingleImageUpload, handleUploadError, async (req, res) => {
  try {
    const { title, subtitle, link_url, sort_order, is_active, image_url } = req.body;
    let finalImage = String(image_url || '').trim();
    if (req.file) finalImage = toPublicUploadPath(req.file) || finalImage;
    if (!finalImage) {
      return res.status(400).json({ success: false, message: 'Provide an image file or image URL' });
    }
    const sort = parseInt(sort_order, 10);
    const sortVal = Number.isFinite(sort) ? sort : 0;
    const active = !['false', '0', ''].includes(String(is_active ?? 'true').toLowerCase());

    const result = await pool.query(
      `INSERT INTO marketing_banners (title, subtitle, image_url, link_url, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        String(title || '').trim().slice(0, 200),
        String(subtitle || '').trim().slice(0, 500),
        finalImage,
        String(link_url || '').trim().slice(0, 2000),
        sortVal,
        active,
      ],
    );
    res.status(201).json({ success: true, data: { banner: result.rows[0] } });
  } catch (error) {
    console.error('Create marketing banner:', error);
    res.status(500).json({ success: false, message: 'Failed to create banner' });
  }
});

// @route   PUT /api/admin/marketing-banners/:id
router.put(
  '/marketing-banners/:id',
  optionalSingleImageUpload,
  handleUploadError,
  async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await pool.query('SELECT * FROM marketing_banners WHERE id = $1', [id]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Banner not found' });
      }
      const prev = existing.rows[0];

      const { title, subtitle, link_url, sort_order, is_active, image_url } = req.body;
      let nextImage = prev.image_url;
      if (req.file) {
        nextImage = toPublicUploadPath(req.file) || nextImage;
      } else if (image_url !== undefined && image_url !== null) {
        const trimmed = String(image_url).trim();
        if (trimmed) nextImage = trimmed.slice(0, 2000);
      }

      const sort = parseInt(sort_order, 10);
      const sortVal = Number.isFinite(sort) ? sort : prev.sort_order;
      const active = is_active !== undefined
        ? !['false', '0'].includes(String(is_active).toLowerCase())
        : prev.is_active;

      const result = await pool.query(
        `UPDATE marketing_banners
         SET title = $1, subtitle = $2, image_url = $3, link_url = $4, sort_order = $5, is_active = $6,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $7
         RETURNING *`,
        [
          title !== undefined ? String(title).trim().slice(0, 200) : prev.title,
          subtitle !== undefined ? String(subtitle).trim().slice(0, 500) : prev.subtitle,
          nextImage,
          link_url !== undefined ? String(link_url).trim().slice(0, 2000) : prev.link_url,
          sortVal,
          active,
          id,
        ],
      );
      res.json({ success: true, data: { banner: result.rows[0] } });
    } catch (error) {
      console.error('Update marketing banner:', error);
      res.status(500).json({ success: false, message: 'Failed to update banner' });
    }
  },
);

// @route   DELETE /api/admin/marketing-banners/:id
router.delete('/marketing-banners/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const del = await pool.query('DELETE FROM marketing_banners WHERE id = $1 RETURNING id', [id]);
    if (del.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Delete marketing banner:', error);
    res.status(500).json({ success: false, message: 'Failed to delete banner' });
  }
});

module.exports = router;
