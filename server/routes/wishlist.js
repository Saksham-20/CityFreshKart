const express = require('express');
const { query } = require('../database/config');
const { authenticateToken } = require('../middleware/auth');
const { validateUUID } = require('../middleware/validation');

const router = express.Router();

// Helper: get or create wishlist for user
async function getOrCreateWishlist(userId) {
  const result = await query('SELECT id FROM wishlists WHERE "userId" = $1', [userId]);
  if (result.rows.length > 0) return result.rows[0].id;
  const newResult = await query('INSERT INTO wishlists ("userId") VALUES ($1) RETURNING id', [userId]);
  return newResult.rows[0].id;
}

// @route   GET /api/wishlist
// @desc    Get user's wishlist
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('Wishlist GET - User ID:', req.user.id);
    const result = await query(`
      SELECT 
        wi.id,
        wi."createdAt",
        p.id as product_id,
        p.name,
        p.slug,
        p.price,
        p.compare_price,
        p.sku,
        c.name as category_name,
        c.slug as category_slug,
        (
          SELECT pi.image_url
          FROM product_images pi
          WHERE pi."productId" = p.id AND pi.is_primary = true
          LIMIT 1
        ) as primary_image
      FROM wishlists w
      JOIN wishlist_items wi ON w.id = wi."wishlistId"
      JOIN products p ON wi."productId" = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE w."userId" = $1 AND p.is_active = true
      ORDER BY wi."createdAt" DESC
    `, [req.user.id]);

    res.json({
      success: true,
      data: {
        items: result.rows,
      },
    });

  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   POST /api/wishlist
// @desc    Add item to wishlist
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
      });
    }

    // Check if product exists and is active
    const productResult = await query(
      'SELECT id, name FROM products WHERE id = $1 AND is_active = true',
      [product_id],
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const wishlistId = await getOrCreateWishlist(req.user.id);

    // Check if item already exists in wishlist
    const existingItem = await query(
      'SELECT id FROM wishlist_items WHERE "wishlistId" = $1 AND "productId" = $2',
      [wishlistId, product_id],
    );

    if (existingItem.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist',
      });
    }

    // Add to wishlist_items
    const result = await query(
      'INSERT INTO wishlist_items ("wishlistId", "productId") VALUES ($1, $2) RETURNING id',
      [wishlistId, product_id],
    );

    res.status(201).json({
      success: true,
      message: 'Item added to wishlist',
      data: {
        wishlist_item_id: result.rows[0].id,
        product_name: productResult.rows[0].name,
      },
    });

  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   DELETE /api/wishlist/:id
// @desc    Remove item from wishlist (by wishlist_item id or product id)
// @access  Private
router.delete('/:id', authenticateToken, validateUUID, async (req, res) => {
  try {
    const { id } = req.params;

    // Get user's wishlist
    const wishlistResult = await query('SELECT id FROM wishlists WHERE "userId" = $1', [req.user.id]);
    if (wishlistResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Wishlist item not found' });
    }
    const wishlistId = wishlistResult.rows[0].id;

    // Try to delete by wishlist item ID
    let result = await query(
      'DELETE FROM wishlist_items WHERE id = $1 AND "wishlistId" = $2 RETURNING id',
      [id, wishlistId],
    );

    // If no rows affected, try to delete by product ID
    if (result.rows.length === 0) {
      result = await query(
        'DELETE FROM wishlist_items WHERE "productId" = $1 AND "wishlistId" = $2 RETURNING id',
        [id, wishlistId],
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist item not found',
      });
    }

    res.json({
      success: true,
      message: 'Item removed from wishlist',
    });

  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// @route   DELETE /api/wishlist
// @desc    Clear entire wishlist
// @access  Private
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const wishlistResult = await query('SELECT id FROM wishlists WHERE "userId" = $1', [req.user.id]);
    if (wishlistResult.rows.length > 0) {
      await query('DELETE FROM wishlist_items WHERE "wishlistId" = $1', [wishlistResult.rows[0].id]);
    }

    res.json({
      success: true,
      message: 'Wishlist cleared successfully',
    });

  } catch (error) {
    console.error('Clear wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

module.exports = router;

