const bcrypt = require('bcryptjs');
const { pool } = require('./config');

async function createAdmin() {
  const phone = '9123456789';
  const password = 'Admin@12345';
  const name = 'Admin';

  try {
    const existing = await pool.query('SELECT id, is_admin FROM users WHERE phone = $1', [phone]);

    if (existing.rows.length > 0) {
      const user = existing.rows[0];
      if (user.is_admin) {
        console.log('Admin user already exists. Phone:', phone, '/ Password:', password);
        return process.exit(0);
      }
      // Exists but not admin — promote
      await pool.query('UPDATE users SET is_admin = true WHERE phone = $1', [phone]);
      console.log('Existing user promoted to admin. Phone:', phone);
      return process.exit(0);
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (phone, password_hash, name, is_admin, created_at, updated_at)
       VALUES ($1, $2, $3, true, NOW(), NOW())
       RETURNING id, phone, name, is_admin`,
      [phone, hash, name]
    );

    console.log('Admin user created:', result.rows[0]);
    console.log('\nLogin credentials:');
    console.log('  Phone:    ', phone);
    console.log('  Password: ', password);
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err.message);
    process.exit(1);
  }
}

createAdmin();
