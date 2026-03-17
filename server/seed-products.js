const { query } = require('./database/config');
require('dotenv').config();

async function seedProducts() {
  console.log('🌱 Seeding products...');

  try {
    // First, create categories if they don't exist
    const categories = [
      { name: 'Vegetables', slug: 'vegetables', description: 'Fresh vegetables' },
      { name: 'Fruits', slug: 'fruits', description: 'Fresh fruits' },
      { name: 'Herbs', slug: 'herbs', description: 'Fresh herbs' },
    ];

    const categoryIds = {};
    for (const cat of categories) {
      const exists = await query('SELECT id FROM categories WHERE slug = $1', [cat.slug]);
      if (exists.rows.length === 0) {
        const result = await query(
          'INSERT INTO categories (name, slug, description) VALUES ($1, $2, $3) RETURNING id',
          [cat.name, cat.slug, cat.description]
        );
        categoryIds[cat.slug] = result.rows[0].id;
        console.log(`✅ Created category: ${cat.name}`);
      } else {
        categoryIds[cat.slug] = exists.rows[0].id;
      }
    }

    // Sample products
    const products = [
      { name: 'Tomato', slug: 'tomato', description: 'Fresh red tomatoes', price_per_kg: 50, discount: 10, category_slug: 'vegetables', image: null },
      { name: 'Onion', slug: 'onion', description: 'Fresh onions', price_per_kg: 40, discount: 5, category_slug: 'vegetables', image: null },
      { name: 'Potato', slug: 'potato', description: 'Fresh potatoes', price_per_kg: 35, discount: 8, category_slug: 'vegetables', image: null },
      { name: 'Apple', slug: 'apple', description: 'Fresh apples', price_per_kg: 80, discount: 15, category_slug: 'fruits', image: null },
      { name: 'Banana', slug: 'banana', description: 'Fresh bananas', price_per_kg: 50, discount: 10, category_slug: 'fruits', image: null },
      { name: 'Mint', slug: 'mint', description: 'Fresh mint leaves', price_per_kg: 100, discount: 0, category_slug: 'herbs', image: null },
    ];

    for (const product of products) {
      const exists = await query('SELECT id FROM products WHERE slug = $1', [product.slug]);
      if (exists.rows.length === 0) {
        await query(
          'INSERT INTO products (name, slug, description, price_per_kg, discount, category_id, is_active, is_featured, stock_quantity) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          [
            product.name,
            product.slug,
            product.description,
            product.price_per_kg,
            product.discount,
            categoryIds[product.category_slug],
            true,
            true,
            100
          ]
        );
        console.log(`✅ Created product: ${product.name}`);
      }
    }

    console.log('✅ Product seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    process.exit(1);
  }
}

seedProducts();
