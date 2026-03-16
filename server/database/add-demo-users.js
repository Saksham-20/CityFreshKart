const bcrypt = require('bcryptjs');
const pool = require('./config');

async function addDemoUsers() {
  try {
    console.log('Adding demo users...');

    // Demo Regular User
    const regularUserPhone = '9876543210';
    const regularUserPassword = 'User@12345';
    const regularUserSalt = await bcrypt.genSalt(12);
    const hashedRegularPassword = await bcrypt.hash(regularUserPassword, regularUserSalt);

    // Demo Admin User
    const adminUserPhone = '9123456789';
    const adminUserPassword = 'Admin@12345';
    const adminUserSalt = await bcrypt.genSalt(12);
    const hashedAdminPassword = await bcrypt.hash(adminUserPassword, adminUserSalt);

    // Check if users already exist
    const existingRegularUser = await pool.query(
      'SELECT id FROM users WHERE phone = $1',
      [regularUserPhone]
    );

    if (existingRegularUser.rows.length > 0) {
      console.log('❌ Regular user already exists with phone:', regularUserPhone);
    } else {
      // Insert regular user
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, phone, is_admin, is_verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING id, email, phone, is_admin`,
        [
          'user@cityfreshkart.com',
          hashedRegularPassword,
          'John',
          'Doe',
          regularUserPhone,
          false,
          true // Mark as verified
        ]
      );
      console.log('✅ Regular user created:', result.rows[0]);
    }

    // Check if admin user exists
    const existingAdminUser = await pool.query(
      'SELECT id FROM users WHERE phone = $1',
      [adminUserPhone]
    );

    if (existingAdminUser.rows.length > 0) {
      console.log('❌ Admin user already exists with phone:', adminUserPhone);
    } else {
      // Insert admin user
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, phone, is_admin, is_verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING id, email, phone, is_admin`,
        [
          'admin@cityfreshkart.com',
          hashedAdminPassword,
          'Admin',
          'User',
          adminUserPhone,
          true, // is_admin
          true // Mark as verified
        ]
      );
      console.log('✅ Admin user created:', result.rows[0]);
    }

    console.log('\n📱 Demo User Credentials:');
    console.log('═══════════════════════════════════════════');
    console.log('Regular User:');
    console.log('  Phone: ' + regularUserPhone);
    console.log('  Password: ' + regularUserPassword);
    console.log('─────────────────────────────────────────');
    console.log('Admin User:');
    console.log('  Phone: ' + adminUserPhone);
    console.log('  Password: ' + adminUserPassword);
    console.log('═══════════════════════════════════════════');

    process.exit(0);
  } catch (error) {
    console.error('Error adding demo users:', error);
    process.exit(1);
  }
}

addDemoUsers();
