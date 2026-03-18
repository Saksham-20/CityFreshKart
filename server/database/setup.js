const fs = require('fs');
const path = require('path');
const { pool } = require('./config');
require('dotenv').config();

async function setupDatabase() {
  console.log('🚀 Starting database setup...');

  // Debug environment variables
  console.log('🔍 Environment variables:');
  console.log('DB_USER:', process.env.DB_USER);
  console.log('DB_HOST:', process.env.DB_HOST);
  console.log('DB_NAME:', process.env.DB_NAME);
  console.log('DB_PORT:', process.env.DB_PORT);
  console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '***SET***' : 'NOT SET');
  console.log('NODE_ENV:', process.env.NODE_ENV);

  // Use the shared pool from config.js
  console.log('📡 Using shared database pool for connection');

  try {
    // Test the pool connection
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ Connected to PostgreSQL via shared pool');

    // Apply schema (CREATE TABLE IF NOT EXISTS — safe to run on every boot)
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    try {
      console.log('🔄 Ensuring database tables exist...');
      await pool.query(schema);
      console.log('✅ Database schema ready');
    } catch (error) {
      console.error('❌ Schema creation failed:', error.message);
      throw error;
    }

    // Create users
    const bcrypt = require('bcryptjs');
    
    // Admin user
    const adminPhone = process.env.ADMIN_PHONE || '9999999999';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminHashedPassword = await bcrypt.hash(adminPassword, 10);
    
    // Test user (for Playwright tests)
    const testPhone = '9876543210';
    const testPassword = 'password123';
    const testHashedPassword = await bcrypt.hash(testPassword, 10);

    try {
      // Create admin (skip if already exists)
      const adminInsert = await pool.query(
        `INSERT INTO users (phone, password_hash, name, is_admin, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (phone) DO NOTHING`,
        [adminPhone, adminHashedPassword, 'Admin User', true],
      );
      if (adminInsert.rowCount > 0) {
        console.log('✅ Admin user created (Phone: ' + adminPhone + ' / Password: admin123)');
      } else {
        console.log('ℹ️  Admin user already exists, skipping');
      }

      // Create test user (skip if already exists)
      const testInsert = await pool.query(
        `INSERT INTO users (phone, password_hash, name, is_admin, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (phone) DO NOTHING`,
        [testPhone, testHashedPassword, 'Test User', false],
      );
      if (testInsert.rowCount > 0) {
        console.log('✅ Test user created (Phone: ' + testPhone + ' / Password: password123)');
      } else {
        console.log('ℹ️  Test user already exists, skipping');
      }
    } catch (error) {
      console.error('❌ User creation failed:', error.message);
      throw error;
    }

    // Upsert sample products: update image_url/category for existing ones, insert new ones
    try {
      const sampleProducts = [
        // Vegetables
        { name: 'Tomatoes',    category: 'Vegetables', description: 'Fresh red tomatoes, juicy and ripe', price_per_kg: 40, discount: 0,  image_url: 'https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop' },
        { name: 'Onions',      category: 'Vegetables', description: 'Fresh golden onions, great for cooking', price_per_kg: 30, discount: 0,  image_url: 'https://images.pexels.com/photos/459335/pexels-photo-459335.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop' },
        { name: 'Potatoes',    category: 'Vegetables', description: 'Premium quality potatoes', price_per_kg: 25, discount: 5,  image_url: 'https://images.pexels.com/photos/7774212/pexels-photo-7774212.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop' },
        { name: 'Carrots',     category: 'Vegetables', description: 'Fresh orange carrots, rich in beta-carotene', price_per_kg: 50, discount: 0,  image_url: 'https://images.pexels.com/photos/54082/pexels-photo-54082.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop' },
        { name: 'Spinach',     category: 'Vegetables', description: 'Fresh spinach leaves, packed with iron', price_per_kg: 60, discount: 10, image_url: 'https://images.pexels.com/photos/943907/pexels-photo-943907.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop' },
        { name: 'Bell Peppers',category: 'Vegetables', description: 'Colorful bell peppers, sweet and crunchy', price_per_kg: 70, discount: 0,  image_url: 'https://images.pexels.com/photos/870808/pexels-photo-870808.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop' },
        { name: 'Broccoli',    category: 'Vegetables', description: 'Fresh green broccoli florets', price_per_kg: 65, discount: 0,  image_url: 'https://images.pexels.com/photos/2280620/pexels-photo-2280620.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop' },
        { name: 'Cauliflower', category: 'Vegetables', description: 'White cauliflower, tender and fresh', price_per_kg: 55, discount: 5,  image_url: 'https://images.pexels.com/photos/7456541/pexels-photo-7456541.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop' },
        { name: 'Cucumber',    category: 'Vegetables', description: 'Fresh cucumber, cool and crisp', price_per_kg: 25, discount: 0,  image_url: 'https://images.pexels.com/photos/2329440/pexels-photo-2329440.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop' },
        { name: 'Garlic',      category: 'Vegetables', description: 'Fresh garlic bulbs, full of flavour', price_per_kg: 90, discount: 0,  image_url: 'https://images.pexels.com/photos/630766/pexels-photo-630766.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop' },

        // Fruits
        { name: 'Bananas',     category: 'Fruits', description: 'Sweet ripe bananas, energy-rich', price_per_kg: 35, discount: 0,  image_url: 'https://images.pexels.com/photos/2872755/pexels-photo-2872755.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop' },
        { name: 'Apples',      category: 'Fruits', description: 'Fresh red apples, crunchy and sweet', price_per_kg: 80, discount: 5,  image_url: 'https://images.pexels.com/photos/209339/pexels-photo-209339.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop' },
        { name: 'Oranges',     category: 'Fruits', description: 'Juicy navel oranges, rich in vitamin C', price_per_kg: 50, discount: 0,  image_url: 'https://images.pexels.com/photos/616838/pexels-photo-616838.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop' },
        { name: 'Grapes',      category: 'Fruits', description: 'Sweet grapes, fresh from the vine', price_per_kg: 100, discount: 0,  image_url: 'https://images.pexels.com/photos/45209/pexels-photo-45209.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop' },
        { name: 'Mangoes',     category: 'Fruits', description: 'Alphonso mangoes, the king of fruits', price_per_kg: 120, discount: 10, image_url: 'https://images.pexels.com/photos/219998/pexels-photo-219998.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop' },
        { name: 'Papaya',      category: 'Fruits', description: 'Fresh papaya, great for digestion', price_per_kg: 45, discount: 0,  image_url: 'https://images.pexels.com/photos/5817624/pexels-photo-5817624.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop' },
      ];

      let inserted = 0;
      let updated = 0;
      for (const product of sampleProducts) {
        const existing = await pool.query(
          'SELECT id FROM products WHERE LOWER(name) = LOWER($1)',
          [product.name],
        );
        if (existing.rows.length > 0) {
          // Update image_url and category for existing products
          await pool.query(
            `UPDATE products SET image_url = $1, category = $2, updated_at = NOW()
             WHERE LOWER(name) = LOWER($3)`,
            [product.image_url, product.category, product.name],
          );
          updated++;
        } else {
          await pool.query(
            `INSERT INTO products (name, category, description, price_per_kg, discount, image_url, is_active, quantity_available, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
            [product.name, product.category, product.description, product.price_per_kg, product.discount, product.image_url, true, 100],
          );
          inserted++;
        }
      }
      console.log(`✅ Products synced — ${inserted} inserted, ${updated} updated with images & categories`);
    } catch (error) {
      console.error('❌ Sample products sync failed:', error.message);
      throw error;
    }

    console.log('');
    console.log('🎉 Database setup completed successfully!');
    console.log('');
    console.log('📋 Admin Login Credentials:');
    console.log(`Phone: ${adminPhone}`);
    console.log(`Password: ${adminPassword}`);
    console.log('');
    console.log('📋 Test User Credentials (for Playwright):');
    console.log(`Phone: ${testPhone}`);
    console.log(`Password: ${testPassword}`);
    console.log('');
    console.log('🛍️ Sample Data Available:');
    console.log('- 16 Fresh Vegetables & Fruits');
    console.log('- Weight-based pricing (₹/kg)');
    console.log('- Discounts on select items');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('✅ Database setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = setupDatabase;
