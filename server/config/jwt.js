/**
 * Central JWT secret — never use a production fallback.
 */
function assertJwtSecretForProduction() {
  if (process.env.NODE_ENV === 'production' && !String(process.env.JWT_SECRET || '').trim()) {
    console.error('FATAL: JWT_SECRET must be set in production');
    process.exit(1);
  }
}

function getJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (s && String(s).trim()) return String(s).trim();
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET must be set in production');
    process.exit(1);
  }
  return 'dev-only-insecure-jwt-secret-not-for-production';
}

module.exports = {
  assertJwtSecretForProduction,
  getJwtSecret,
};
