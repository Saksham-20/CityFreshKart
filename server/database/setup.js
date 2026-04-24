const fs = require('fs');
const path = require('path');
const { pool } = require('./config');
require('dotenv').config();

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
        try {
          await pool.query(fs.readFileSync(migrationPath, 'utf8'));
          console.log(`✅ Migration applied: ${name}`);
        } catch (migrationError) {
          // Log migration error but continue setup (migrations should be idempotent)
          console.warn(`⚠️  Migration ${name} warning (may be idempotent): ${migrationError.message.split('\n')[0]}`);
          // Re-throw if it's a critical error (not a duplicate key or constraint violation from idempotent ops)
          if (migrationError.code && ['23505', '23503'].includes(migrationError.code)) {
            console.warn(`  → Treating as safe (duplicate key/constraint from idempotent operation), continuing...`);
          } else {
            throw migrationError;
          }
        }
      }
    }

    console.log('');
    console.log('🎉 Database setup completed successfully!');
    console.log('');
    console.log('📋 User accounts are managed manually via admin tooling/database scripts.');
    console.log('');
    console.log('ℹ️  All products must be created and managed via the admin dashboard.');


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
