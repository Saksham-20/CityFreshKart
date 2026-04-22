const fs = require('fs');
const path = require('path');
const { pool } = require('./config');
require('dotenv').config();

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function setupDatabase() {
  console.log('🚀 Starting database setup...');

  console.log('🔍 DB config:', process.env.DATABASE_URL ? 'DATABASE_URL=***' : `host=${process.env.DB_HOST || 'localhost'} db=${process.env.DB_NAME || 'default'}`);
  console.log('NODE_ENV:', process.env.NODE_ENV);

  // Use the shared pool from config.js
  console.log('📡 Using shared database pool for connection');

  try {
    // Test the pool connection
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ Connected to PostgreSQL via shared pool');
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Compatibility fix: migrate legacy Prisma-era TEXT ids -> UUID
    // so raw SQL schema FKs (UUID) can be applied safely.
    try {
      const idTypes = await pool.query(`
        SELECT table_name, data_type
        FROM information_schema.columns
        WHERE column_name = 'id'
          AND table_name IN ('users', 'products')
      `);

      const usersIdType = idTypes.rows.find(r => r.table_name === 'users')?.data_type;
      const productsIdType = idTypes.rows.find(r => r.table_name === 'products')?.data_type;

      if ((usersIdType && usersIdType !== 'uuid') || (productsIdType && productsIdType !== 'uuid')) {
        console.log('🔄 Normalizing legacy id column types to UUID...');

        // Drop dependent tables so FK/type conversion can complete in one pass.
        // These tables are recreated by schema.sql immediately after.
        await pool.query(`
          DROP TABLE IF EXISTS cart CASCADE;
          DROP TABLE IF EXISTS cart_items CASCADE;
          DROP TABLE IF EXISTS order_items CASCADE;
          DROP TABLE IF EXISTS orders CASCADE;
          DROP TABLE IF EXISTS user_addresses CASCADE;
          DROP TABLE IF EXISTS push_subscriptions CASCADE;
          DROP TABLE IF EXISTS otp_sessions CASCADE;
          DROP TABLE IF EXISTS carts CASCADE;
          DROP TABLE IF EXISTS wishlist CASCADE;
          DROP TABLE IF EXISTS wishlists CASCADE;
          DROP TABLE IF EXISTS wishlist_items CASCADE;
        `);

        if (usersIdType && usersIdType !== 'uuid') {
          await pool.query(`
            ALTER TABLE users
            ALTER COLUMN id TYPE UUID
            USING (
              CASE
                WHEN id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
                THEN id::uuid
                ELSE uuid_generate_v4()
              END
            )
          `);
          console.log('✅ users.id normalized to UUID');
        }

        if (productsIdType && productsIdType !== 'uuid') {
          await pool.query(`
            ALTER TABLE products
            ALTER COLUMN id TYPE UUID
            USING (
              CASE
                WHEN id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
                THEN id::uuid
                ELSE uuid_generate_v4()
              END
            )
          `);
          console.log('✅ products.id normalized to UUID');
        }

        // Ensure UUID defaults exist after legacy conversion
        await pool.query(`
          ALTER TABLE users ALTER COLUMN id SET DEFAULT uuid_generate_v4();
          ALTER TABLE products ALTER COLUMN id SET DEFAULT uuid_generate_v4();
        `);
      }
    } catch (compatError) {
      console.error('❌ Legacy schema compatibility step failed:', compatError.message);
      throw compatError;
    }

    // Apply schema (CREATE TABLE IF NOT EXISTS — safe to run on every boot)
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    try {
      console.log('🔄 Ensuring database tables exist...');
      await pool.query(schema);
      await pool.query(`
        ALTER TABLE users ALTER COLUMN id SET DEFAULT uuid_generate_v4();
        ALTER TABLE products ALTER COLUMN id SET DEFAULT uuid_generate_v4();
      `);
      console.log('✅ Database schema ready');
    } catch (error) {
      console.error('❌ Schema creation failed:', error.message);
      throw error;
    }

    const migrationFiles = [
      '005_weight_display_unit.sql',
      '006_google_and_weight_overrides.sql',
      '007_drop_products_category_check.sql',
      '008_idempotency_and_payment_dedup.sql',
      '009_hot_query_indexes.sql',
      '010_add_orders_user_cascade_delete.sql',
      '011_add_order_rejection_metadata.sql',
      '012_add_password_reset_otps.sql',
      '013_harden_password_reset_and_sessions.sql',
      '014_clear_google_user_phones.sql',
    ];
    for (const name of migrationFiles) {
      const migrationPath = path.join(__dirname, 'migrations', name);
      if (fs.existsSync(migrationPath)) {
        await pool.query(fs.readFileSync(migrationPath, 'utf8'));
        console.log(`✅ Migration applied: ${name}`);
      }
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
        console.log('✅ Admin user created (phone ending …' + String(adminPhone).slice(-4) + '). Set ADMIN_PASSWORD in env for production.');
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
        console.log('✅ Test user created for Playwright (phone …' + String(testPhone).slice(-4) + '). Use TEST_PASSWORD from env in CI if set.');
      } else {
        console.log('ℹ️  Test user already exists, skipping');
      }
    } catch (error) {
      console.error('❌ User creation failed:', error.message);
      throw error;
    }

    // Demo catalog: dev / staging only — production uses admin-created products only
    const seedSamples = process.env.NODE_ENV !== 'production';
    if (seedSamples) {
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
        const slug = slugify(product.name);
        // Match by canonical slug OR seed name so we never INSERT when slug already exists
        // (e.g. admin renamed "Onions" — slug still onions → duplicate slug without this).
        const existing = await pool.query(
          `SELECT id FROM products
           WHERE slug = $1 OR LOWER(TRIM(name)) = LOWER(TRIM($2))
           ORDER BY CASE WHEN slug = $1 THEN 0 ELSE 1 END
           LIMIT 1`,
          [slug, product.name],
        );
        if (existing.rows.length > 0) {
          await pool.query(
            `UPDATE products
             SET image_url = $1,
                 image = COALESCE(image, $2),
                 category = $3,
                 slug = COALESCE(NULLIF(TRIM(slug), ''), $4),
                 updated_at = NOW()
             WHERE id = $5`,
            [product.image_url, product.image_url, product.category, slug, existing.rows[0].id],
          );
          updated++;
        } else {
          await pool.query(
            `INSERT INTO products (name, slug, category, description, price_per_kg, discount, image, image_url, is_active, quantity_available, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
            [product.name, slug, product.category, product.description, product.price_per_kg, product.discount, product.image_url, product.image_url, true, 100],
          );
          inserted++;
        }
      }
      console.log(`✅ Products synced — ${inserted} inserted, ${updated} updated with images & categories`);

      // Seed representative custom weight tiers for per-kg products
      const tierSeed = {
        Tomatoes: { '0.50': 22, '0.75': 31, '1.00': 40 },
        Onions: { '0.50': 16, '1.00': 30, '2.00': 58 },
        Potatoes: { '0.50': 14, '1.00': 24, '2.00': 46 },
        Mangoes: { '0.50': 70, '1.00': 120, '1.50': 172 },
      };
      const names = Object.keys(tierSeed);
      const productLookup = await pool.query(
        'SELECT id, name FROM products WHERE name = ANY($1::text[])',
        [names],
      );
      for (const p of productLookup.rows) {
        const rows = tierSeed[p.name] || {};
        await pool.query('DELETE FROM product_weight_prices WHERE product_id = $1', [p.id]);
        for (const [weightStr, price] of Object.entries(rows)) {
          await pool.query(
            `INSERT INTO product_weight_prices (product_id, weight_option, price_override)
             VALUES ($1, $2, $3)
             ON CONFLICT (product_id, weight_option)
             DO UPDATE SET price_override = EXCLUDED.price_override, updated_at = CURRENT_TIMESTAMP`,
            [p.id, parseFloat(weightStr), price],
          );
        }
      }
      console.log('✅ Seeded product weight tiers for sample products');
      } catch (error) {
        console.error('❌ Sample products sync failed:', error.message);
        throw error;
      }
    } else {
      console.log('ℹ️  Skipping sample products (NODE_ENV=production)');
    }

    console.log('');
    console.log('🎉 Database setup completed successfully!');
    console.log('');
    console.log('📋 Configure ADMIN_PHONE / ADMIN_PASSWORD (and test user) via environment — credentials are not printed.');
    if (seedSamples) {
      console.log('');
      console.log('🛍️ Sample Data Available:');
      console.log('- 16 Fresh Vegetables & Fruits');
      console.log('- Weight-based pricing (₹/kg)');
      console.log('- Discounts on select items');
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
