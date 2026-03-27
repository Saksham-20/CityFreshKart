ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_uid VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_uid_unique ON users(google_uid) WHERE google_uid IS NOT NULL;

CREATE TABLE IF NOT EXISTS product_weight_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  weight_option DECIMAL(10,2) NOT NULL,
  price_override DECIMAL(10,2) NOT NULL CHECK (price_override >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, weight_option)
);

CREATE INDEX IF NOT EXISTS idx_product_weight_prices_product ON product_weight_prices(product_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'products_name_unique_ci') THEN
    IF EXISTS (
      SELECT LOWER(name)
      FROM products
      GROUP BY LOWER(name)
      HAVING COUNT(*) > 1
    ) THEN
      RAISE NOTICE 'Skipping products_name_unique_ci due to duplicate product names';
    ELSE
      CREATE UNIQUE INDEX products_name_unique_ci ON products (LOWER(name));
    END IF;
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_product_weight_prices_updated_at ON product_weight_prices;
CREATE TRIGGER update_product_weight_prices_updated_at
BEFORE UPDATE ON product_weight_prices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
