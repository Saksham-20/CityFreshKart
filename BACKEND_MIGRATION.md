# Backend Prisma Migration Guide

## 🚨 Current Status

Your backend upgrade is **50% complete**:
- ✅ Prisma schema defined (`server/prisma/schema.prisma`)
- ✅ Dependencies installed in `server/package.json`
- ❌ **Controllers NOT migrated** - Still using raw SQL queries
- ❌ **Database setup script NOT migrated** - Using old pg.Pool approach

## 🎯 Migration Strategy

### Option A: Complete Prisma Migration (Recommended) ⭐
**For production-quality code with type safety**

This approach fully replaces pg.Pool with Prisma ORM across all controllers.

**Duration:** 2-4 hours
**Complexity:** Medium
**Benefits:** Type-safe queries, better error handling, automatic migrations

### Option B: Hybrid Approach (Faster) ⚡
**For immediate functionality**

Keep existing pg.Pool setup working while preparing Prisma adoption gradually.

**Duration:** 30 minutes
**Complexity:** Low
**Benefits:** No breaking changes, works immediately

**I recommend Option B first** - Get the server running, then migrate controllers to Prisma one at a time.

---

## 📋 Immediate Next Steps (All Options)

### 1. Update Environment Variables ✅ **DONE**
Your `.env` now has:
```bash
DATABASE_URL="postgresql://postgres:root@localhost:5432/lux_ecom"
```

Prisma will use this connection string. ✅ Completed.

---

### 2. Install Dependencies

```bash
cd /Users/sakshampanjla/Desktop/REACT/CityFreshKart

# Install backend dependencies
npm install

# Install Prisma CLI globally (optional but recommended)
npm install -g @prisma/cli
```

---

### 3. Initialize Prisma (Create migration)

```bash
cd server

# IMPORTANT: This will create migration files but NOT run them yet
npx prisma migrate dev --name init

# When prompted: "Already detected some .sql files...  Do you want to import it?"
# Answer: YES - to import your current schema.sql

# Give it a name: "init"
```

**What this does:**
- Reads your current PostgreSQL schema from `.sql` file
- Creates a Prisma migration in `server/prisma/migrations/`
- Updates Prisma client types

**Note:** Your current database structure will be preserved

---

## 🛣️ Option A: Full Prisma Migration

### Step 1: Migrate Database Setup
Replace `server/database/setup.js` or create `server/database/prisma-setup.js`:

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupDatabase() {
  console.log('🚀 Setting up database with Prisma...');

  try {
    // Test connection
    await prisma.$queryRaw`SELECT NOW()`;
    console.log('✅ Connected to PostgreSQL via Prisma');

    // Create default admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@cityfreshkart.in';
    
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        email: adminEmail,
        passwordHash: await require('bcryptjs').hash(process.env.ADMIN_PASSWORD || 'admin123', 10),
        firstName: 'Admin',
        lastName: 'User',
        isAdmin: true,
        isVerified: true,
      },
    });
    console.log('✅ Admin user created/verified');

    // Create default categories
    const categories = ['Sabzi & Greens', 'Fruits', 'Root Vegetables'];
    for (const cat of categories) {
      await prisma.category.upsert({
        where: { slug: cat.toLowerCase().replace(/ /g, '-') },
        update: {},
        create: {
          name: cat,
          slug: cat.toLowerCase().replace(/ /g, '-'),
        },
      });
    }
    console.log('✅ Default categories created');

    return true;
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    throw error;
  }
}

module.exports = setupDatabase;
```

### Step 2: Create Prisma Database Service Layer
Create `server/services/database.js`:

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Global instance to avoid instantiating too many clients
global.prisma = global.prisma || prisma;

module.exports = global.prisma;
```

### Step 3: Update Routes to Use Prisma
Example migration for `server/routes/products.js`:

**BEFORE (raw SQL):**
```javascript
const { query } = require('../database/config');

router.get('/', async (req, res) => {
  const result = await query(
    'SELECT * FROM products WHERE is_active = true',
    []
  );
  res.json(result.rows);
});
```

**AFTER (Prisma):**
```javascript
const prisma = require('../services/database');

router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(products);
  } catch (error) {
    console.error('Product fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});
```

### Step 4: Update Controllers
Apply same pattern to:
- `server/controllers/authController.js` - User queries
- `server/controllers/productController.js` - Product CRUD
- `server/controllers/orderController.js` - Order CRUD
- `server/controllers/cartController.js` - Cart operations
- `server/controllers/userController.js` - User operations

---

## ⚡ Option B: Hybrid Approach (Get it running now)

**Skip full Prisma migration for now.** Keep existing setup and gradually migrate.

Just ensure:

1. **DATABASE_URL is set** ✅ (Already done)
2. **Initialize Prisma schema** (Run these commands):

```bash
cd server
npx prisma migrate dev --name init
```

3. **Update `server/index.js`** to handle both setups gracefully:

```javascript
// Add this near the top after imports
const setupDatabase = require('./database/setup');

async function startServer() {
  try {
    // Initialize database (old method still works)
    await setupDatabase();
    
    // Start Express server normally
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
```

4. **Update package.json scripts** to match Prisma:

```json
{
  "scripts": {
    "dev": "nodemon index.js",
    "start": "node index.js",
    "db:migrate": "prisma migrate dev",
    "db:reset": "prisma migrate reset",
    "db:seed": "node ./database/seed.js",
    "db:studio": "prisma studio"
  }
}
```

---

## ✅ Validation Checklist

After migration, verify everything works:

```bash
# 1. Test database connection
npm run db:studio  # Opens Prisma Studio in browser - see all data

# 2. Start backend server
npm run dev  # Should start without errors

# 3. Test key endpoints with curl or Postman
curl http://localhost:5000/health
curl http://localhost:5000/api/products

# 4. Check admin user created
# Visit http://localhost:5000/api/auth/test
```

---

## 🔧 Common Issues & Solutions

### Issue: "DATABASE_URL is not set"
**Solution:** Add to `.env`:
```bash
DATABASE_URL="postgresql://postgres:root@localhost:5432/lux_ecom"
```

### Issue: "Prisma Client not initialized"
**Solution:** Ensure `services/database.js` is created and imported in routes:
```javascript
const prisma = require('../services/database');
```

### Issue: Migration fails with "relation already exists"
**Solution:** The schema might already exist. Options:
```bash
# Option 1: Reset database (destructive!)
npx prisma migrate reset

# Option 2: Skip migration
npx prisma db push --skip-generate
```

### Issue: Old SQL field names vs Prisma camelCase
Prisma uses camelCase by default:
- `password_hash` → `passwordHash`
- `is_admin` → `isAdmin`
- `created_at` → `createdAt`

Map them in schema:
```prisma
model User {
  id String @id
  email String @unique
  passwordHash String @map("password_hash")
  isAdmin Boolean @default(false) @map("is_admin")
  createdAt DateTime @default(now()) @map("created_at")
  
  @@map("users")
}
```

---

## 📈 Migration Timeline

**Week 1:** Option B (Hybrid) - Get server running with existing setup ⚡
**Week 2-3:** Migrate controllers one-by-one to Prisma 🔄
**Week 4:** Clean up, remove old database/config.js ✨

---

## 📚 Resources

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Migration from pg library](https://www.prisma.io/docs/orm/more/comparisons/prisma-and-sql)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)

---

## 🚀 Next Steps

1. **Update `.env`** ✅ DONE
2. **Install dependencies**: `npm install` in root and `server/`
3. **Initialize Prisma**: `cd server && npx prisma migrate dev --name init`
4. **Choose migration strategy:** Option A (full) or Option B (hybrid)
5. **Test server startup**: `npm run dev`

Would you like help with any of these steps? 🎯
