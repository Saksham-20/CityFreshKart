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

    // CLEAN UP: Drop all old tables that might exist from old schema
    console.log('🧹 Cleaning up old database tables...');
    try {
      await pool.query(`
        DROP TABLE IF EXISTS product_reviews CASCADE;
        DROP TABLE IF EXISTS wishlist CASCADE;
        DROP TABLE IF EXISTS product_images CASCADE;
        DROP TABLE IF EXISTS product_variants CASCADE;
        DROP TABLE IF EXISTS categories CASCADE;
        DROP TABLE IF EXISTS order_items CASCADE;
        DROP TABLE IF EXISTS cart CASCADE;
        DROP TABLE IF EXISTS orders CASCADE;
        DROP TABLE IF EXISTS products CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
      `);
      console.log('✅ Old tables cleaned up');
    } catch (cleanError) {
      console.log('⚠️ Cleanup skipped (tables might not exist):', cleanError.message);
    }

    // Read and execute schema to create fresh tables
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    try {
      console.log('🔄 Creating fresh database tables...');
      await pool.query(schema);
      console.log('✅ Database schema created successfully');
    } catch (error) {
      console.error('❌ Schema creation failed:', error.message);
      throw error;
    }

    // Create users
    const bcrypt = require('bcryptjs');
    
    // Admin user
    const adminPhone = process.env.ADMIN_PHONE || '+919999999999';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminHashedPassword = await bcrypt.hash(adminPassword, 10);
    
    // Test user (for Playwright tests)
    const testPhone = '9876543210';
    const testPassword = 'password123';
    const testHashedPassword = await bcrypt.hash(testPassword, 10);

    try {
      // Create admin
      await pool.query(
        `INSERT INTO users (phone, password_hash, name, is_admin, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [adminPhone, adminHashedPassword, 'Admin User', true],
      );
      console.log('✅ Admin user created (Phone: ' + adminPhone + ' / Password: admin123)');

      // Create test user
      await pool.query(
        `INSERT INTO users (phone, password_hash, name, is_admin, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [testPhone, testHashedPassword, 'Test User', false],
      );
      console.log('✅ Test user created (Phone: ' + testPhone + ' / Password: password123)');
    } catch (error) {
      console.error('❌ User creation failed:', error.message);
      throw error;
    }

    // Create comprehensive sample products - Vegetables & Fruits
    try {
      const sampleProducts = [
        // Vegetables
        { name: 'Tomatoes', description: 'Fresh red tomatoes, ₹40/kg', price_per_kg: 40, discount: 0 },
        { name: 'Onions', description: 'Fresh golden onions, ₹30/kg', price_per_kg: 30, discount: 0 },
        { name: 'Potatoes', description: 'Premium quality potatoes, ₹25/kg', price_per_kg: 25, discount: 5 },
        { name: 'Carrots', description: 'Fresh orange carrots, ₹50/kg', price_per_kg: 50, discount: 0 },
        { name: 'Spinach', description: 'Fresh spinach leaves, ₹60/kg', price_per_kg: 60, discount: 10 },
        { name: 'Bell Peppers', description: 'Colorful bell peppers, ₹70/kg', price_per_kg: 70, discount: 0 },
        
        // Fruits
        { name: 'Bananas', description: 'Sweet bananas, ₹35/kg', price_per_kg: 35, discount: 0 },
        { name: 'Apples', description: 'Fresh red apples, ₹80/kg', price_per_kg: 80, discount: 5 },
        { name: 'Oranges', description: 'Juicy oranges, ₹50/kg', price_per_kg: 50, discount: 0 },
        { name: 'Grapes', description: 'Sweet green grapes, ₹100/kg', price_per_kg: 100, discount: 0 },
        { name: 'Mangoes', description: 'Fresh mangoes, ₹120/kg', price_per_kg: 120, discount: 10 },
        { name: 'Papaya', description: 'Fresh papaya, ₹45/kg', price_per_kg: 45, discount: 0 },
        
        // More Vegetables
        { name: 'Broccoli', description: 'Fresh broccoli, ₹65/kg', price_per_kg: 65, discount: 0 },
        { name: 'Cauliflower', description: 'Fresh cauliflower, ₹55/kg', price_per_kg: 55, discount: 5 },
        { name: 'Cucumber', description: 'Fresh cucumber, ₹25/kg', price_per_kg: 25, discount: 0 },
        { name: 'Garlic', description: 'Fresh garlic, ₹90/kg', price_per_kg: 90, discount: 0 },
      ];

      for (const product of sampleProducts) {
        await pool.query(
          `INSERT INTO products (name, description, price_per_kg, discount, is_active, quantity_available, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          [product.name, product.description, product.price_per_kg, product.discount, true, 100],
        );
      }
      console.log(`✅ Created ${sampleProducts.length} sample products (vegetables & fruits)`);
    } catch (error) {
      console.error('❌ Sample products creation failed:', error.message);
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
