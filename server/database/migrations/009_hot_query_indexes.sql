-- Supports public product listing: WHERE is_active = true ORDER BY created_at DESC
-- Validate with EXPLAIN (ANALYZE, BUFFERS) on slow queries before adding more indexes.
CREATE INDEX IF NOT EXISTS idx_products_active_created_at ON products (is_active, created_at DESC);
