const { pool } = require('./config');
require('dotenv').config();

async function addSampleProduct() {
  try {
    console.log('🔧 Adding sample product...');

    // First, ensure we have a category
    const categoryResult = await pool.query(`
      SELECT id FROM categories WHERE slug = 'rings' LIMIT 1
    `);

    let categoryId;
    if (categoryResult.rows.length === 0) {
      const newCategory = await pool.query(`
        INSERT INTO categories (name, slug, description, is_active)
        VALUES ('Rings', 'rings', 'Beautiful rings for every occasion', true)
        RETURNING id
      `);
      categoryId = newCategory.rows[0].id;
      console.log('✅ Created category: Rings');
    } else {
      categoryId = categoryResult.rows[0].id;
      console.log('✅ Using existing category: Rings');
    }

    // Check if diamond ring already exists
    const existingProduct = await pool.query(`
      SELECT id FROM products WHERE slug = 'diamond-ring' LIMIT 1
    `);

    if (existingProduct.rows.length > 0) {
      console.log('✅ Diamond ring product already exists');
      return;
    }

    // Add diamond ring product
    const productResult = await pool.query(`
      INSERT INTO products (
        name, slug, description, short_description, price, compare_price,
        sku, stock_quantity, category_id, is_active, is_featured,
        meta_title, meta_description
      ) VALUES (
        'Diamond Ring', 'diamond-ring', 
        'Exquisite diamond ring crafted with precision and elegance. This stunning piece features a brilliant-cut diamond set in premium white gold, perfect for engagements or special occasions.',
        'Premium diamond ring with brilliant-cut stone',
        2999.99, 3999.99, 'DR-001', 10, $1, true, true,
        'Fresh Tomatoes - Farm Direct',
        'Beautiful diamond ring with brilliant-cut stone. Perfect for engagements and special occasions.'
      ) RETURNING id
    `, [categoryId]);

    const productId = productResult.rows[0].id;
    console.log('✅ Created product: Diamond Ring');

    // Add a sample image from a reliable source
    await pool.query(`
      INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
      VALUES ($1, $2, $3, 0, true)
    `, [
      productId,
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      'Diamond Ring'
    ]);

    console.log('✅ Added product image');
    console.log('🎉 Sample product setup complete!');
    console.log('🔗 You can now visit: /products/diamond-ring');

  } catch (error) {
    console.error('❌ Error adding sample product:', error);
  } finally {
    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  addSampleProduct();
}

module.exports = addSampleProduct;
