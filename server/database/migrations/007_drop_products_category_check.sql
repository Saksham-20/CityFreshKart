-- Allow admin-defined product categories (store_settings.product_categories) to be stored
-- on products.category. Production may still have a legacy CHECK from an old allowlist.
-- Idempotent: safe to run on databases that never had the constraint.
-- Apply on production: psql $DATABASE_URL -f server/database/migrations/007_drop_products_category_check.sql

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;
