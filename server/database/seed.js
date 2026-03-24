require('dotenv').config();
const setupDatabase = require('./setup');

async function seedDatabase() {
  console.log('🌱 Running unified database setup + seed...');
  await setupDatabase();
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Database seed failed:', error);
      process.exit(1);
    });
}

module.exports = seedDatabase;
