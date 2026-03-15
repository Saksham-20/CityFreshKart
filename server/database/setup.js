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

    // CHECK IF DATABASE ALREADY EXISTS TO PREVENT DATA LOSS
    let shouldCreateTables = false;
    try {
      const existingTables = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      `);

      if (existingTables.rows.length === 0) {
        console.log('🔄 Database appears to be empty, will create tables');
        shouldCreateTables = true;
      } else {
        console.log('✅ Database already initialized, skipping table creation');
        console.log('Found existing tables, preserving data');
        return; // Exit early to preserve existing data
      }
    } catch (checkError) {
      console.log('⚠️ Could not check existing tables, assuming fresh install');
      shouldCreateTables = true;
    }

    if (shouldCreateTables) {
      // Read and execute schema
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');

      try {
        // Execute the entire schema as one statement to handle complex SQL
        console.log('🔄 Creating database tables...');
        await pool.query(schema);
        console.log('✅ Database schema created successfully');
      } catch (error) {
        console.error('❌ Schema creation failed:', error.message);
        console.error('❌ Error code:', error.code);
        // Don't throw, continue with the rest
      }
    }

    // Create default admin user
    const bcrypt = require('bcryptjs');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@cityfreshkart.in';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    try {
      // Check if admin user already exists
      const existingAdmin = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND is_admin = $2',
        [adminEmail, true],
      );

      if (existingAdmin.rows.length === 0) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        await pool.query(
          `INSERT INTO users (email, password_hash, first_name, last_name, is_admin, is_verified, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          [adminEmail, hashedPassword, 'Admin', 'User', true, true],
        );
        console.log('✅ Default admin user created (admin@cityfreshkart.in / admin123)');
      } else {
        console.log('✅ Admin user already exists');
      }
    } catch (error) {
      console.error('❌ Admin user creation failed:', error.message);
      // Don't throw, continue with categories
    }

    // Create default categories
    try {
      const categories = [
        { name: 'Sabzi & Greens', slug: 'sabzi-greens', description: 'Fresh vegetables and leafy greens' },
        { name: 'Fruits', slug: 'fruits', description: 'Seasonal and exotic fruits' },
        { name: 'Root Vegetables', slug: 'root-vegetables', description: 'Potatoes, onions, carrots & more' },
        { name: 'Exotic & Herbs', slug: 'exotic-herbs', description: 'Fresh herbs and exotic vegetables' },
        { name: 'Daily Essentials', slug: 'daily-essentials', description: 'Atta, dal, rice & spices' },
      ];

      for (const category of categories) {
        const existingCategory = await pool.query(
          'SELECT id FROM categories WHERE name = $1',
          [category.name],
        );

        if (existingCategory.rows.length === 0) {
          await pool.query(
            'INSERT INTO categories (name, slug, description, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
            [category.name, category.slug, category.description],
          );
        }
      }
      console.log('✅ CityFreshKart vegetable categories created');
    } catch (error) {
      console.error('❌ Category creation failed:', error.message);
      // Don't throw, continue
    }

    console.log('🎉 Database setup completed successfully!');
    console.log('');
    console.log('📋 Admin Login Credentials:');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Update frontend API URL for your CityFreshKart deployment');
    console.log('2. Add Cloudinary credentials for image uploads');
    console.log('3. Test your deployment!');

    // Optionally run seed data
    if (process.env.RUN_SEED === 'true') {
      console.log('🌱 Running database seed...');
      try {
        const seedDatabase = require('./seed');
        await seedDatabase();
        console.log('✅ Database seeded with sample data');
      } catch (error) {
        console.log('⚠️ Seed failed, continuing without sample data:', error.message);
      }
    }

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
