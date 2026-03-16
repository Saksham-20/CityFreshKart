const express = require('express');
const { query } = require('../database/config');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validateUUID } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/cart
// @desc    Get user's cart
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Get or create cart for user
    const cartResult = await query(
      'SELECT id FROM cart WHERE user_id = $1',
      [req.user.id],
    );

    let cartId;
    if (cartResult.rows.length === 0) {
      // Create new cart
      const newCartResult = await query(
        'INSERT INTO cart (user_id) VALUES ($1) RETURNING id',
        [req.user.id],
      );
      cartId = newCartResult.rows[0].id;
    } else {
      cartId = cartResult.rows[0].id;
    }

    // Get cart items with product details
    const itemsResult = await query(`
      SELECT 
        ci.id,
        ci.quantity,
        ci.weight,
        ci.variant_details,
        ci.created_at,
        p.id as product_id,
        p.name,
        p.slug,
        p.price,
        p.price_per_kg,
        p.compare_price,
        p.stock_quantity,
        p.sku,
        c.name as category_name,
        c.slug as category_slug,
        (
          SELECT pi.image_url
          FROM product_images pi
          WHERE pi.product_id = p.id AND pi.is_primary = true
          LIMIT 1
        ) as primary_image
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ci.cart_id = $1 AND p.is_active = true
      ORDER BY ci.created_at DESC
    `, [cartId]);

    // Calculate totals with weight support
    let subtotal = 0;
    let itemCount = 0;
    const items = itemsResult.rows.map(item => {
      // For weight-based products: price_per_kg * weight * quantity
      // For regular products: price * quantity
      const unitPrice = item.price_per_kg ? (item.price_per_kg * (item.weight || 1)) : item.price;
      const itemTotal = unitPrice * item.quantity;
      subtotal += itemTotal;
      itemCount += item.quantity;

      return {
        ...item,
        unit_price: unitPrice,
        item_total: parseFloat(itemTotal.toFixed(2)),
      };
    });

    // FREE delivery above ₹300, else ₹40
    const deliveryFee = subtotal >= 300 ? 0 : 40;
    const estimatedTotal = subtotal + deliveryFee;

    // Cart items processed successfully

    res.json({
      success: true,
      data: {
        cart_id: cartId,
        items,
        summary: {
          item_count: itemCount,
          subtotal: parseFloat(subtotal.toFixed(2)),
          delivery_fee: deliveryFee,
          estimated_tax: parseFloat((subtotal * 0.08).toFixed(2)), // 8% tax
          estimated_total: parseFloat((estimatedTotal * 1.08).toFixed(2)),
        },
      },
    });

  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   POST /api/cart/add
// @desc    Add item to cart
// @access  Private
router.post('/add', authenticateToken, async (req, res) => {
  try {
    console.log('🛒 POST /api/cart/add - Request received');
    console.log('🛒 Request body:', req.body);
    console.log('🛒 User ID:', req.user.id);

    const { product_id, quantity = 1, variant_details, weight } = req.body;

    // Adding item to cart
    console.log('🛒 Product ID:', product_id);
    console.log('🛒 Quantity:', quantity);
    console.log('🛒 Weight:', weight);
    console.log('🛒 Variant details:', variant_details);

    if (!product_id) {
      console.log('🛒 ERROR: Product ID is missing');
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
      });
    }

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1',
      });
    }

    // Check if product exists and is active
    console.log('🛒 Checking if product exists:', product_id);
    const productResult = await query(
      'SELECT id, name, price, price_per_kg, stock_quantity FROM products WHERE id = $1 AND is_active = true',
      [product_id],
    );

    console.log('🛒 Product query result:', productResult.rows);

    if (productResult.rows.length === 0) {
      console.log('🛒 ERROR: Product not found');
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const product = productResult.rows[0];

    // Validate weight for weight-based products
    if (product.price_per_kg && (!weight || weight <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Weight is required for weight-based products and must be greater than 0',
      });
    }

    // Check stock availability
    if (product.stock_quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock_quantity} items available in stock`,
      });
    }

    // Get or create cart for user
    const cartResult = await query(
      'SELECT id FROM cart WHERE user_id = $1',
      [req.user.id],
    );

    let cartId;
    if (cartResult.rows.length === 0) {
      const newCartResult = await query(
        'INSERT INTO cart (user_id) VALUES ($1) RETURNING id',
        [req.user.id],
      );
      cartId = newCartResult.rows[0].id;
    } else {
      cartId = cartResult.rows[0].id;
    }

    // Check if item already exists in cart
    const existingItemResult = await query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2',
      [cartId, product_id],
    );

    if (existingItemResult.rows.length > 0) {
      // Update existing item quantity and weight
      const newQuantity = existingItemResult.rows[0].quantity + quantity;

      if (newQuantity > product.stock_quantity) {
        return res.status(400).json({
          success: false,
          message: `Cannot add ${quantity} more items. Only ${product.stock_quantity - existingItemResult.rows[0].quantity} additional items available.`,
        });
      }

      await query(
        'UPDATE cart_items SET quantity = $1, weight = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [newQuantity, weight || null, existingItemResult.rows[0].id],
      );

      res.json({
        success: true,
        message: 'Cart item quantity updated',
        data: {
          cart_item_id: existingItemResult.rows[0].id,
          new_quantity: newQuantity,
        },
      });
    } else {
      // Add new item to cart
      const newItemResult = await query(`
        INSERT INTO cart_items (cart_id, product_id, quantity, weight, variant_details)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [cartId, product_id, quantity, weight || null, variant_details || null]);

      res.status(201).json({
        success: true,
        message: 'Item added to cart',
        data: {
          cart_item_id: newItemResult.rows[0].id,
          product_name: product.name,
          quantity,
          price: product.price,
        },
      });
    }

  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   PUT /api/cart/:item_id
// @desc    Update cart item quantity
// @access  Private
router.put('/:item_id', authenticateToken, async (req, res) => {
  try {
    const { item_id } = req.params;
    const { quantity, weight } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Valid quantity is required',
      });
    }

    // Get cart item with product details
    const itemResult = await query(`
      SELECT 
        ci.id,
        ci.quantity as current_quantity,
        ci.weight as current_weight,
        p.id as product_id,
        p.name,
        p.price,
        p.price_per_kg,
        p.stock_quantity
      FROM cart_items ci
      JOIN cart c ON ci.cart_id = c.id
      JOIN products p ON ci.product_id = p.id
      WHERE ci.id = $1 AND c.user_id = $2 AND p.is_active = true
    `, [item_id, req.user.id]);

    if (itemResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart item not found',
      });
    }

    const item = itemResult.rows[0];

    // Validate weight for weight-based products
    if (item.price_per_kg && weight !== undefined && (!weight || weight <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Weight is required for weight-based products and must be greater than 0',
      });
    }

    // Check stock availability
    if (quantity > item.stock_quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${item.stock_quantity} items available in stock`,
      });
    }

    // Update quantity and weight
    await query(
      'UPDATE cart_items SET quantity = $1, weight = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [quantity, weight || item.current_weight || null, item_id],
    );

    // Calculate item total with weight if applicable
    const unitPrice = item.price_per_kg ? (item.price_per_kg * (weight || item.current_weight || 1)) : item.price;
    const itemTotal = unitPrice * quantity;

    res.json({
      success: true,
      message: 'Cart item updated',
      data: {
        cart_item_id: item_id,
        new_quantity: quantity,
        weight: weight || item.current_weight || null,
        unit_price: parseFloat(unitPrice.toFixed(2)),
        item_total: parseFloat(itemTotal.toFixed(2)),
      },
    });

  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   DELETE /api/cart/:item_id
// @desc    Remove item from cart
// @access  Private
router.delete('/:item_id', authenticateToken, async (req, res) => {
  try {
    const { item_id } = req.params;
    // Removing item from cart

    // Delete cart item (ensure it belongs to the user)
    const result = await query(`
      DELETE FROM cart_items 
      WHERE id = $1 AND cart_id IN (
        SELECT id FROM cart WHERE user_id = $2
      )
      RETURNING id
    `, [item_id, req.user.id]);

    // Item removed successfully

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found',
      });
    }

    res.json({
      success: true,
      message: 'Item removed from cart',
    });

  } catch (error) {
    console.error('Remove cart item error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   DELETE /api/cart
// @desc    Clear entire cart
// @access  Private
router.delete('/', authenticateToken, async (req, res) => {
  try {
    // Clear all items from user's cart
    await query(`
      DELETE FROM cart_items 
      WHERE cart_id IN (
        SELECT id FROM cart WHERE user_id = $1
      )
    `, [req.user.id]);

    res.json({
      success: true,
      message: 'Cart cleared successfully',
    });

  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   GET /api/cart/count
// @desc    Get cart item count
// @access  Private
router.get('/count', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT COALESCE(SUM(ci.quantity), 0) as item_count
      FROM cart_items ci
      JOIN cart c ON ci.cart_id = c.id
      JOIN products p ON ci.product_id = p.id
      WHERE c.user_id = $1 AND p.is_active = true
    `, [req.user.id]);

    const itemCount = parseInt(result.rows[0].item_count);

    res.json({
      success: true,
      data: {
        item_count: itemCount,
      },
    });

  } catch (error) {
    console.error('Get cart count error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   POST /api/cart/merge
// @desc    Merge guest cart with user cart after login
// @access  Private
router.post('/merge', authenticateToken, async (req, res) => {
  try {
    const { guest_items } = req.body;

    if (!guest_items || !Array.isArray(guest_items)) {
      return res.status(400).json({
        success: false,
        message: 'Guest items array is required',
      });
    }

    // Get or create cart for user
    const cartResult = await query(
      'SELECT id FROM cart WHERE user_id = $1',
      [req.user.id],
    );

    let cartId;
    if (cartResult.rows.length === 0) {
      const newCartResult = await query(
        'INSERT INTO cart (user_id) VALUES ($1) RETURNING id',
        [req.user.id],
      );
      cartId = newCartResult.rows[0].id;
    } else {
      cartId = cartResult.rows[0].id;
    }

    let mergedCount = 0;
    let skippedCount = 0;

    for (const guestItem of guest_items) {
      const { product_id, quantity, variant_details } = guestItem;

      // Check if product exists and is active
      const productResult = await query(
        'SELECT id, stock_quantity FROM products WHERE id = $1 AND is_active = true',
        [product_id],
      );

      if (productResult.rows.length === 0) {
        skippedCount++;
        continue;
      }

      const product = productResult.rows[0];

      // Check if item already exists in cart
      const existingItemResult = await query(
        'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2',
        [cartId, product_id],
      );

      if (existingItemResult.rows.length > 0) {
        // Update existing item quantity
        const newQuantity = Math.min(
          existingItemResult.rows[0].quantity + quantity,
          product.stock_quantity,
        );

        await query(
          'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [newQuantity, existingItemResult.rows[0].id],
        );
      } else {
        // Add new item to cart
        const addQuantity = Math.min(quantity, product.stock_quantity);

        await query(`
          INSERT INTO cart_items (cart_id, product_id, quantity, variant_details)
          VALUES ($1, $2, $3, $4)
        `, [cartId, product_id, addQuantity, variant_details || null]);
      }

      mergedCount++;
    }

    res.json({
      success: true,
      message: 'Guest cart merged successfully',
      data: {
        merged_items: mergedCount,
        skipped_items: skippedCount,
      },
    });

  } catch (error) {
    console.error('Merge cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

module.exports = router;
