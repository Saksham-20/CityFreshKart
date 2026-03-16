# Database Migration Guide - Weight-Based Pricing (MVP)

## Overview
This migration updates the database schema to support weight-based pricing for fruits and vegetables in the MVP version of CityFreshKart.

## Changes Made

### New Columns Added to `products` Table
1. **price_per_kg** (DECIMAL 10,2): Price per kilogram for weight-based items
2. **discount** (DECIMAL 5,2): Discount percentage (0-100), defaults to 0

### Backward Compatibility
- Existing columns (`price`, `compare_price`, `cost_price`) are retained for backward compatibility
- Existing products can continue using the old `price` column
- New products should use `price_per_kg` and `discount` for weight-based pricing

## How to Apply the Migration

### Option 1: Fresh Installation (New Database)
If you're setting up the application for the first time, the updated `server/database/schema.sql` already includes these columns. Just run the normal setup:

```bash
cd server
npm run db:setup
npm run db:seed
```

### Option 2: Existing Database
If you already have a database running, apply the migration manually:

#### Using psql (PostgreSQL CLI)
```bash
# Replace the placeholders with your actual PostgreSQL credentials
psql -U postgres -h localhost -d cityfreshkart -f server/database/migrations/001_add_price_per_kg_and_discount.sql
```

#### Or using a SQL client (pgAdmin, DBeaver, etc.)
1. Open your PostgreSQL client
2. Connect to the `cityfreshkart` database
3. Open the file: `server/database/migrations/001_add_price_per_kg_and_discount.sql`
4. Execute the SQL script

## Verification

After applying the migration, verify the columns were added:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;
```

You should see the new columns:
- `price_per_kg` (numeric)
- `discount` (numeric with default 0)

## Frontend Integration

### ProductManager Admin Form
The admin panel's ProductManager component has been updated to:
- Accept `price_per_kg` instead of `price`
- Accept `discount` percentage (0-100)
- Accept `stock_quantity` for inventory

### Product Card
ProductCard component displays weight-based pricing with:
- Weight selector dropdown (0.5kg, 1kg, 1.5kg, 2kg)
- Real-time price calculation: `price_per_kg × weight × quantity - discount`

### Cart Logic
CartContext implements delivery fee calculation:
- FREE delivery above ₹300
- ₹40 delivery fee below ₹300

## Database Schema Reference

```sql
-- Products table structure (key columns)
price_per_kg DECIMAL(10,2)    -- Price per kilogram
discount DECIMAL(5,2) DEFAULT 0  -- Discount percentage (0-100)
stock_quantity INTEGER DEFAULT 0  -- Available stock
```

## Troubleshooting

### Error: "column 'price_per_kg' does not exist"
- The migration hasn't been applied yet
- Run Option 2 above to apply the migration

### Error: "column already exists"
- The migration was already applied successfully
- This is safe to ignore if you're running the migration script again

### Products not showing in admin panel
- Clear browser cache
- Restart the backend server: `npm run dev`
- Verify the database migration was applied

## Rollback (If Needed)

To remove the new columns (not recommended for production):

```sql
ALTER TABLE products DROP COLUMN IF EXISTS price_per_kg;
ALTER TABLE products DROP COLUMN IF EXISTS discount;
```

## Support

If you encounter issues during migration:
1. Check PostgreSQL is running: `psql --version`
2. Verify database credentials in your `.env` file
3. Check database exists: `psql -U postgres -l | grep cityfreshkart`
4. Review logs in `server/utils/logger.js`

---
**Version**: 1.0  
**Date**: 2024  
**Target Version**: CityFreshKart MVP
